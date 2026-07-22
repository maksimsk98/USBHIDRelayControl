const express = require('express');
const crypto = require('crypto');
const _ = require('lodash');

const router = express.Router();

const { NODE_STATUSES, THERMOSTAT } = require('../services/constants');
const { createChannel } = require('../services/connectRabbitMQ');
const { validateAndSetStatus, validateArrayPointWithFallback } = require('../services/utils');

let queueManager;
let thermostatChannelGet;
let channelPost;
let logger;
const environment = process.env.NODE_ENV || 'production';

// ---------- Default thermostat state ----------
const defaultThermostatData = {
  status: environment === 'development' ? NODE_STATUSES.CONNECTED : null,
  columnTemp: { x: [], y: [] },
  roomTemp: { x: [], y: [] },
};

// ---------- Session storage ----------
const sessions = new Map(); // key: sessionId, value: sessionData object

/**
 * Creates or retrieves session data for a given sessionId.
 * Each session contains:
 *   - thermostatData           : current state (mutable)
 *   - pendingThermostatRequests: Set of correlationIds awaiting response
 *   - idleTimeout              : NodeJS.Timeout handle
 *   - isListeningStarted       : boolean, true if consumer already set up
 *   - consumerTag              : RabbitMQ consumer tag (for potential cancellation)
 *   - queueReqv                : queue name for consuming thermostat messages
 *   - queueSet                 : queue name for sending commands (optional, stored for convenience)
 */
function getOrCreateSessionData(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      thermostatData: _.cloneDeep(defaultThermostatData),
      pendingThermostatRequests: new Set(),
      idleTimeout: null,
      isListeningStarted: false,
      consumerTag: null,
      queueReqv: null,
      queueSet: null,
    });
  }
  return sessions.get(sessionId);
}

// ---------- Helper functions (operate on sessionData) ----------

/**
 * Reset the session's thermostat data to defaults, optionally preserving the status.
 */
function clearStoredData(sessionData, keepStatus = true) {
  const lastStatus = sessionData.thermostatData.status;
  sessionData.thermostatData = {
    status: keepStatus ? lastStatus : (environment === 'development' ? NODE_STATUSES.CONNECTED : null),
    columnTemp: { x: [], y: [] },
    roomTemp: { x: [], y: [] },
  };
}

/**
 * Set or reset the idle timer for a session.
 * After timeout the session's status becomes NOT_RESPONSIVE.
 */
function setIdleTimer(sessionId, timeoutMs) {
  const sessionData = sessions.get(sessionId);
  if (!sessionData) return;

  clearTimeout(sessionData.idleTimeout);
  if (environment === 'development') return; // no timer in dev

  sessionData.idleTimeout = setTimeout(() => {
    const data = sessions.get(sessionId);
    if (data) {
      data.thermostatData.status = NODE_STATUSES.NOT_RESPONSIVE;
      logger.info(`[session ${sessionId}] Idle timeout reached. Status reset to ${NODE_STATUSES.NOT_RESPONSIVE}.`);
      if (data.pendingThermostatRequests.size > 0) {
        logger.warn(
          `[session ${sessionId}] Pending thermostat requests after idle timeout: ${Array.from(data.pendingThermostatRequests).join(', ')}`
        );
      }
    }
  }, timeoutMs);
}

/**
 * Start consuming thermostat messages for a given session.
 * Ensures only one consumer per session/queue.
 */
