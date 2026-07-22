const express = require('express');
const _ = require('lodash');
const crypto = require('crypto');
const { NODE_STATUSES, DETECTOR_TYPES } = require('../services/constants');
const { validateNumericValue, validateArrayPointWithFallback } = require('../services/utils');
const { createChannel } = require('../services/connectRabbitMQ');
const { resolveSessionQueues } = require('../services/sessionQueuesHelpers');
const { error } = require('winston');

const router = express.Router();

let queueManager;
let detectorChannelGet;
let channelPost;
let logger;
let isListeningStarted = false;
const environment = process.env.NODE_ENV || 'production';
let idleTimeout;

const INIT_PROGRESS_NULLISH_THRESHOLD = 3;
let initProgressNullishCounter = 0;

const commonTypeFields = ['status', 'signalPhoto', 'signalRef'];
const commonFields = [...commonTypeFields, 'initializingProgress'];

let detectorType = null;

const pendingDetectorRequests = new Set();

const detectorFieldMapping = {
  [DETECTOR_TYPES.SPHDETECTOR2]: [...commonFields, 'wavelength'],
  [DETECTOR_TYPES.PANORAMA2]: [
    ...commonFields,
    'excitationWavelength',
    'registrationWavelength',
    'sensitivity',
    'signalFluor',
  ],
  [DETECTOR_TYPES.FLUORAT]: [
    ...commonFields,
    'sensitivity',
    'signalFluor',
  ],
  [DETECTOR_TYPES.RID]: [
    'status',
    'signalRiu',
    'temperature',
    'purge',
    'polarity',
  ],
  [DETECTOR_TYPES.DAD]: [
    'status',
    'signalPhoto',
    'wavelength'
  ],
  null: commonFields, // fallback for unknown detectors
};

detectorFieldMapping[DETECTOR_TYPES.SPHDETECTOR] = _.cloneDeep(detectorFieldMapping[DETECTOR_TYPES.SPHDETECTOR2]);
detectorFieldMapping[DETECTOR_TYPES.PANORAMA] = _.cloneDeep(detectorFieldMapping[DETECTOR_TYPES.PANORAMA2]);

const defaultDetectorData = {
  status: environment === 'development' ? NODE_STATUSES.CONNECTED : null,
  wavelength: null,
  excitationWavelength: null,
  registrationWavelength: null,
  sensitivity: null,
  signalFluor: { x: [], y: [] },
  signalPhoto: { x: [], y: [] },
  signalRef: { x: [], y: [] },
  // === Поля для RID === //
  signalRiu: { x: [], y: [] },
  temperature: null,
  purge: null,
  polarity: null,
  // ==================== //
  initializingProgress: null,
};

// ---------- Session storage ----------
const sessions = new Map(); // key: sessionId, value: sessionData object

/**
 * Creates or retrieves session data for a given sessionId.
 * Each session contains:
 *   - detectorData       : current detector state (mutable)
 *   - detectorType       : detected detector type
 *   - initProgressNullishCounter : counter for null progress
 *   - pendingDetectorRequests : Set of correlationIds awaiting response
 *   - idleTimeout        : NodeJS.Timeout handle
 *   - isListeningStarted : boolean, true if consumer already set up
 *   - consumerTag        : RabbitMQ consumer tag (for potential cancellation)
 *   - queueReqv          : queue name for consuming detector messages
 *   - queueSet           : queue name for sending commands
 */
function getOrCreateSessionData(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      detectorData: _.cloneDeep(defaultDetectorData),
      detectorType: null,
      initProgressNullishCounter: 0,
      pendingDetectorRequests: new Set(),
      idleTimeout: null,
      isListeningStarted: false,
      consumerTag: null,
      queueReqv: null,
      queueSet: null,
    });
  }
  return sessions.get(sessionId);
}

/**
 * Determine detector type from incoming JSON and store it in sessionData.
 */
