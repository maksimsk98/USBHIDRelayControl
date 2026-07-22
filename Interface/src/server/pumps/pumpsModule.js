const express = require('express');
const _ = require('lodash');
const crypto = require('crypto');

const router = express.Router();
const isocratRoutes = require('./isocrat');
const gradientRoutes = require('./gradient');

const { NODE_STATUSES } = require('../services/constants');
const { createChannel } = require('../services/connectRabbitMQ');
const {
  validateArrayPointWithFallback, validateNumericValue, validateAndSetStatus, validateAndSetPumpState,
} = require('../services/utils');

let queueManager;
let pumpsChannelGet;
let channelPost;
let logger;
let isListeningStarted = false;
const environment = process.env.NODE_ENV || 'production';
let idleTimeout;
const pendingPumpsRequests = new Set();

const initStatus = environment === 'development' ? NODE_STATUSES.CONNECTED : null;


// ---------- Default pump state (factory) ----------
const createDefaultPumpData = () => ({
  pumps: {
    A1: {
      flowRate: { x: [], y: [] },
      pressure: { x: [], y: [] },
      volume: { x: [], y: [] },
      volumeMax: 0,
      status: initStatus,
      state: null,
      stateQueue: [],
    },
    B1: {
      flowRate: { x: [], y: [] },
      pressure: { x: [], y: [] },
      volume: { x: [], y: [] },
      volumeMax: 0,
      status: initStatus,
      state: null,
      stateQueue: [],
    },
    A2: {
      flowRate: { x: [], y: [] },
      pressure: { x: [], y: [] },
      volume: { x: [], y: [] },
      volumeMax: 0,
      status: initStatus,
      state: null,
      stateQueue: [],
    },
    B2: {
      flowRate: { x: [], y: [] },
      pressure: { x: [], y: [] },
      volume: { x: [], y: [] },
      volumeMax: 0,
      status: initStatus,
      state: null,
      stateQueue: [],
    },
  },
  degasser: {
    state: null,
    stateQueue: [],
  },
  activeStepPumpProgram: null,
});

// ---------- Session storage ----------
const sessions = new Map(); // key: sessionId, value: sessionData object

/**
 * Creates or retrieves session data for a given sessionId.
 * Each session contains:
 *   - pumpData                 : current pumps state (mutable)
 *   - pendingPumpsRequests     : Set of correlationIds awaiting response
 *   - isListeningStarted       : boolean, true if consumer already set up
 *   - idleTimeout              : NodeJS.Timeout handle
 *   - consumerTag              : RabbitMQ consumer tag (for potential cancellation)
 *   - queueReqv                : queue name for consuming pumps messages
 *   - queueSet                 : queue name for sending commands (stored for convenience)
 */
function getOrCreateSessionData(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      pumpData: createDefaultPumpData(),
      pendingPumpsRequests: new Set(),
      isListeningStarted: false,
      idleTimeout: null,
      consumerTag: null,
      queueReqv: null,
      queueSet: null,
    });
  }
  return sessions.get(sessionId);
}

// ---------- Helper functions (operate on sessionData) ----------

/**
 * Reset the session's pump data to defaults, **exactly** as the original does.
 *
 * - For each pump: creates a brand new object containing ONLY:
 *     flowRate, pressure, volume (empty arrays), volumeMax = 0,
 *     status (preserved if keepStatus=true, else initStatus), state = null.
 *   → stateQueue is **completely discarded** (not present in the new object).
 * - activeStepPumpProgram → null
 * - degasser.state → null  (degasser.stateQueue is left untouched)
 */
function clearStoredData(sessionData, keepStatus = true) {
  const { pumpData } = sessionData;
  const initStatus = environment === 'development' ? NODE_STATUSES.CONNECTED : null;

  Object.keys(pumpData.pumps).forEach((key) => {
    const lastStatus = pumpData.pumps[key].status;
    // Replace the entire pump object – NO stateQueue, NO other fields.
    pumpData.pumps[key] = {
      flowRate: { x: [], y: [] },
      pressure: { x: [], y: [] },
      volume: { x: [], y: [] },
      volumeMax: 0,
      status: keepStatus ? lastStatus : initStatus,
      state: null,
    };
  });

  pumpData.activeStepPumpProgram = null;
  pumpData.degasser.state = null; 
}



/**
 * Set or reset the idle timer for a session.
 * After timeout the session's pump statuses become NOT_RESPONSIVE.
 */
