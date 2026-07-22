const express = require('express');
const fs = require('fs');
const { createChannel } = require('../services/connectRabbitMQ');
const {
  validateArrayPointWithFallback, validateNumericValue, validateStrValue, sleep,
} = require('../services/utils');
const {
  createUpdateTabParams, createUpdateMarkers, createChangeAveragingHandler, createUpdateSmoothingParams, createUpdatePeakIdParams,
} = require('../commonFileMeasActions/common');
const { stopConsumer, waitForResolversToSettle, waitForResponse } = require('../services/resolver');
const { assertSessionQueues, resolveSessionQueues } = require('../services/sessionQueuesHelpers');

const chromaDataManager = require('./ChromaSessionDataManager');
const { log } = require('console');

const router = express.Router();

let channelPost;
let logger;
let queueManager;
const environment = process.env.NODE_ENV || 'production';

function wrapWithPendingMarkerFlag(handler) {
  return async (req, res) => {
    const { tabId: measurementName, responseWithStream } = req.body || {};

    try {
      const { sessionId } = resolveSessionQueues(req, queueManager, measurementName, logger);
      // Если пришёл запрос, который должен уйти в stream
      if (measurementName && responseWithStream) {
        chromaDataManager.setPendingMarker(sessionId, measurementName, true)
        logger.info(`pendingMarkers[${measurementName}] set TRUE (responseWithStream)`);
      }

      return await handler(req, res);
    } catch (err) {
      throw err;
    }
  };
}

async function waitForPendingClear(sessionId, measurementName, timeout = 5000) {
  const start = Date.now();
  while (chromaDataManager.getPendingMarker(sessionId, measurementName)) {
    if (Date.now() - start > timeout) {
      logger.warn(`Timeout while waiting pendingMarkers[${measurementName}] for session ${sessionId}`);
      return false;
    }
    await sleep(100);
  }
  return true;
}

const cancelConsumingMeasure = async (sessionId, measurementName) => {
  return await chromaDataManager.cancelConsumingMeasure(sessionId, measurementName);
};

const clearPointDataFromBatches = (sessionId, measurementName) => {
  chromaDataManager.clearPointDataFromBatches(sessionId, measurementName);
};

const clearPointsOnly = (sessionId, measurementName) => {
  chromaDataManager.clearPointsOnly(sessionId, measurementName);
};

const sendStopMessage = (queueSet) => {
  const message = { operation: 'stop' };
  const logMsg = `Sending to queue '${queueSet}' from POST /chroma/stop: ${JSON.stringify(message)}`;
  logger.info(logMsg);
  channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));
};

const sendCloseMessage = (sessionId, measurementName, needsToSave, alteredData, queueSet) => {

  const message = {
    operation: 'closeMeasurChrom',
    measurementName,
    save: needsToSave,
    ...(needsToSave && { alteredData }),
  };
  const logMsg = `Sending to queue '${queueSet}' from POST /chroma/close: ${JSON.stringify(message)}`;
  logger.info(logMsg);

  channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));
};

const stopMeasurement = async ({ measurementName, queueManager, sessionId, sendMessage = true, purgeQueues = true }) => {
  try {
    const queues = queueManager.getQueues(sessionId, measurementName);
    const [queueSet, queueReqv] = queues;
    // don't clear on stop we need last batch to hit the site
    if (sendMessage) sendStopMessage(queueSet);
    
    chromaDataManager.cancelPollingInterval(sessionId, measurementName);

    await waitForPendingClear(sessionId, measurementName); 

    const cancelConsumingMeasureResult = await cancelConsumingMeasure(sessionId, measurementName);

    logger.warn(`cancelConsumingMeasure result for session ${sessionId}, measurement ${measurementName}: ${cancelConsumingMeasureResult}`);

    await new Promise(resolve => setImmediate(resolve)); // ensure all pending operations are processed before we check for the channel

    const measurementChannelGet = chromaDataManager.getChannel(sessionId, measurementName, 'measurementChannelGet');
    if (measurementChannelGet) {     
      if (purgeQueues) {
        try {
          await measurementChannelGet.purgeQueue(queueReqv);
        } catch (err) {
          logger.warn('purge failed (probably already closed)', err.message);
        }
      }
        
      logger.warn(`Closing channel for session ${sessionId} and measurement ${measurementName}`);
      try {
        await measurementChannelGet.close();
      } catch (err) {
        logger.warn('close failed (channel already dead)', err.message);
      }
      logger.warn(`Channel closed for session ${sessionId} and measurement ${measurementName}`);
      chromaDataManager.removeChannel(sessionId, measurementName, 'measurementChannelGet');
    }
    
    logger.warn(`Stopped measurement on ${queueReqv} ${sendMessage ? 'by' : 'without'} sending stop message ${measurementName}`);
    return true;
  } catch (error) {
    logger.error(`Failed to stop measurement ${measurementName}: ${error.message}`);
    throw error;
  }
};

