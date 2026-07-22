// spectrLifecycle.js

const { stopConsumer, waitForResolversToSettle } = require('../services/resolver');
const { validateArrayPointWithFallback, sleep, validateStrValue } = require('../services/utils');
const { createChannel } = require('../services/connectRabbitMQ');
const { RESETING_SPECTO_OPERATIONS } = require('../services/constants');

// Service-level state (channels, timers, tags)
const serviceState = {
  channelMap: {}, // { [measurementName]: { channelPost, measurementChannelGet } }
  consumerTags: {}, // { [measurementName]: consumerTag }
  pollingIntervals: {}, // { [measurementName]: intervalId }
  escapeHatch: {}, // <-- NEW: { [measurementId]: { operation, resolve, reject } }
};

// Measurement-specific data state container
const dataState = {}; // { [measurementName]: { measuredSpectroscopic: {x: [], y: []}, processedCurves: [], status: '' } }

// Default data template
function createEmptyData() {
  return {
    measuredSpectroscopic: { x: [], y: [] },
    processedCurves: [],
    status: '',
  };
}

// Initialize dataState for a measurement
function initDataState(measurementName) {
  dataState[measurementName] = createEmptyData();
}

// Clear dataState for a measurement
function clearDataState(measurementName) {
  dataState[measurementName] = createEmptyData();
}

// Remove dataState when done
function removeDataState(measurementName) {
  delete dataState[measurementName];
}

async function sendOperationMessage({
  measurementId,
  operation,
  payload = {},
  logger,
  queueManager,
  sessionId,
  serviceState,
}) {
  const channelPost = serviceState.channelMap[measurementId]?.channelPost;
  if (!channelPost) {
    logger.warn(`No channelPost found for measurementId '${measurementId}'`);
    return false;
  }

  const [queueSet] = queueManager.getQueues(sessionId, measurementId);
  if (!queueSet) {
    logger.warn(`No SET queue in ${sessionId} session found for measurementId '${measurementId}'`);
    return false;
  }

  const message = { operation, ...payload };
  const buffer = Buffer.from(JSON.stringify(message));

  logger.info(
    `Sending to queue '${queueSet}' operation '${operation}': ${JSON.stringify(message)}`,
  );

  channelPost.sendToQueue(queueSet, buffer);
  return true;
}

async function stopMeasurement({
  measurementId,
  sendMessage = true,
  purgeQueues = true,
  stopPolling = true,
  cancelConsumer = true,
  closeChannel = true,
  logger,
  queueManager,
  sessionId
}) {
  try {
    const stepsDone = [];
    const [queueSet, queueReqv] = queueManager.getQueues(sessionId, measurementId);
    // send stop message if required
    if (sendMessage) {
      const { channelPost } = serviceState.channelMap[measurementId];
      const message = { operation: 'stopMeasurSpectr' };
      logger.info(`Sending to queue '${queueSet}' stop: ${JSON.stringify(message)}`);
      channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));
      stepsDone.push('sent stop message');
    }

    // stop polling
    if (stopPolling) {
      const pollingInterval = serviceState.pollingIntervals[measurementId];
      if (pollingInterval) {
        clearInterval(pollingInterval);
        delete serviceState.pollingIntervals[measurementId];
      }
      stepsDone.push('stopped polling');
    }

    const channelGet = serviceState.channelMap[measurementId].measurementChannelGet;
    if (!channelGet) logger.warn('Channel already closed on cleanup');

    // cancel consumer
    if (cancelConsumer && channelGet) {
      const consumerTag = serviceState.consumerTags[measurementId];
      if (consumerTag) {
        await channelGet.cancel(consumerTag);
        delete serviceState.consumerTags[measurementId];
        logger.info(`Canceled consumer for '${measurementId}'`);
      }
      stepsDone.push('canceled consumer');
    }

    // purge queues if needed
    if (purgeQueues && channelGet) {
      await channelGet.purgeQueue(queueReqv);
      logger.info(`Purged queue '${queueReqv}'`);
      stepsDone.push('purged queue');
    }

    if (closeChannel && channelGet) {
      // close measurement channel
      channelGet.close(); // might be cleared already
      delete serviceState.channelMap[measurementId].measurementChannelGet;
      stepsDone.push('closed channel');
    }

    logger.warn(
      `Stopped measurement ${measurementId}. Steps done: ${stepsDone.join(', ')}`,
    );
  } catch (error) {
    logger.error(`Failed to stop measurement ${measurementId}: ${error.message}`);
    throw error;
  }
}

