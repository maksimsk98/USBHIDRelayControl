// chromaLifecycle.js

const { stopConsumer, waitForResolversToSettle } = require('../services/resolver');
const {
  validateArrayPointWithFallback, validateNumericValue, validateStrValue, sleep,
} = require('../services/utils');
const { createChannel } = require('../services/connectRabbitMQ');

// Service-level state (channels, timers, tags)
const serviceState = {
  channelMap: {}, // { [measurementName]: { channelPost, measurementChannelGet } }
  consumerTags: {}, // { [measurementName]: consumerTag }
  pollingIntervals: {}, // { [measurementName]: intervalId }
};

// Measurement-specific data state container
const dataState = {}; // will hold { [measurementName]: { measuredChromatogram, signalPhoto, signalRef, ... } }

// Default data template
function createEmptyData() {
  return {
    measuredChromatogram: { x: [], y: [] },
    signalPhoto: { x: [], y: [] },
    signalRef: { x: [], y: [] },
    activeStep: 0,
    pumpProgramStage: 0,
    status: '',
    isAfterUpdate: false,
    photoParams: {},
    referenceParams: {},
    mainParams: {},
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

async function stopMeasurement({
  measurementId,
  sendMessage = true,
  purgeQueues = true,
  stopPolling = true,
  cancelConsumer = true,
  closeChannel = true,
  logger,
  queueManager,
  appSessionId
}) {
  try {
    const [queueSet, queueReqv] = queueManager.getQueues(appSessionId, measurementId);
     
    const stepsDone = [];
    // send stop message if required
    if (sendMessage) {
      const { channelPost } = serviceState.channelMap[measurementId];
      
      const message = { chromaState: 'stop' };
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
    channelGet.on('close', () => logger.warn('CHANNEL close event fired'));
    channelGet.on('error', err => logger.error('CHANNEL error', err));
    channelGet.connection.on('close', () => logger.warn('CONNECTION close event fired'));
    channelGet.connection.on('error', err => logger.error('CONNECTION error', err));

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

      try {
        await channelGet.close(); // might be cleared already
      } catch (error) {
        logger.warn('close failed (channel already dead)', err.message);
      }

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
  let qSetInfo = await channelPost.assertQueue(qSet, { passive: true });
  let qReqvInfo = await channelPost.assertQueue(qReqv, { passive: true });

  while (qSetInfo.consumerCount || qReqvInfo.consumerCount) {
    await sleep(1000);
    qSetInfo = await channelPost.assertQueue(qSet, { passive: true });
    console.log(`На очереди ${qSetInfo.queue} сейчас ${qSetInfo.consumerCount} консьюмеров.`, qSetInfo);
    qReqvInfo = await channelPost.assertQueue(qReqv, { passive: true });
    console.log(`На очереди ${qReqvInfo.queue} сейчас ${qReqvInfo.consumerCount} консьюмеров.`, qReqvInfo);
  }

  await queueManager.deleteQueuesByBase(sessionId, measurementId);

  try {
    await channelPost.close(); // might be cleared already
  } catch (error) {
    logger.warn('close channelPost failed (channel already dead)', error.message);
  }  
  
  delete serviceState.channelMap[measurementId].channelPost;
  logger.warn(`Hard-cleaned measurement ${measurementId}`);

  removeDataState(measurementId);
  delete serviceState.consumerTags[measurementId];
  delete serviceState.pollingIntervals[measurementId];
  delete serviceState.channelMap[measurementId];
}

async function closeMeasurement({
  measurementId,
  needsToSave = false,
  isAutoControlled = false,
  alteredData,
  logger,
  queueManager,
  appSessionId,
}) {
  try {
    // wait for resolvers if needed
    if (!isAutoControlled) {
      const settled = await waitForResolversToSettle(measurementId, 6000);
      if (!settled) {
        logger.warn(`Timeout waiting for resolvers for ${measurementId}`);
        const {queueReqv} = queueManager.getQueues(appSessionId, measurementId);
        await stopConsumer(queueReqv, logger);
      }
    }

    clearDataState(measurementId);

    const [queueSet] = queueManager.getQueues(appSessionId, 'main');

    // send close message
    const message = {
      operation: 'closeMeasurChrom',
      measurementName: measurementId,
      chromaState: 'close',
      save: needsToSave,
      ...(needsToSave && { alteredData }),
    };
    const { channelPost } = serviceState.channelMap[measurementId];
    logger.info(`Sending close to ${queueSet}: ${JSON.stringify(message)}`);
    channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));

    if (!isAutoControlled) {
      await cleanupMeasurementInternals(measurementId, logger, queueManager, appSessionId);
    } else {
      logger.warn(`Measurement ${measurementId} closed without full cleanup (auto-controlled session).`);
    }
  } catch (error) {
    logger.error(`Failed to close measurement ${measurementId}: ${error.message}`);
    throw error;
  }
}

async function startListeningChroma({
  sessionId,
  measurementName,
  logger,
  queueManager,
  onFinishObj: { onFinish, isAsync = false } = {},
}) {
  // init data container for this measurement
  initDataState(measurementName);

  const [queueSet, queueReqv] = queueManager.getQueues(sessionId, measurementName);
  const measurementChannelGet = await createChannel();
  const { channelPost } = serviceState.channelMap[measurementName];
  serviceState.channelMap[measurementName].measurementChannelGet = measurementChannelGet;

  const { consumerTag } = await measurementChannelGet.consume(queueReqv, async (data) => {
    if (!data) {
      logger.warn(`Received bad chroma message: ${data} message from queue ${queueReqv}`);
      return;
    }

    try {
      const jsonString = data.content.toString();
      const jsonData = JSON.parse(jsonString);
      logger.info(`Consumed from '${queueReqv}': ${JSON.stringify(jsonData)}`);

      const ds = dataState[measurementName];
      const {
        measuredChromatogram: { x: mx, y: my } = {},
        signalPhoto: { x: spx, y: spy } = {},
        signalRef: { x: srx, y: sry } = {},
        activeStep: newActiveStep,
        status: newStatus,
        isAfterUpdate: newIsAfterUpdate = false,
        activeStepPumpProgram: newPumpProgramStage = -1,
        photoParams: newPhotoParams = {},
        referenceParams: newReferenceParams = {},
        mainParams: newMainParams = {},
      } = jsonData;

      // update params if present
      if (Object.keys(newPhotoParams).length) ds.photoParams = newPhotoParams;
      if (Object.keys(newReferenceParams).length) ds.referenceParams = newReferenceParams;
      if (Object.keys(newMainParams).length) ds.mainParams = newMainParams;

      if (newIsAfterUpdate) {
        clearDataState(measurementName);
        dataState[measurementName].isAfterUpdate = true;
      }

      validateArrayPointWithFallback(ds.measuredChromatogram.x, mx, 'measurementX', logger);
      validateArrayPointWithFallback(ds.measuredChromatogram.y, my, 'measurementY', logger);
      validateArrayPointWithFallback(ds.signalPhoto.x, spx, 'signalPhotoX', logger);
      validateArrayPointWithFallback(ds.signalPhoto.y, spy, 'signalPhotoY', logger);
      validateArrayPointWithFallback(ds.signalRef.x, srx, 'signalRefX', logger);
      validateArrayPointWithFallback(ds.signalRef.y, sry, 'signalRefY', logger);

      ds.activeStep = validateNumericValue(newActiveStep, 'activeStep', logger, ds.activeStep);
      ds.pumpProgramStage = validateNumericValue(newPumpProgramStage, 'pumpProgramStage', logger, ds.pumpProgramStage);
      ds.status = validateStrValue(newStatus, 'status', logger, ds.status);

      measurementChannelGet.ack(data);

      if (newStatus === 'finished') {
        ds.status = newStatus;
        if (onFinish) {
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

  serviceState.consumerTags[measurementName] = consumerTag;

  // start polling
  const intervalId = setInterval(() => {
    const msg = { chromaState: 'get_state' };
    logger.info(`Polling '${queueSet}': ${JSON.stringify(msg)}`);
    channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(msg)));
  }, 1000);

  serviceState.pollingIntervals[measurementName] = intervalId;
}

module.exports = {
  startListeningChroma,
  stopMeasurement,
  closeMeasurement,
  clearDataState,
  cleanupMeasurementInternals,
  serviceState,
  dataState,
};