const closeMeasurement = async ({ measurementName, queueManager, sessionId, needsToStop = false, needsToSave = false, alteredData = {} }) => {
  try {
    logger.warn(`Closing measurement ${measurementName} for session ${sessionId} with needsToSave=${needsToSave}`);
    const  [queueSet, queueReqv] = queueManager.getQueues(sessionId, measurementName);
    if (needsToStop) {
      const needsToSendStopMessage = false;
      await stopMeasurement({ measurementName, queueManager, sessionId, sendMessage: needsToSendStopMessage, purgeQueues: false }); // false allows to not purge queues for straglers to arrive
    }

    const hasConsumersResolved = await waitForResolversToSettle(measurementName, 6000);
    if (!hasConsumersResolved) {
      logger.warn(`Timeout while waiting for resolverMap to settle for ${measurementName}`);
      await stopConsumer(queueReqv, logger);
    }



    sendCloseMessage(sessionId, measurementName, needsToSave, alteredData, queueSet);

    if (channelPost) {
      let q_set_info = await channelPost.assertQueue(queueSet, { passive: true });
      console.log(`На очереди ${q_set_info.queue} сейчас ${q_set_info.consumerCount} консьюмеров.`, q_set_info);
      
      let q_reqv_info = await channelPost.assertQueue(queueReqv, { passive: true });
      console.log(`На очереди ${q_reqv_info.queue} сейчас ${q_reqv_info.consumerCount} консьюмеров.`, q_reqv_info);

      while (q_set_info.consumerCount) {
        await sleep(1000);
        try {
          q_set_info = await channelPost.assertQueue(queueSet, { passive: true });
          console.log(`На очереди ${q_set_info.queue} сейчас ${q_set_info.consumerCount} консьюмеров.`, q_set_info);
        } catch (error) {
           break; // очередь уже умерла
        }
      }

      while (q_reqv_info.consumerCount) {
        await sleep(1000);
       try {
         q_reqv_info = await channelPost.assertQueue(queueReqv, { passive: true });
         console.log(`На очереди ${q_reqv_info.queue} сейчас ${q_reqv_info.consumerCount} консьюмеров.`, q_reqv_info);
       } catch (error) {
         break; // очередь уже умерла
       }
      }
    }

    await queueManager.deleteQueuesByBase(sessionId, measurementName); // patch of backend weakness
    
    chromaDataManager.cleanupMeasurement(sessionId, measurementName);
    logger.warn(`Closed measurement ${measurementName} for session ${sessionId}`);
  } catch (error) {
    logger.error(`Failed to close measurement ${measurementName} for session ${sessionId}: ${error.message}`);
    throw error;
  }
};