async function cleanupMeasurementInternals(measurementId, logger, queueManager, sessionId) {
  const channelPost = serviceState.channelMap[measurementId]?.channelPost;
  if (!channelPost) {
    logger.error('missing channel post for cleanup');
    return;
  }

  const [qSet, qReqv] = queueManager.getQueues(sessionId, measurementId);
  let q_set_info = await channelPost.assertQueue(qSet, { passive: true });
  let q_reqv_info = await channelPost.assertQueue(qReqv, { passive: true });

  while (q_set_info.consumerCount || q_reqv_info.consumerCount) {
    await sleep(1000);
    q_set_info = await channelPost.assertQueue(qSet, { passive: true });
    console.log(`На очереди ${q_set_info.queue} сейчас ${q_set_info.consumerCount} консьюмеров.`, q_set_info);
    q_reqv_info = await channelPost.assertQueue(qReqv, { passive: true });
    console.log(`На очереди ${q_reqv_info.queue} сейчас ${q_reqv_info.consumerCount} консьюмеров.`, q_reqv_info);
  }

  await queueManager.deleteQueuesByBase(sessionId, measurementId);
  channelPost.close();
  delete serviceState.channelMap[measurementId].channelPost;
  logger.warn(`Hard-cleaned measurement ${measurementId}`);

  removeDataState(measurementId);
  delete serviceState.consumerTags[measurementId];
  delete serviceState.pollingIntervals[measurementId];
  delete serviceState.channelMap[measurementId];
  delete serviceState.escapeHatch[measurementId];
}

async function closeSpectroMeasurement({
  measurementId,
  closeMessage,
  logger,
  queueManager, 
  sessionId,
}) {
  try {
    // wait for resolvers if needed
    const settled = await waitForResolversToSettle(measurementId, 6000);
    const [queueSet, queueReqv] = queueManager.getQueues(sessionId, measurementId)
    if (!settled) {
      logger.warn(`Timeout waiting for resolvers for ${measurementId}`);
      await stopConsumer(queueReqv, logger);
    }

    clearDataState(measurementId);

    // send close message

    const { channelPost } = serviceState.channelMap[measurementId];


    logger.warn(`Sending close to '${queueSet}': ${JSON.stringify(closeMessage)}`);
    channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(closeMessage)));

    await cleanupMeasurementInternals(measurementId, logger, queueManager, sessionId);
  } catch (error) {
    logger.error(`Failed to close measurement ${measurementId}: ${error.message}`);
    throw error;
  }
}