async function startListeningThermostat(sessionId, queueReqv) {
  const sessionData = sessions.get(sessionId);
  if (!sessionData) {
    logger.error(`[session ${sessionId}] Cannot start listener – session data missing`);
    return;
  }

  if (sessionData.isListeningStarted) {
    logger.debug(`[session ${sessionId}] Consumer already running for queue ${queueReqv}`);
    return;
  }

  // Reset stored data to default (keep status)
  clearStoredData(sessionData, true);
  setIdleTimer(sessionId, 7000);

  try {
    const ok = await thermostatChannelGet.consume(
      queueReqv,
      (msg) => {
        if (!msg) {
          logger.warn(`Received bad detector ${msg} message from queue ${queueReqv}`);
          return;
        }
        processThermostatMessage(sessionId, msg.content.toString(), queueReqv);
        thermostatChannelGet.ack(msg);
      },
      { consumerTag: `thermostat-${sessionId}` } // optional fixed consumer tag
    );

    sessionData.isListeningStarted = true;
    sessionData.consumerTag = ok.consumerTag;
    sessionData.queueReqv = queueReqv;
    logger.info(`[session ${sessionId}] Started consumer on queue ${queueReqv}, tag ${ok.consumerTag}`);
  } catch (err) {
    logger.error(`[session ${sessionId}] Failed to start consumer: ${err.message}`);
  }
}

/**
 * Process an incoming thermostat message for a specific session.
 */
function processThermostatMessage(sessionId, message, queueReqv) {
  const sessionData = sessions.get(sessionId);
  if (!sessionData) {
    logger.error(`[session ${sessionId}] Received message but session data not found`);
    return;
  }

  try {
    // Clear any existing idle timer – we are about to set a new one
    clearTimeout(sessionData.idleTimeout);

    const jsonData = JSON.parse(message);
    const { thermostatData, pendingThermostatRequests } = sessionData;

    // ----- correlationId cleanup -----
    if (jsonData?.correlationId) {
      if (pendingThermostatRequests.has(jsonData.correlationId)) {
        pendingThermostatRequests.delete(jsonData.correlationId);
        logger.info(`[session ${sessionId}] Resolved thermostat request: ${jsonData.correlationId}`);
      }
    } else {
      // optionally log missing correlationId
      // logger.warn(`[session ${sessionId}] Thermostat response missing correlationId`);
    }

    // ----- extract fields -----
    const { status: newStatus, columnTemp, roomTemp } = jsonData;

    // ----- status update -----
    validateAndSetStatus(thermostatData, 'status', newStatus, logger);

    // ----- temperature arrays -----
    if (columnTemp) {
      validateArrayPointWithFallback(thermostatData.columnTemp.x, columnTemp.x, 'columnX', logger);
      validateArrayPointWithFallback(thermostatData.columnTemp.y, columnTemp.y, 'columnY', logger);
    }
    if (roomTemp) {
      validateArrayPointWithFallback(thermostatData.roomTemp.x, roomTemp.x, 'roomX', logger);
      validateArrayPointWithFallback(thermostatData.roomTemp.y, roomTemp.y, 'roomY', logger);
    }

    logger.info(`[session ${sessionId}] Consumed message from ${queueReqv}: ${message}`);

    // ----- reset idle timer -----
    setIdleTimer(sessionId, 7000);
  } catch (error) {
    logger.error(`[session ${sessionId}] Error processing message: ${error.message}`);
  }
}

/**
 * Optional: clean up session resources (consumer, timer, remove from map)
 */
function cleanupSession(sessionId) {
  const sessionData = sessions.get(sessionId);
  if (!sessionData) return;

  clearTimeout(sessionData.idleTimeout);
  if (sessionData.consumerTag) {
    thermostatChannelGet
      .cancel(sessionData.consumerTag)
      .then(() => logger.info(`[session ${sessionId}] Consumer cancelled`))
      .catch((err) => logger.error(`[session ${sessionId}] Failed to cancel consumer: ${err.message}`));
  }
  sessions.delete(sessionId);
  logger.info(`[session ${sessionId}] Session cleaned up`);
}