async function startListeningChroma(sessionId, measurementName, queueSet, queueReqv) {
  chromaDataManager.clearStoredData(sessionId, measurementName, true);

  const measurementChannelGet = await createChannel();
  measurementChannelGet.on('close', () => logger.warn('CHANNEL close event fired'));
  measurementChannelGet.on('error', err => logger.error('CHANNEL error', err));
  measurementChannelGet.connection.on('close', () => logger.warn('CONNECTION close event fired'));
  measurementChannelGet.connection.on('error', err => logger.error('CONNECTION error', err));

  chromaDataManager.setChannel(sessionId, measurementName, 'measurementChannelGet', measurementChannelGet);
  
  const consumeResult = await measurementChannelGet.consume(queueReqv, async (data) => { // we need await here to receive consumer tag
    try {
      if (data === null) {
        logger.warn(`Consumer cancelled ${measurementName}`);
        chromaDataManager.removeConsumerTag(sessionId, measurementName);
        return;
      }

      if (!data) {
        logger.warn(`Received bad chroma message: ${data} message from queue ${queueReqv}`);
        return;
      }

      const jsonString = data.content.toString();
      const jsonData = JSON.parse(jsonString);

      if (jsonData.operation === 'updateMarker') {
        chromaDataManager.clearPendingMarker(sessionId, measurementName);
        logger.info(`pendingMarkers[${measurementName}] cleared by consumer for session ${sessionId}`);
      }

      const message = `Consumed message from '${queueReqv}' for session ${sessionId}: ${jsonString}`;
      logger.info(message);

      // Get measurement data from session storage
      const measurementData = chromaDataManager.getMeasurementData(sessionId, measurementName);

      const {
        measuredChromatogram: { x: measurementX, y: measurementY },
        signalPhoto: { x: signalPhotoX, y: signalPhotoY },
        signalRef: { x: signalRefX, y: signalRefY },
        activeStep: newActiveStep,
        status: newStatus,
        isAfterUpdate: newIsAfterUpdate = null,
        activeStepPumpProgram: newPumpProgramStage = -1,
        photoParams: newPhotoParams,
        referenceParams: newReferenceParams,
        mainParams: newMainParams,
      } = jsonData;

      const oldStatus = measurementData.status;

      if (newIsAfterUpdate) {
        clearPointDataFromBatches(sessionId, measurementName);
        clearPointsOnly(sessionId, measurementName);
        if (typeof newIsAfterUpdate !== 'boolean' && newIsAfterUpdate) logger.warn(`Is after update truthy but wrong type ${typeof newIsAfterUpdate}`);
        measurementData.isAfterUpdate = true;
      }

      const validStatus = validateStrValue(newStatus, 'status', logger, measurementData.status || '');

      if (!newIsAfterUpdate && validStatus !== oldStatus && validStatus !== '') { // change happend, so need to batch leftovers with old status
        if (oldStatus !== '') {
          // Add current state as a batch
          chromaDataManager.addBatch(sessionId, measurementName);
        }
      }
      measurementData.status = validStatus;

      if (Object.keys(newPhotoParams).length > 0) {
        measurementData.photoParams = newPhotoParams;
      }
      if (Object.keys(newReferenceParams).length > 0) {
        measurementData.referenceParams = newReferenceParams;
      }
      if (Object.keys(newMainParams).length > 0) {
        measurementData.mainParams = newMainParams;
      }

      // Use appendData method to add new points
      measurementData.appendData({
        measuredChromatogram: { x: measurementX, y: measurementY },
        signalPhoto: { x: signalPhotoX, y: signalPhotoY },
        signalRef: { x: signalRefX, y: signalRefY },
        activeStep: validateNumericValue(newActiveStep, 'activeStep', logger, measurementData.activeStep || 0),
        pumpProgramStage: validateNumericValue(newPumpProgramStage, 'pumpProgramStage', logger, measurementData.pumpProgramStage || 0),
      });

      measurementChannelGet.ack(data);

      if (validStatus === 'finished') {
        console.warn('finished -- stopping');
        const hasStopped = await stopMeasurement({ measurementName,sessionId, queueManager, sendMessage: false });
        console.warn(`${hasStopped} did stop`);
      }
    } catch (error) {
      logger.error(`Error processing message for session ${sessionId}, measurement ${measurementName}: ${error.message}`);
    }
  });

  chromaDataManager.setConsumerTag(sessionId, measurementName, consumeResult.consumerTag);

  const chromaPollingInterval = setInterval(() => {
    if (!channelPost) {      
      logger.error(`No channel post for session ${sessionId} and ${measurementName}`)
      return
    }
    const message = { operation: 'get_state' };
    const logMsg = `Polling ${queueSet}, measurement ${measurementName}`;
    logger.info(logMsg);
    channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));

  }, 1000);

  chromaDataManager.setPollingInterval(sessionId, measurementName, chromaPollingInterval);
}

