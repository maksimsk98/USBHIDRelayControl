const express = require('express');

const { waitForResponse } = require('../services/resolver');
const { resolveSessionQueues } = require('../services/sessionQueuesHelpers');

let queueManager;

/**
 * @typedef {Object} UserData
 * @property {string} username
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


const ENVIRONMENT = process.env.NODE_ENV || 'production';

/** @type {UserData} */
const MOCK_USER = { username: 'Test User' };

/** @type {import('amqplib').Channel|null} */
let channelPost = null;

/** @type {Logger|null} */
let logger = null;

/**
 * Get current user data
 * @returns {Promise<UserData>}
 */
const getCurrentUser = async (OPERATION, queueReqv) => {
  if (ENVIRONMENT === 'development') {
    return MOCK_USER;
  }

  if (!channelPost || !logger) {
    throw new Error('User module not initialized');
  }

  return /** @type {UserData} */ (waitForResponse(
    queueReqv,
    OPERATION,
    logger,
    null,
    { id: 'utilPollingId' },
  ));
};

const router = express.Router();

/**
 * GET /user/current endpoint
 * @param {express.Request} req
 * @param {express.Response} res
 * @returns {Promise<void>}
 */
router.get('/current', async (req, res) => {
  if (!channelPost || !logger) {
    res.status(500).json({ error: 'User module not initialized' });
    return;
  }

  const OPERATION = 'getCurrentUserCFR';
  const message = { operation: OPERATION };

  try {
    const { sessionId, queueSet, queueReqv } = resolveSessionQueues(req, queueManager, 'main', logger);

    channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));
    logger.info(
      `Sending message to queue ${queueSet} activated by GET /user/current: `
      + `${JSON.stringify(message)}`,
    );

    const userData = await getCurrentUser(OPERATION, queueReqv);
    res.json(userData);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(
      `Failed to get current user activated by GET /user/current: ${errorMessage}`,
    );
    res.status(500).json({ error: 'Failed to get current user' });
  }
});

/**
 * Initialize user module
 * @param {GetChannelPost} getChannelPost Function that returns Channel
 * @param {Logger} loggerInstance Logger instance
 * @returns {Promise<express.Router>}
 */
module.exports = async (getChannelPost, loggerInstance, queueManagerInstance) => {
  channelPost = getChannelPost();
  logger = loggerInstance;
  queueManager = queueManagerInstance
  return router;
};

// ALEX: Моки см. в mockUser.js
/**
 * Example of backend response for GET /api/user/current:
 *
 * {
 *   "operation": "getCurrentUserCFR",
 *   "username": "Иванов Иван Иванович"
 *   // русские символы обрабатываются корректно, т.к. на стороне CFR посылается в UTF-8
 * }
 *
 * If user is not found or not initialized:
 * {
 *   "operation": "getCurrentUserCFR",
 *   "username": null
 * }
 *
 * Note: The "username" field contains the full name of the currently logged-in user
 * from the CFR (LumGuard) security module.
 */