router.get('/', (req, res) => {
  const { sessionId } = req.query;

  // 1. Resolve queues
  let queueSet, queueReqv;
  try {
    const queues = queueManager.getQueues(sessionId, THERMOSTAT);
    if (!queues || queues.length === 0) {
      return res.status(404).json({ error: 'No queues found for session' });
    }
    [queueSet, queueReqv] = queues;
  } catch (error) {
    logger.error(`[session ${sessionId}] Error fetching queues: ${error.message}`);
    return res.status(440).json({ error: 'Failed to get queues for session' });
  }

  // 2. Get or create session data
  const sessionData = getOrCreateSessionData(sessionId);
  sessionData.queueSet = queueSet;
  sessionData.queueReqv = queueReqv;

  // 3. Ensure consumer is running
  if (!sessionData.isListeningStarted) {
    startListeningThermostat(sessionId, queueReqv);
  }

  // 4. Prepare and send request for state
  const correlationId = crypto.randomUUID();
  sessionData.pendingThermostatRequests.add(correlationId);

  const message = { termostatState: 'get_state', correlationId };
  logger.info(`[session ${sessionId}] Sending to queue ${queueSet}: ${JSON.stringify(message)}`);
  channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));

  // 5. Send response (current session data)
  const dataToSend = { ...sessionData.thermostatData };
  const numPoints = {
    columnTemp: sessionData.thermostatData.columnTemp.y.length,
    roomTemp: sessionData.thermostatData.roomTemp.y.length,
  };

  res.json(dataToSend);

  // 6. Erase the sent points from memory (keep status)
  sessionData.thermostatData.columnTemp.x.splice(0, numPoints.columnTemp);
  sessionData.thermostatData.columnTemp.y.splice(0, numPoints.columnTemp);
  sessionData.thermostatData.roomTemp.x.splice(0, numPoints.roomTemp);
  sessionData.thermostatData.roomTemp.y.splice(0, numPoints.roomTemp);
});

/**
 * POST /thermostat
 * Send a command to turn the thermostat on/off with target temperature and dispersion.
 */
router.post('/', async (req, res) => {
  const { sessionId } = req.query;

  // Resolve queues (no session state needed)
  let queueSet, queueReqv;
  try {
    const queues = queueManager.getQueues(sessionId, THERMOSTAT);
    if (!queues || queues.length === 0) {
      return res.status(404).json({ error: 'No queues found for session' });
    }
    [queueSet, queueReqv] = queues;
  } catch (error) {
    logger.error(`[session ${sessionId}] Error fetching queues: ${error.message}`);
    return res.status(440).json({ error: 'Failed to get queues for session' });
  }

  const { isThermostatOn, targetTemp, dispersion } = req.body;
  const message = { isThermostatOn, targetTemp, dispersion };
  logger.info(`[session ${sessionId}] Sending to queue ${queueSet}: ${JSON.stringify(message)}`);

  await channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));
  res.status(200).json(`thermostat is on: ${isThermostatOn}, target ${targetTemp}, dispersion ${dispersion}`);
});

router.post('/setDefaults', async (req, res) => {
  const { sessionId } = req.query;

  let queueSet, queueReqv;
  try {
    const queues = queueManager.getQueues(sessionId, THERMOSTAT);
    if (!queues || queues.length === 0) {
      return res.status(404).json({ error: 'No queues found for session' });
    }
    [queueSet, queueReqv] = queues;
  } catch (error) {
    logger.error(`Error fetching queues for session ${sessionId}: ${error.message}`);
    return res.status(440).json({ error: 'Failed to get queues for session' });
  }

  const { dispersion, targetTemp } = req.body;

  const message = {
    operation: 'setThermostatSettings',
    targetTemp,
    dispersion,
  };
  const logMsg = `Sending to queue ${queueSet} from ${req.method} ${req.url}: ${JSON.stringify(message)}`;
  logger.info(logMsg);

  await channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));
  res.status(200).end();
});

module.exports = async (getChannelPost, loggerInstance, queueManagerInstance) => {
  thermostatChannelGet = await createChannel();
  channelPost = getChannelPost();
  logger = loggerInstance;
  queueManager = queueManagerInstance
  return router;
};
