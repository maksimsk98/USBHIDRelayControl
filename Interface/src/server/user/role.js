const express = require('express');

const { waitForResponse } = require('../services/resolver');

let queueManager;

/**
 * @typedef {Object} PermissionNode
 * @property {string} path
 * @property {string} title
 * @property {boolean} enabled
 * @property {PermissionNode[]} children
 */

/**
 * @typedef {Object} RoleData
 * @property {PermissionNode|null} permissions
 * @property {string} [operation]
 */

/**
 * @typedef {() => Channel} GetChannelPost
 */

/**
 * @typedef {Object} Logger
 * @property {function(string): void} info
 * @property {function(string): void} error
 */

/**
 * Manages role permissions with efficient O(1) lookups
 * Uses multiple indexing strategies for fast access:
 * - path -> enabled (main mapping)
 * - path -> id (indexing)
 * - id -> enabled (numeric access)
 */
class RolePermissionsManager {
  /**
   * Constructor for RolePermissionsManager
   * Initializes all mapping structures
   */
  constructor() {
    /**
     * Main mapping: path -> enabled
     * @type {Map<string, boolean>}
     * @private
     */
    this.permissionsMap = new Map();

    /**
     * Indexing: path -> id
     * @type {Map<string, number>}
     * @private
     */
    this.pathToIdMap = new Map();

    /**
     * Fast numeric access: id -> enabled
     * @type {Map<number, boolean>}
     * @private
     */
    this.idToEnableMap = new Map();

    /**
     * @type {number}
     * @private
     */
    this.nextPermissionId = 0;
  }

  /**
   * Initialize permission manager with permission tree
   * Builds all mappings: path->enabled, path->id, id->enabled
   * @param {PermissionNode|null} permissionTree Permission tree from backend or null
   * @returns {void}
   */
  initialize(permissionTree) {
    this.clear();

    if (!permissionTree) {
      return;
    }

    try {
      // Build all mappings from the tree
      this.buildMappingsRecursive(permissionTree);
    } catch (error) {
      // If tree structure is invalid, clear everything
      this.clear();
      console.error('Failed to initialize permission manager:', error);
    }
  }

  /**
   * O(n) traversal, where `n` is the number of nodes in the tree
   * @param {PermissionNode} node
   * @returns {void}
   * @private
   */
  buildMappingsRecursive(node) {
    const { path, enabled } = node;

    this.permissionsMap.set(path, enabled);

    if (!this.pathToIdMap.has(path)) {
      const id = this.nextPermissionId;

      // Да, я помню про постфиксный инкремент и что eslint этого не любит
      this.nextPermissionId += 1;
      this.pathToIdMap.set(path, id);
      this.idToEnableMap.set(id, enabled);
    }

    node.children.forEach((child) => {
      this.buildMappingsRecursive(child);
    });
  }

  /**
   * Check if permission manager is initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this.permissionsMap.size > 0;
  }

  /**
   * Check if user has access to the given permission path
   * @param {string} path Permission path (e.g., "main_wnd.analysis.start_measuring")
   * @returns {boolean} true if user has access, false if not or path not found
   */
  hasAccess(path) {
    if (!path || path.trim() === '') {
      return false;
    }
    const enabled = this.permissionsMap.get(path);
    if (enabled === undefined) {
      return false;
    }
    return enabled;
  }

  /**
   * O(1) lookup
   * @param {string} path
   * @returns {number|undefined}
   */
  getPermissionId(path) {
    return this.pathToIdMap.get(path);
  }

  /**
   * O(1) lookup
   * @param {number} id
   * @returns {boolean}
   */
  hasAccessById(id) {
    if (id < 0 || !Number.isInteger(id)) {
      return false;
    }
    const enabled = this.idToEnableMap.get(id);
    if (enabled === undefined) {
      return false;
    }
    return enabled;
  }

  /**
   * Get all permissions as a record
   * @returns {Record<string, boolean>}
   */
  getAllPermissions() {
    /** @type {Record<string, boolean>} */
    const result = {};
    this.permissionsMap.forEach((enabled, path) => {
      result[path] = enabled;
    });
    return result;
  }

  /**
   * Get id to enabled mapping as a record
   * @returns {Record<number, boolean>}
   */
  getIdToEnabledMap() {
    /** @type {Record<number, boolean>} */
    const result = {};
    this.idToEnableMap.forEach((enabled, id) => {
      result[id] = enabled;
    });
    return result;
  }

  /**
   * Get path to id mapping as a record
   * @returns {Record<string, number>}
   */
  getPathToIdMap() {
    /** @type {Record<string, number>} */
    const result = {};
    this.pathToIdMap.forEach((id, path) => {
      result[path] = id;
    });
    return result;
  }

  /**
   * Clear all mappings
   * @returns {void}
   * @private
   */
  clear() {
    this.permissionsMap.clear();
    this.pathToIdMap.clear();
    this.idToEnableMap.clear();
    this.nextPermissionId = 0;
  }
}

const permissionManager = new RolePermissionsManager();

/**
 * Check if user has permission for the given path
 * @param {string} path Permission path
 * @returns {boolean}
 */
const hasPermission = (path) => {
  if (!permissionManager.isInitialized()) {
    return false;
  }
  return permissionManager.hasAccess(path);
};

/**
 * Get permission ID for the given path
 * @param {string} path Permission path
 * @returns {number|undefined}
 */
const getPermissionId = (path) => permissionManager.getPermissionId(path);

/**
 * Check if user has permission by ID
 * @param {number} id Permission ID
 * @returns {boolean}
 */
const hasPermissionById = (id) => {
  if (!permissionManager.isInitialized()) {
    return false;
  }
  return permissionManager.hasAccessById(id);
};