function setIdleTimer(sessionId, timeoutMs) {
  const sessionData = sessions.get(sessionId);
  if (!sessionData) return;

  clearTimeout(sessionData.idleTimeout);
  if (environment === 'development') return; // no timer in dev

  sessionData.idleTimeout = setTimeout(() => {
    const data = sessions.get(sessionId);
    if (data) {
      Object.keys(data.pumpData.pumps).forEach((key) => {
        data.pumpData.pumps[key].status = NODE_STATUSES.NOT_RESPONSIVE;
      });
      logger.info(`[session ${sessionId}] Idle timeout reached. Status reset to ${NODE_STATUSES.NOT_RESPONSIVE}.`);
      if (data.pendingPumpsRequests.size > 0) {
        logger.warn(
          `[session ${sessionId}] Pending pumps requests after idle timeout: ${Array.from(data.pendingPumpsRequests).join(', ')}`
        );
      }
    }
  }, timeoutMs);
}

/**
 * Process an incoming pumps message for a specific session.
 */
function processPumpsMessage(sessionId, message, queueReqv) {
  const sessionData = sessions.get(sessionId);
  if (!sessionData) {
    logger.error(`[session ${sessionId}] Received message but session data not found`);
    return;
  }

  try {
    // Clear any existing idle timer – we will set a new one after processing
    clearTimeout(sessionData.idleTimeout);

    const jsonData = JSON.parse(message);
    const { pumpData, pendingPumpsRequests } = sessionData;

    // ----- correlationId cleanup -----
    if (jsonData?.correlationId) {
      if (pendingPumpsRequests.has(jsonData.correlationId)) {
        pendingPumpsRequests.delete(jsonData.correlationId);
        logger.info(`[session ${sessionId}] Resolved pumps request: ${jsonData.correlationId}`);
      }
    } else {
      // optionally log missing correlationId
      // logger.warn(`[session ${sessionId}] Pumps response missing correlationId`);
    }

    // ----- active step program and degasser state -----
    pumpData.activeStepPumpProgram = jsonData?.activeStepPumpProgram ?? null;
    pumpData.degasser.state = jsonData?.degasserState ?? NODE_STATUSES.NOT_CONNECTED;

    // ----- per‑pump updates -----
    Object.keys(jsonData).forEach((key) => {
      if (pumpData.pumps[key]) {
        const {
          status: newStatus,
          state: newState,
          flowRate: { x: flowRateX, y: flowRateY } = {},
          pressure: { x: pressureX, y: pressureY } = {},
          volume: { x: volumeX, y: volumeY } = {},
          volumeMax,
        } = jsonData[key];

        validateAndSetStatus(pumpData.pumps[key], 'status', newStatus, logger);
        validateAndSetPumpState(pumpData.pumps[key], 'state', 'stateQueue', newState, logger);
        validateArrayPointWithFallback(pumpData.pumps[key].flowRate.x, flowRateX, `flowRateX for ${key}`, logger);
        validateArrayPointWithFallback(pumpData.pumps[key].flowRate.y, flowRateY, `flowRateY for ${key}`, logger);
        validateArrayPointWithFallback(pumpData.pumps[key].pressure.x, pressureX, `pressureX for ${key}`, logger);
        validateArrayPointWithFallback(pumpData.pumps[key].pressure.y, pressureY, `pressureY for ${key}`, logger);
        validateArrayPointWithFallback(pumpData.pumps[key].volume.x, volumeX, `volumeX for ${key}`, logger);
        validateArrayPointWithFallback(pumpData.pumps[key].volume.y, volumeY, `volumeY for ${key}`, logger);

        pumpData.pumps[key].volumeMax = validateNumericValue(
          volumeMax,
          `volumeMax for ${key}`,
          logger,
          pumpData.pumps[key].volumeMax || 0
        );
      }
    });

    logger.info(`[session ${sessionId}] Consumed message from ${queueReqv}: ${message}`);

    // ----- reset idle timer -----
    setIdleTimer(sessionId, 7000);
  } catch (error) {
    logger.error(`[session ${sessionId}] Error processing message: ${error.message}`);
  }
}

/**
 * Start consuming pumps messages for a given session.
 * Ensures only one consumer per session/queue.
 */