function determineDetectorType(sessionData, jsonData) {
  for (const [detectorType, fields] of Object.entries(detectorFieldMapping)) {
    const typeFields = fields.filter(f => f !== 'initializingProgress');
    if (typeFields.every(field => jsonData[field] !== undefined)) {
      sessionData.detectorType = detectorType;
      return detectorType;
    }
  }
  logger.warn('Detector type could not be determined, defaulting to unknown (null)');
  sessionData.detectorType = null;
  return null;
}

const calculateNumPoints = (responseData, detectorFields) => {
  const numPoints = {};
  detectorFields.forEach((field) => {
    const lengthOfSent = responseData?.[field]?.x?.length;
    if (lengthOfSent) {
      numPoints[field] = lengthOfSent;
    }
  });
  return numPoints;
};

/**
 * Reset arrays in sessionData.detectorData by splicing out the points just sent.
 * Also optionally reset the whole detectorData to defaults while preserving status and progress.
 */
function resetSessionDetectorData(sessionData, numPoints, keepStatus = true) {
  const { detectorData } = sessionData;

  // If numPoints is an object, splice its arrays
  if (typeof numPoints === 'object' && numPoints !== null) {
    Object.entries(numPoints).forEach(([field, spliceBorder]) => {
      detectorData[field].x.splice(0, spliceBorder);
      detectorData[field].y.splice(0, spliceBorder);
    });
  }

  // Preserve status and progress if requested
  const status = keepStatus ? detectorData.status : defaultDetectorData.status;
  const { initializingProgress } = detectorData;

  // Replace detectorData with a fresh copy, keeping the preserved fields
  sessionData.detectorData = {
    ..._.cloneDeep(defaultDetectorData),
    status,
    initializingProgress,
  };
}

/**
 * Set or reset the idle timer for a session.
 * After timeout the session's status becomes NOT_RESPONSIVE.
 */
function setIdleTimer(sessionId, timeout) {
  const sessionData = sessions.get(sessionId);
  if (!sessionData) return;

  clearTimeout(sessionData.idleTimeout);
  if (environment === 'development') return; // no timer in dev

  sessionData.idleTimeout = setTimeout(() => {
    const data = sessions.get(sessionId);
    if (data) {
      data.detectorData.status = NODE_STATUSES.NOT_RESPONSIVE;
      logger.info(`[session ${sessionId}] Idle timeout reached. Status reset to ${NODE_STATUSES.NOT_RESPONSIVE}.`);
      if (data.pendingDetectorRequests.size > 0) {
        logger.warn(`[session ${sessionId}] Pending detector requests after idle timeout: ${Array.from(data.pendingDetectorRequests).join(', ')}`);
      }
    }
  }, timeout);
}


/**
 * Process an incoming detector message for a specific session.
 */