router.post('/start', async (req, res) => {
  try {
    const { measurementParams, measurementParams: { measurementName } } = req.body;
    const { sessionId, queueSet, queueReqv } = await assertSessionQueues(req, queueManager, measurementName, logger);

    const measurementData = chromaDataManager.getMeasurementData(sessionId, measurementName, measurementParams);
    if (!measurementData) {
      logger.error(`Failed to get measurement data for ${measurementName} in session ${sessionId}`);
      throw new Error('Measurement data initialization failed');
    }

    const operation = 'startMeasurChrom';
    
    const initQueuesParamsMessage = {
      operation,
      measurementName,
      queueNames: [
        queueSet,
        queueReqv,
      ],
    };

    const { queueSet: mainQueueSet } = await assertSessionQueues(req, queueManager, 'main', logger);
    const logMsgMain = `Sending meas meta to queue ${mainQueueSet} from POST /chroma/start: ${JSON.stringify(initQueuesParamsMessage)}`;
    await channelPost.sendToQueue(mainQueueSet, Buffer.from(JSON.stringify(initQueuesParamsMessage)));
    logger.info(logMsgMain);

    startListeningChroma(sessionId, measurementName, queueSet, queueReqv);

    const measurementProgMessage = {
      operation: 'setMeasurementProg',
      ...measurementParams,
    };

    await channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(measurementProgMessage)));
    logger.warn(`Started measurement ${measurementName} for session ${sessionId}`);
    const logMsgSet = `Sending program to queue '${queueSet}' from POST /chroma/start: ${JSON.stringify(measurementProgMessage)}`;
    logger.info(logMsgSet);

    res.json({ message: 'Measurement started successfully' });
  } catch (error) {
    logger.error('Failed to start measurement:', error);
    res.status(500).json({ error: 'Failed to start measurement' });
  }
  
});

router.post('/stop', async (req, res) => {
  try {
    const { measurementName } = req.body;
    const { sessionId } = resolveSessionQueues(req, queueManager, measurementName, logger);

    await stopMeasurement({ measurementName, sessionId, queueManager, sendMessage: true });
    res.json({ message: 'Measurement stopped successfully' });
  } catch (error) {
    logger.error('Failed to stop measurement:', error);
    res.status(500).json({ error: 'Failed to stop measurement' });
  }
});

router.post('/close', async (req, res) => {
  try {
    const {
      measurementName, needsToStop, needsToSave, alteredData,
    } = req.body;
    const { sessionId } = resolveSessionQueues(req, queueManager, measurementName, logger);
    await closeMeasurement({ measurementName, sessionId, queueManager, needsToStop, needsToSave, alteredData });
    res.json({ message: 'Measurement closed successfully' });
  } catch (error) {
    logger.error('Failed to close measurement:', error);
    res.status(500).json({ error: 'Failed to close measurement' });
  }
});

const sendSaveAsMessage = (sessionId, queueSet, measurementName, filePath, alteredData) => {
  try {
      
    const message = {
      operation: 'saveMeasurChromAs',
      measurementName,
      filePath,
      alteredData,
    };
  
    const logMsg = `Sending to queue '${queueSet}' from POST /chroma/save-as: ${JSON.stringify(message)}`;
    logger.info(logMsg);
  
    channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));
  } catch (error) {
    logger.error(`Failed to send save-as message for measurement ${measurementName}: ${error.message}`);
    throw error;
  }
};

const saveMeasurementAs = async (sessionId, queueSet, measurementName, filePath, alteredData) => {
  try {
    sendSaveAsMessage(sessionId, queueSet, measurementName, filePath, alteredData);

    logger.warn(`Save-as requested for measurement ${measurementName} -> ${filePath}`);
  } catch (error) {
    logger.error(`Failed to save-as measurement ${measurementName}: ${error.message}`);
    throw error;
  }
};

router.post('/save-as', async (req, res) => {
  try {
    const { measurementName, filePath, alteredData } = req.body;
    const { sessionId, queueSet } = resolveSessionQueues(req, queueManager, measurementName, logger);

    await saveMeasurementAs(
      sessionId,
      queueSet,
      measurementName,
      filePath,
      alteredData,
    );

    res.json({
      message: 'Measurement save-as requested',
      sessionId,
      measurementName,
      filePath,
    });
  } catch (error) {
    logger.error('Failed to save measurement as:', error);
    res.status(500).json({
      error: 'Failed to save measurement as',
    });
  }
});