async function startListeningPumps(sessionId, queueReqv) {
  const sessionData = sessions.get(sessionId);
  if (!sessionData) {
    logger.error(`[session ${sessionId}] Cannot start listener – session data missing`);
    return;
  }

  if (sessionData.isListeningStarted) {
    logger.debug(`[session ${sessionId}] Consumer already running for queue ${queueReqv}`);
    return;
  }

  // Mark as started immediately to prevent concurrent attempts,
  // but we'll clear the flag if consumer creation fails.
  sessionData.isListeningStarted = true;

  try {
    // Reset stored data to default (keep status)
    clearStoredData(sessionData, true);
    setIdleTimer(sessionId, 7000);

    const ok = await pumpsChannelGet.consume(
      queueReqv,
      (msg) => {
        if (!msg) {
          logger.warn(`Received bad pump message: ${msg} message from queue ${queueReqv}`);
          return;
        }
        processPumpsMessage(sessionId, msg.content.toString(), queueReqv);
        pumpsChannelGet.ack(msg);
      },
      { consumerTag: `pumps-${sessionId}` } // unique consumer tag per session
    );

    sessionData.consumerTag = ok.consumerTag;
    sessionData.queueReqv = queueReqv;
    logger.info(`[session ${sessionId}] Started consumer on queue ${queueReqv}, tag ${ok.consumerTag}`);
  } catch (err) {
    // Consumer failed – reset flag so we can try again later
    sessionData.isListeningStarted = false;
    logger.error(`[session ${sessionId}] Failed to start consumer: ${err.message}`);
  }
}

function cleanupSession(sessionId) {
  const sessionData = sessions.get(sessionId);
  if (!sessionData) return;

  clearTimeout(sessionData.idleTimeout);
  if (sessionData.consumerTag) {
    pumpsChannelGet
      .cancel(sessionData.consumerTag)
      .then(() => logger.info(`[session ${sessionId}] Consumer cancelled`))
      .catch((err) => logger.error(`[session ${sessionId}] Failed to cancel consumer: ${err.message}`));
  }
  sessions.delete(sessionId);
  logger.info(`[session ${sessionId}] Session cleaned up`);
}

// ---------- HTTP endpoints ----------


/**
 * GET /pumps
 * Fetch the current pumps state for the session.
 */
router.get('/', async (req, res) => {
  const { sessionId } = req.query;

  // 1. Resolve queues
  let queueSet, queueReqv;
  try {
    const queues = queueManager.getQueues(sessionId, 'pumps');
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

  // 3. Ensure consumer is running (fire and forget)
  if (!sessionData.isListeningStarted) {
    startListeningPumps(sessionId, queueReqv).catch((err) => {
      logger.error(`[session ${sessionId}] Failed to start consumer: ${err.message}`);
    });
  }

  // 4. Prepare and send request for state
  const correlationId = crypto.randomUUID();
  sessionData.pendingPumpsRequests.add(correlationId);

  const message = { pumpsState: 'get_state', correlationId };
  logger.info(`[session ${sessionId}] Sending to queue ${queueSet}: ${JSON.stringify(message)}`);

  try {
    await channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));
  } catch (err) {
    sessionData.pendingPumpsRequests.delete(correlationId);
    logger.error(`[session ${sessionId}] Failed to send message: ${err.message}`);
    return res.status(500).json({ error: 'Failed to send request to pumps' });
  }

  // 5. Build response data (consume one state from each queue)
  const dataToSend = {
    pumps: Object.fromEntries(
      Object.entries(sessionData.pumpData.pumps).map(([key, pump]) => {
        const queue = pump.stateQueue;
        return [
          key,
          {
            ...pump,
            state: Array.isArray(queue) && queue.length > 0 ? queue.shift() : pump.state,
          },
        ];
      })
    ),
    degasser: {
      ...sessionData.pumpData.degasser,
      state:
        Array.isArray(sessionData.pumpData.degasser.stateQueue) &&
        sessionData.pumpData.degasser.stateQueue.length > 0
          ? sessionData.pumpData.degasser.stateQueue.shift()
          : sessionData.pumpData.degasser.state,
    },
    activeStepPumpProgram: sessionData.pumpData.activeStepPumpProgram,
  };

  // 6. Calculate number of points sent
  const numPoints = {};
  Object.keys(dataToSend.pumps).forEach((key) => {
    numPoints[key] = {
      flowRate: dataToSend.pumps[key].flowRate.x.length,
      pressure: dataToSend.pumps[key].pressure.x.length,
      volume: dataToSend.pumps[key].volume.x.length,
    };
  });

  res.json(dataToSend);

  // 7. Clear sent data from the session's pumpData
  Object.keys(sessionData.pumpData.pumps).forEach((key) => {
    sessionData.pumpData.pumps[key].flowRate.x.splice(0, numPoints[key].flowRate);
    sessionData.pumpData.pumps[key].flowRate.y.splice(0, numPoints[key].flowRate);
    sessionData.pumpData.pumps[key].pressure.x.splice(0, numPoints[key].pressure);
    sessionData.pumpData.pumps[key].pressure.y.splice(0, numPoints[key].pressure);
    sessionData.pumpData.pumps[key].volume.x.splice(0, numPoints[key].volume);
    sessionData.pumpData.pumps[key].volume.y.splice(0, numPoints[key].volume);
  });
});

