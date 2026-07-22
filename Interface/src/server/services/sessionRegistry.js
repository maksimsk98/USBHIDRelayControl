/**
 * Session Registry Service
 *
 * Manages active session lifecycle and delegates queue creation/deletion to QueueManager.
 * Each session is registered logically; queues are fully managed by QueueManager.
 */

const { logger } = require('./logger');

class SessionRegistry {
  /**
   * @param {QueueManager} queueManager - instance of QueueManager to handle queue lifecycle
   */
  constructor(queueManager) {
    if (!queueManager) {
      throw new Error('SessionRegistry requires a QueueManager instance');
    }
    this.queueManager = queueManager;

    // Tracks registered session IDs
    this.m_Sessions = new Set();
  }

  normalizeSessionId(sessionId) {
    if (sessionId == null || typeof sessionId !== 'string') {
      throw new Error(`Invalid sessionId: ${sessionId}`);
    }

    return sessionId.startsWith('sess_')
      ? sessionId.slice('sess_'.length)
      : sessionId;
  }


  /**
   * Register a session and ensure all queues are initialized.
   * Idempotent.
   * @param {string} sessionId
   * @returns {Promise<boolean>}
   */
  async registerSession(sessionId) {
    let cleanSessionId;
    try {
      cleanSessionId = this.normalizeSessionId(sessionId);
    } catch (err) {
      logger.error(err.message);
      return false;
    }

    if (this.m_Sessions.has(cleanSessionId)) {
      logger.warn(`Session ${cleanSessionId} already registered`);
      return true;
    }

    try {
      // Delegate to QueueManager; initialize queues for all MODULE_BASES
      await this.queueManager.ensureModule(cleanSessionId, { initialize: true });

      this.m_Sessions.add(cleanSessionId);
      logger.warn(`Session ${cleanSessionId} registered`);
      return true;
    } catch (err) {
      logger.error(`Failed to register session ${cleanSessionId}: ${err.message}`);
      return false;
    }
  }

  /**
   * Unregister a session and delete all its queues.
   * Idempotent.
   * @param {string} sessionId
   * @returns {Promise<boolean>}
   */
  async unregisterSession(sessionId) {
    let cleanSessionId;
    try {
      cleanSessionId = this.normalizeSessionId(sessionId);
    } catch (err) {
      logger.error(err.message);
      return false;
    }

    if (!this.m_Sessions.has(cleanSessionId)) {
      logger.warn(`Session ${cleanSessionId} not registered`);
      return true;
    }

    try {
      // Delegate deletion to QueueManager
      await this.queueManager.deleteSessionQueues(cleanSessionId);

      this.m_Sessions.delete(cleanSessionId);
      logger.warn(`Session ${cleanSessionId} unregistered`);
      return true;
    } catch (err) {
      logger.error(`Failed to unregister session ${cleanSessionId}: ${err.message}`);
      return false;
    }
  }

  /**
   * Check if a session is registered
   * @param {string} sessionId
   * @returns {boolean}
   */
  isSessionRegistered(sessionId) {
    try {
      const cleanSessionId = this.normalizeSessionId(sessionId);
      return this.m_Sessions.has(cleanSessionId);
    } catch {
      return false;
    }
  }

  /**
   * Return all registered session IDs
   * @returns {string[]}
   */
  getRegisteredSessions() {
    return Array.from(this.m_Sessions);
  }

  /**
   * Get all queue names for a registered session.
   * @param {string} sessionId
   * @returns {string[]} array of queue names
   */
  getSessionQueues(sessionId) {
    let cleanSessionId;
    try {
      cleanSessionId = this.normalizeSessionId(sessionId);
    } catch (err) {
      logger.error(err.message);
      return [];
    }

    if (!this.m_Sessions.has(cleanSessionId)) {
      return [];
    }

    try {
      const module = this.queueManager.getModule(cleanSessionId);
      return module.getAllQueues();
    } catch (err) {
      logger.error(
        `Failed to get queues for session ${cleanSessionId}: ${err.message}`
      );
      return [];
    }
  }
}

// ------------------- Singleton -------------------
let sessionRegistryInstance = null;

/**
 * Get or create singleton SessionRegistry instance
 * @param {QueueManager} queueManager - required on first call
 */
function getSessionRegistry(queueManager) {
  if (!sessionRegistryInstance) {
    if (!queueManager) {
      throw new Error('QueueManager instance required to initialize SessionRegistry');
    }
    sessionRegistryInstance = new SessionRegistry(queueManager);
  }
  return sessionRegistryInstance;
}

module.exports = {
  SessionRegistry,
  getSessionRegistry,
};