async function startListeningSpectro({
  measurementId,
  logger,
  queueManager,
  sessionId,
  onFinishObj: { onFinish, isAsync = false } = {},
}) {
  // init data container for this measurement
  initDataState(measurementId);

  const [queueSet, queueReqv] = queueManager.getQueues(sessionId, measurementId);
  const measurementChannelGet = await createChannel();
  const { channelPost } = serviceState.channelMap[measurementId];
  serviceState.channelMap[measurementId].measurementChannelGet = measurementChannelGet;

  const { consumerTag } = await measurementChannelGet.consume(queueReqv, async (data) => {
    if (!data) {
      logger.warn(`Received bad spectro message: ${data} message from queue ${queueReqv}`);
      return;
    }
    
    try {
      const jsonString = data.content.toString();
      const jsonData = JSON.parse(jsonString);

      const hatch = serviceState.escapeHatch[measurementId];

      if (hatch && jsonData.operation && jsonData.operation === hatch.operation) {
        // Resolve the waiting promise
        if (RESETING_SPECTO_OPERATIONS.includes(hatch.operation)) clearDataState(measurementId);

        hatch.resolve(jsonData);

        // Cleanup
        delete serviceState.escapeHatch[measurementId];

        // ack this special message
        measurementChannelGet.ack(data);
        return; // do NOT process as measurement data
      }

      logger.info(`Consumed from '${queueReqv}': ${JSON.stringify(jsonData)}`);

      const ds = dataState[measurementId];
      const {
        measuredSpectroscopic: { x: mx, y: my } = {},
        processedCurves = [],
        status: newStatus,
      } = jsonData;

      validateArrayPointWithFallback(ds.measuredSpectroscopic.x, mx, 'spectroMeasurementX', logger);
      validateArrayPointWithFallback(ds.measuredSpectroscopic.y, my, 'spectroMeasurementY', logger);
      ds.status = validateStrValue(newStatus, 'spectroStatus', logger, ds.status);

      if (Array.isArray(processedCurves) && processedCurves.length > 0) {
        ds.processedCurves = processedCurves;
      }

      measurementChannelGet.ack(data);

      if (newStatus === 'finished') {
        logger.warn(`Measurement ${measurementId} finished.`);
        ds.status = newStatus;
        if (onFinish) {
          logger.warn(`Measurement ${measurementId} cleanup.`);
          if (isAsync) {
            await onFinish();
          } else {
            onFinish();
          }
        }
      }
    } catch (err) {
      logger.error(`Error processing message: ${err.message}`);
    }
  });

  serviceState.consumerTags[measurementId] = consumerTag;

  // start polling
  const intervalId = setInterval(() => {
    const msg = { operation: 'getMeasurSpectrState' };
    logger.info(`Polling '${queueSet}': ${JSON.stringify(msg)}`);
    channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(msg)));
  }, 1000);

  serviceState.pollingIntervals[measurementId] = intervalId;
}

function registerEscapeHatch(measurementId, operation) {
  const existing = serviceState.escapeHatch[measurementId];

  if (existing) {
    logger.warn(`[${measurementId}] Escape hatch already active — rejecting previous`);
    existing.reject(new Error('superseded'));
    delete serviceState.escapeHatch[measurementId];
  }

  return new Promise((resolve, reject) => {
    serviceState.escapeHatch[measurementId] = {
      operation,
      resolve,
      reject,
    };
  });
}

function isMeasurementRunning(measurementId) {
  const polling = serviceState.pollingIntervals[measurementId];
  const consumer = serviceState.consumerTags[measurementId];
  const channel = serviceState.channelMap[measurementId]?.measurementChannelGet;
  return Boolean(polling && consumer && channel);
}

function pausePolling(measurementId) {
  const interval = serviceState.pollingIntervals[measurementId];
  if (interval) {
    clearInterval(interval);
    delete serviceState.pollingIntervals[measurementId];
    return true;
  }
  return false;
}

function resumePolling(measurementId, queueNameSet) {
  const channelPost = serviceState.channelMap[measurementId]?.channelPost;
  if (!channelPost) return;

  const intervalId = setInterval(() => {
    const msg = { operation: 'getMeasurSpectrState' };
    channelPost.sendToQueue(queueNameSet, Buffer.from(JSON.stringify(msg)));
  }, 1000);

  serviceState.pollingIntervals[measurementId] = intervalId;
}

module.exports = {
  sendOperationMessage,
  startListeningSpectro,
  stopMeasurement,
  closeSpectroMeasurement,
  clearDataState,
  cleanupMeasurementInternals,
  serviceState,
  dataState,
  registerEscapeHatch,
  isMeasurementRunning,
  pausePolling,
  resumePolling,
};