/**
 * Check if permissions are initialized
 * @returns {boolean}
 */
const isPermissionsInitialized = () => permissionManager.isInitialized();

const OPERATION = 'getRoleCFR';
const POLLING_ID = 'utilPollingId';
const ENVIRONMENT = process.env.NODE_ENV || 'production';

/** @type {RoleData} */
const MOCK_ROLE = {
  permissions: {
    path: 'root',
    title: 'Root',
    enabled: true,
    children: [],
  },
};

/** @type {Channel|null} */
let channelPost = null;

/** @type {Logger|null} */
let logger = null;

/**
 * Get current role data
 * @returns {Promise<RoleData>}
 */
const getCurrentRole = async (queueReqv) => {
  /** @type {RoleData} */
  let roleData;

  if (ENVIRONMENT === 'development') {
    roleData = MOCK_ROLE;
  } else {
    if (!channelPost || !logger) {
      throw new Error('Role module not initialized');
    }

    roleData = /** @type {RoleData} */ (
      await waitForResponse(
        queueReqv,
        OPERATION,
        logger,
        null,
        { id: POLLING_ID },
      )
    );
  }

  // Initialize permission manager with received data
  // This builds all mappings (path->enabled, path->id, id->enabled)
  permissionManager.initialize(roleData.permissions);

  return roleData;
};

const router = express.Router();

/**
 * GET /role/current endpoint
 * @param {express.Request} req
 * @param {express.Response} res
 * @returns {Promise<void>}
 */
router.get('/current', async (req, res) => {
  if (!channelPost || !logger) {
    res.status(500).json({ error: 'Role module not initialized' });
    return;
  }

  const { sessionId } = req.query;

  let queueSet, queueReqv;
  try {
    const queues = queueManager.getQueues(sessionId, 'main');
    if (!queues || queues.length === 0) {
      return res.status(404).json({ error: 'No queues found for session' });
    }
    [queueSet, queueReqv] = queues;
  } catch (error) {
    logger.error(`Error fetching queues for session ${sessionId}: ${error.message}`);
    return res.status(440).json({ error: 'Failed to get queues for session' });
  }

  const message = { operation: OPERATION };

  try {
    channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));
    logger.info(
      `Sending message to queue ${queueSet} activated by GET /role/current: ${JSON.stringify(message)}`,
    );

    const roleData = await getCurrentRole(queueReqv);
    res.json(roleData);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(
      `Failed to get current role activated by GET /role/current: ${errorMessage}`,
    );
    res.status(500).json({ error: 'Failed to get current role' });
  }
});

/**
 * Initialize role module
 * @param {GetChannelPost} getChannelPost Function that returns Channel
 * @param {Logger} loggerInstance Logger instance
 * @returns {Promise<express.Router>}
 */
const mainExport = async (getChannelPost, loggerInstance, queueManagerInstance) => {
  queueManager = queueManagerInstance
  channelPost = getChannelPost();
  logger = loggerInstance;
  return router;
};

// Export helper functions for external use
mainExport.hasPermission = hasPermission;
mainExport.getPermissionId = getPermissionId;
mainExport.hasPermissionById = hasPermissionById;
mainExport.isPermissionsInitialized = isPermissionsInitialized;

module.exports = mainExport;


/**
 * Example of backend response for GET /api/role/current:
 *
 * {
 *   "operation": "getRoleCFR",
 *   "permissions": {
 *     "path": "root",
 *     "title": "Root",
 *     "enabled": true,
 *     "children": [
 *       {
 *         "path": "group_management",
 *         "title": "Group management",
 *         "enabled": true,
 *         "children": []
 *       },
 *       {
 *         "path": "main_wnd",
 *         "title": "Main window",
 *         "enabled": true,
 *         "children": [
 *           {
 *             "path": "main_wnd.analysis",
 *             "title": "Analysis",
 *             "enabled": true,
 *             "children": [
 *               {
 *                 "path": "main_wnd.analysis.goto_measurements",
 *                 "title": "Go to measurements",
 *                 "enabled": true,
 *                 "children": []
 *               },
 *               {
 *                 "path": "main_wnd.analysis.identification_sample",
 *                 "title": "Identification or quality control of the sample",
 *                 "enabled": true,
 *                 "children": []
 *               },
 *               {
 *                 "path": "main_wnd.analysis.spectrum",
 *                 "title": "Analysis of the saved spectrum",
 *                 "enabled": true,
 *                 "children": []
 *               },
 *               {
 *                 "path": "main_wnd.analysis.start_measuring",
 *                 "title": "Start measuring",
 *                 "enabled": true,
 *                 "children": []
 *               },
 *               {
 *                 "path": "main_wnd.analysis.unknown_sample",
 *                 "title": "Analysis of an unknown sample",
 *                 "enabled": true,
 *                 "children": []
 *               }
 *             ]
 *           },
 *           {
 *             "path": "main_wnd.calibration",
 *             "title": "Calibration",
 *             "enabled": true,
 *             "children": [
 *               {
 *                 "path": "main_wnd.calibration.create",
 *                 "title": "Create calibration",
 *                 "enabled": true,
 *                 "children": []
 *               },
 *               {
 *                 "path": "main_wnd.calibration.modify",
 *                 "title": "Modify calibration",
 *                 "enabled": true,
 *                 "children": []
 *               }
 *             ]
 *           }
 *         ]
 *       }
 *     ]
 *   }
 * }
 *
 * Note: The "enabled" field indicates whether the current user has permission
 * to access this specific permission node. The "title" field contains the
 * localized name (in Russian if locale is ru_RU, in English otherwise).
 * The "path" field is the unique identifier for the permission entry point.
 */