router.get('/listen', (req, res) => {
  const { sessionId, measurementName } = req.query;

  if (sessionId == null || !measurementName) {
    return res.status(400).json({ 
      error: 'Session ID and measurement name are required',
      hint: 'Add ?sessionId=xxx&measurementName=yyy to your request'
    });
  }

  try {
    const data = chromaDataManager.getDataForListen(sessionId, measurementName);
    
    if (data.isAfterUpdate) {
      logger.warn(`sending isAfterUpdate true for session ${sessionId}, measurement ${measurementName}`);
    }
    
    res.json(data);
  } catch (error) {
    logger.error(`Failed to get data for session ${sessionId}, measurement ${measurementName}:`, error);
    res.status(500).json({ error: 'Failed to retrieve measurement data' });
  }
});

router.post('/pressStart', async (req, res) => {
  try {
    const { measurementName } = req.body;
    const { sessionId, queueSet } = resolveSessionQueues(req, queueManager, measurementName, logger);
    logger.info(`Started from keybord {"operation":"startFromKeyboard"} ${measurementName} for session ${sessionId}`);

    channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify({ operation: 'startFromKeyboard' })));
    res.status(200).end();
  } catch (error) {
    logger.error(`Failed to start from keyboard for measurement ${measurementName}: ${error.message}`);
    res.status(500).json({ error: 'Failed to start from keyboard' });
  }
});

router.post('/updateProgram', async (req, res) => {
  try {
    const { measurementName, dataForUpd } = req.body;
    const { sessionId, queueSet } = resolveSessionQueues(req, queueManager, measurementName, logger);
    
    const updateMessage = {
      operation: 'updateDetectorProg',
      ...dataForUpd,
    };

    logger.info(`Update program ${measurementName} ${JSON.stringify(updateMessage)} for session ${sessionId}`);

    channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(updateMessage)));
    res.status(200).end();
  } catch (error) {
    logger.error(`Failed to update program for measurement ${measurementName}: ${error.message}`);
    res.status(500).json({ error: 'Failed to update program' });
  }
});

router.get('/getCalculated/:tabId', async (req, res) => {
  try {
    const { tabId: measurementName  } = req.params;

    const { sessionId, queueSet, queueReqv } = resolveSessionQueues(req, queueManager, measurementName, logger);
    
    const operation = 'getCalculatedCurve';
    const message = { operation };
    const logMsgSent = `Requesting calculatedCurve for ${measurementName}: ${JSON.stringify(message)}`;
    logger.info(logMsgSent);

    channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));
    const response = await waitForResponse(queueReqv, operation, logger, null, { id: measurementName });
    const logMsgMain = `Fetched calculatedCurve from ${queueReqv}: ${JSON.stringify(response)}`;
    logger.info(logMsgMain);
    const { calculatedChromatogram } = response;
    res.json({ calculatedChromatogram });
  } catch (error) {
    logger.error(`failed to fetch calculatedCurve from ${tabId}`, error);
    res.status(500).json({ error: 'Failed to retrieve calculatedCurve' });
  }
});

module.exports = (getChannelPost, loggerInstance, queueManagerInstance) => {
  channelPost = getChannelPost();
  logger = loggerInstance;
  queueManager = queueManagerInstance;

  const updateTabParams = createUpdateTabParams({
    logger: loggerInstance,
    channelPost: getChannelPost(),
    queueManager: queueManagerInstance,
  });

  const updateMarkers = wrapWithPendingMarkerFlag(
    createUpdateMarkers({
      logger: loggerInstance,
      channelPost: getChannelPost(),
      queueManager: queueManagerInstance,
    }),
  );

  router.post('/updateMeasParam', updateTabParams);
  router.post('/updateMarkers', updateMarkers);

  router.post('/changeAveraging', createChangeAveragingHandler({
    logger: loggerInstance,
    channelPost: getChannelPost(),
    queueManager: queueManagerInstance,
  }));

  router.post('/updateSmoothingParams', createUpdateSmoothingParams({
    logger: loggerInstance,
    channelPost: getChannelPost(),
    queueManager: queueManagerInstance,
  }));

  router.post('/updatePeakIdParams', createUpdatePeakIdParams({
    logger: loggerInstance,
    channelPost: getChannelPost(),
    queueManager: queueManagerInstance,
  }));

  return router;
};