function processDetectorMessage(sessionId, message, queueReqv) {
  const sessionData = sessions.get(sessionId);
  if (!sessionData) {
    logger.error(`[session ${sessionId}] Received message but session data not found`);
    return;
  }

  try {
    const jsonData = JSON.parse(message);

    // ----- initializingProgress handling -----
    if ('initializingProgress' in jsonData) {
      const value = jsonData.initializingProgress;
      if (typeof value === 'number') {
        sessionData.detectorData.initializingProgress = value;
        sessionData.initProgressNullishCounter = 0;
      } else if (value === null) {
        sessionData.initProgressNullishCounter += 1;
        if (sessionData.initProgressNullishCounter >= INIT_PROGRESS_NULLISH_THRESHOLD) {
          sessionData.detectorData.initializingProgress = null;
        }
      }
    } else {
      // field absent => count as nullish
      sessionData.initProgressNullishCounter += 1;
      if (sessionData.initProgressNullishCounter >= INIT_PROGRESS_NULLISH_THRESHOLD) {
        sessionData.detectorData.initializingProgress = null;
      }
    }

    // ----- detector type determination -----
    determineDetectorType(sessionData, jsonData);

    // ----- correlationId cleanup -----
    if (jsonData?.correlationId) {
      if (sessionData.pendingDetectorRequests.has(jsonData.correlationId)) {
        sessionData.pendingDetectorRequests.delete(jsonData.correlationId);
      }
    }

    // ----- detector‑specific field updates -----
    const { detectorData } = sessionData;
    let detectorSignalMappings = [];

    const type = sessionData.detectorType;
    if (type === DETECTOR_TYPES.SPHDETECTOR2 || type === DETECTOR_TYPES.SPHDETECTOR) {
      const { wavelength, signalPhoto, signalRef } = jsonData;
      detectorSignalMappings = [
        { key: 'signalPhoto', data: signalPhoto },
        { key: 'signalRef', data: signalRef },
      ];
      detectorData.wavelength = validateNumericValue(wavelength, 'wavelength', logger);
    } else if (type === DETECTOR_TYPES.PANORAMA2 || type === DETECTOR_TYPES.PANORAMA) {
      const { excitationWavelength, registrationWavelength, signalPhoto, signalRef, signalFluor, sensitivity } = jsonData;
      if (sensitivity) detectorData.sensitivity = sensitivity;
      detectorSignalMappings = [
        { key: 'signalFluor', data: signalFluor },
        { key: 'signalPhoto', data: signalPhoto },
        { key: 'signalRef', data: signalRef },
      ];
      detectorData.excitationWavelength = validateNumericValue(excitationWavelength, 'excitationWavelength', logger);
      detectorData.registrationWavelength = validateNumericValue(registrationWavelength, 'registrationWavelength', logger);
    } else if (type === DETECTOR_TYPES.FLUORAT) {
      const { signalPhoto, signalRef, signalFluor, sensitivity } = jsonData;
      if (sensitivity) detectorData.sensitivity = sensitivity;
      detectorSignalMappings = [
        { key: 'signalFluor', data: signalFluor },
        { key: 'signalPhoto', data: signalPhoto },
        { key: 'signalRef', data: signalRef },
      ];
    } else if (type === DETECTOR_TYPES.RID) {
      const { signalRiu, temperature, purge, polarity } = jsonData;
      detectorSignalMappings = [{ key: 'signalRiu', data: signalRiu }];
      if (typeof temperature === 'number') detectorData.temperature = temperature;
      if (typeof purge === 'boolean') detectorData.purge = purge;
      if (typeof polarity === 'boolean') detectorData.polarity = polarity;
    } else  if (type === DETECTOR_TYPES.DAD) {
      const { wavelength, signalPhoto } = jsonData;
      detectorSignalMappings = [
        { key: 'signalPhoto', data: signalPhoto },
      ];
      detectorData.wavelength = validateNumericValue(wavelength, 'wavelength', logger);
    }

    // ----- status update -----
    const { status } = jsonData;
    if (Object.values(NODE_STATUSES).includes(status)) {
      detectorData.status = status;
    } else {
      logger.error(`[session ${sessionId}] Invalid detector status: ${status}`);
    }

    // ----- signal arrays validation & extension -----
    detectorSignalMappings.forEach(({ key, data }) => {
      if (data) {
        validateArrayPointWithFallback(detectorData[key].x, data.x, `${key}.x`, logger);
        validateArrayPointWithFallback(detectorData[key].y, data.y, `${key}.y`, logger);
      } else if (data === null) {
        logger.info(`[session ${sessionId}] Empty data for ${key}`);
      } else {
        logger.error(`[session ${sessionId}] Missing signal data for ${key}`);
      }
    });

    // ----- reset idle timer -----
    setIdleTimer(sessionId, 7000);

    logger.info(`[session ${sessionId}] Processed detector message from ${queueReqv}: ${message}`);
  } catch (error) {
    logger.error(`[session ${sessionId}] Error processing detector message: ${error.message}`);
  }
}

/**
 * Start consuming detector messages for a given session.
 * Ensures only one consumer per session/queue.
 */