router.post('/stop', async (req, res) => {
  const { sessionId } = req.query;

  let queueSet, queueReqv;
  try {
    const queues = queueManager.getQueues(sessionId, 'pumps');
    if (!queues || queues.length === 0) {
      return res.status(404).json({ error: 'No queues found for session' });
    }
    [queueSet, queueReqv] = queues;
  } catch (error) {
    logger.error(`Error fetching queues for session ${sessionId}: ${error.message}`);
    return res.status(440).json({ error: 'Failed to get queues for session' });
  }

  const message = { pumpState: 'stop' };
  logger.info(`Sending to queue ${queueSet} from ${req.method} ${req.url}: ${JSON.stringify(message)}`);
  logger.warn('stop pumps');
  await channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));
  res.status(200).send('stopped pump');
});

router.post('/pumpParams', async (req, res) => {
  const pumpParams = req.body;

  const { sessionId } = req.query;

  let queueSet, queueReqv;
  try {
    const queues = queueManager.getQueues(sessionId, 'pumps');
    if (!queues || queues.length === 0) {
      return res.status(404).json({ error: 'No queues found for session' });
    }
    [queueSet, queueReqv] = queues;
  } catch (error) {
    logger.error(`Error fetching queues for session ${sessionId}: ${error.message}`);
    return res.status(440).json({ error: 'Failed to get queues for session' });
  }

  const message = { operation: 'setPumpSettings', ...pumpParams };
  logger.info(`Sending to queue ${queueSet} from ${req.method} ${req.url}: ${JSON.stringify(message)}`);
  logger.warn('set pump params');
  await channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));
  res.status(200).send('posted params');
});

router.post('/releasePressure', async (req, res) => {
  const pumpParams = req.body;

  const { sessionId } = req.query;

  let queueSet, queueReqv;
  try {
    const queues = queueManager.getQueues(sessionId, 'pumps');
    if (!queues || queues.length === 0) {
      return res.status(404).json({ error: 'No queues found for session' });
    }
    [queueSet, queueReqv] = queues;
  } catch (error) {
    logger.error(`Error fetching queues for session ${sessionId}: ${error.message}`);
    return res.status(440).json({ error: 'Failed to get queues for session' });
  }

  const { pumpMode, pumpAReleasePressure, pumpBReleasePressure } = pumpParams;
  const message = {
    pumpMode,
    ...(pumpAReleasePressure != undefined && { pumpAReleasePressure }),
    ...(pumpBReleasePressure != undefined && { pumpBReleasePressure }),
  };
  logger.info(`Sending to queue ${queueSet} from ${req.method} ${req.url}: ${JSON.stringify(message)}`);
  logger.warn('releasePressure');
  await channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));
  res.status(200).send(`release pressure command sent with params ${message}`);
});

router.post('/toggleDegasser', async (req, res) => {
  const { newState } = req.body;

  const operation = newState ? 'degasserOn' : 'degasserOff';

  const { sessionId } = req.query;

  let queueSet, queueReqv;
  try {
    const queues = queueManager.getQueues(sessionId, 'pumps');
    if (!queues || queues.length === 0) {
      return res.status(404).json({ error: 'No queues found for session' });
    }
    [queueSet, queueReqv] = queues;
  } catch (error) {
    logger.error(`Error fetching queues for session ${sessionId}: ${error.message}`);
    return res.status(440).json({ error: 'Failed to get queues for session' });
  }
  
  const message = {
    operation,
  };
  logger.info(`Sending to queue ${queueSet} from ${req.method} ${req.url}: ${JSON.stringify(message)}`);

  await channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));
  res.status(200).send(`toggleDegasser with params ${message}`);
});

module.exports = async (getChannelPost, loggerInstance, queueManagerInstance) => {
  queueManager = queueManagerInstance
  pumpsChannelGet = await createChannel();
  channelPost = getChannelPost();
  logger = loggerInstance;
  router.use('/isocrat', isocratRoutes(getChannelPost, logger, queueManagerInstance));
  router.use('/gradient', gradientRoutes(getChannelPost, logger, queueManagerInstance));
  return router;
};