function startListeningDetector(sessionId, queueReqv) {
  const sessionData = sessions.get(sessionId);
  if (!sessionData) {
    logger.error(`[session ${sessionId}] Cannot start listener – session data missing`);
    return;
  }

  if (sessionData.isListeningStarted) {
    logger.debug(`[session ${sessionId}] Consumer already running for queue ${queueReqv}`);
    return;
  }

  // Reset detector data to default (keep status and progress)
  resetSessionDetectorData(sessionData, false, true);
  setIdleTimer(sessionId, 7000);

  // Start consuming
  detectorChannelGet.consume(queueReqv, (msg) => {
    if (!msg) {
      logger.warn(`Received bad detector ${msg} message from queue ${queueReqv}`);
      return;
    }
    processDetectorMessage(sessionId, msg.content.toString(), queueReqv);
    detectorChannelGet.ack(msg);
  }, { consumerTag: `detector-${sessionId}` }) // optional: fixed consumer tag
    .then((ok) => {
      sessionData.isListeningStarted = true;
      sessionData.consumerTag = ok.consumerTag;
      sessionData.queueReqv = queueReqv;
      logger.info(`[session ${sessionId}] Started consumer on queue ${queueReqv}, tag ${ok.consumerTag}`);
    })
    .catch((err) => {
      logger.error(`[session ${sessionId}] Failed to start consumer: ${err.message}`);
    });
}

/**
 * Optional: clean up session resources (consumer, timer, remove from map)
 */
function cleanupSession(sessionId) {
  const sessionData = sessions.get(sessionId);
  if (!sessionData) return;

  clearTimeout(sessionData.idleTimeout);
  if (sessionData.consumerTag) {
    detectorChannelGet.cancel(sessionData.consumerTag)
      .then(() => logger.info(`[session ${sessionId}] Consumer cancelled`))
      .catch((err) => logger.error(`[session ${sessionId}] Failed to cancel consumer: ${err.message}`));
  }
  sessions.delete(sessionId);
  logger.info(`[session ${sessionId}] Session cleaned up`);
}

router.get('/', (req, res) => {
   try {
    const { sessionId, queueSet, queueReqv } = resolveSessionQueues(req, queueManager, 'detector', logger);

    // Get or create session data
    const sessionData = getOrCreateSessionData(sessionId);
    sessionData.queueSet = queueSet;
    sessionData.queueReqv = queueReqv;
  
    // Ensure consumer is running for this session
    if (!sessionData.isListeningStarted) {
      startListeningDetector(sessionId, queueReqv);
    }

    const correlationId = crypto.randomUUID();
    const message = { detectorState: 'get_state', correlationId };
    sessionData.pendingDetectorRequests.add(correlationId);

    logger.info(`[session ${sessionId}] Sending message to queue ${queueSet}: ${JSON.stringify(message)}`);
    channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));

    // Build response using only fields relevant for the current detector type
    const { detectorData, detectorType } = sessionData;
    const responseData = Object.fromEntries(
      Object.entries(detectorData)
        .filter(([key]) => detectorFieldMapping[detectorType]?.includes(key))
    );

    res.json(responseData);

    // Reset arrays that were sent (keep status and progress)
    const numPoints = calculateNumPoints(responseData, detectorFieldMapping[detectorType]);
    resetSessionDetectorData(sessionData, numPoints, true);
  } catch (err) {
    return res.status(440).json({ error: err.message });
  }  
});

/**
 * POST /setRidPurge - переключение продувки RID (режим "зажатой кнопки").
 * Body: { purge: true | false }
 * При purge=true измерение запускать нельзя.
 */
router.post('/setRidPurge', (req, res) => {
  try {
    const { sessionId, queueSet } = resolveSessionQueues(req, queueManager, 'detector', logger);
    const purge = Boolean(req.body?.purge);
    const message = { operation: 'setRidPurge', purge, correlationId: crypto.randomUUID() };
    logger.info(`[session ${sessionId}] Sending setRidPurge to queue ${queueSet}: purge=${purge}`);
    channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));
    res.status(200).json({ purge });
  } catch (err) {
    logger.error(`Failed RID purge`)
    console.error(error)
    res.status(440).json({ error: err.message });
  }
});

module.exports = async (getChannelPost, passedLogger, queueManagerInstance) => {
  detectorChannelGet = await createChannel();
  channelPost = getChannelPost();
  logger = passedLogger;
  queueManager = queueManagerInstance
  return router;
};
