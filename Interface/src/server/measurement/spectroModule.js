const express = require('express');
const { createChannel } = require('../services/connectRabbitMQ');
const {
  startListeningSpectro, serviceState, dataState, clearDataState, stopMeasurement, closeSpectroMeasurement, sendOperationMessage, registerEscapeHatch, isMeasurementRunning, resumePolling, pausePolling,
} = require('./spectroLifecycle');
const { waitForResponse } = require('../services/resolver');
const { assertSessionQueues } = require('../services/sessionQueuesHelpers');

const router = express.Router();

let channelPost;

let logger;
let queueManager;
const environment = process.env.NODE_ENV || 'production';

router.post('/start', async (req, res) => {
  try {
    const { measurementId, detectorProg, sourceId = null } = req.body;
    console.log('recived start spectro', measurementId, detectorProg, sourceId);

    const measurementChannelPost = await createChannel();
    serviceState.channelMap[measurementId] = { channelPost: measurementChannelPost };

    const operation = 'startMeasurSpectr';
    const { sessionId, queueSet, queueReqv } = await assertSessionQueues(req, queueManager, measurementId, logger);
    const { queueSet: mainQueueSet } = await assertSessionQueues(req, queueManager, 'main', logger);
    
    console.log('sessionId', sessionId)

    const queueNames = [queueSet, queueReqv];

    const initQueuesParamsMessage = {
      operation,
      measurementName: measurementId,
      queueNames,
    };
    const logMsgMain = `Sending to queue ${mainQueueSet} from POST /spectro/start: ${JSON.stringify(initQueuesParamsMessage)}`;
    await channelPost.sendToQueue(mainQueueSet, Buffer.from(JSON.stringify(initQueuesParamsMessage)));
    logger.warn(logMsgMain);

    const onFinish = async () => await stopMeasurement({
      measurementId,
      logger,
      queueManager,
      sessionId,
      sendMessage: false,
    });

    if (sourceId) {
      await measurementChannelPost.purgeQueue(queueSet);
      await measurementChannelPost.purgeQueue(queueReqv);

      const restartOperation = 'importDataFromFile';
      const restartMessage = {
        operation: restartOperation,
        fileId: sourceId,
      };

      await channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(restartMessage)));
      logger.warn(JSON.stringify(restartMessage));

      const response = await waitForResponse(
        queueReqv,
        restartOperation,
        logger,
        null,
        { id: measurementId },
      );

      logger.warn(JSON.stringify(response));

      if (!response?.success) res.status(500).end();
    }

    const onFinishObj = { onFinish, isAsync: true };
    startListeningSpectro({
      measurementId, logger, queueManager, sessionId, onFinishObj,
    });

    const measurementProgMessage = {
      operation: 'setDetectorProg',
      detectorProg,
    };

    await measurementChannelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(measurementProgMessage)));
    logger.warn(`Started measurement ${measurementId}`);
    const logMsgSet = `Sending to queue '${queueSet}' from POST /spectro/start: ${JSON.stringify(measurementProgMessage)}`;
    logger.warn(logMsgSet);

    res.json({ message: 'Measurement started successfully' });
  } catch (error) {
    logger.error(`Error in /spectro/start: ${error.message}`, error);
    return res.status(500).json({
      error: 'Failed to start measurement',
      details: error.message,
    });
  }
  
});

router.get('/listen', async (req, res) => {
  const { tabId } = req.query;
  const response = dataState[tabId];
  
  res.json(response);
  clearDataState(tabId);
});

async function sendSpectroControlMessage(
  measurementId,
  queueNameSet,
  measurementChannelPost,
  operation,
  msg,
) {
  try {
    if (!measurementChannelPost) {
      logger.error(
        `No channel found for measurement ${measurementId} in /spectro/${operation}`,
      );
      return false;
    }

    await measurementChannelPost.sendToQueue(
      queueNameSet,
      Buffer.from(JSON.stringify(msg)),
    );

    logger.warn(
      `[${measurementId}] Sent '${operation}' to '${queueNameSet}': ${JSON.stringify(msg)}`,
    );

    return true;
  } catch (err) {
    logger.error(
      `[${measurementId}] Failed to send '${operation}' to '${queueNameSet}':`,
      err,
    );
    return false;
  }
}

router.post('/changeScaling', async (req, res) => {
  try {
    const { measurementId, isChecked } = req.body;
    const { sessionId, queueSet, queueReqv } = await assertSessionQueues(req, queueManager, measurementId, logger);

    const msg = {
      operation: 'changeScaling',
      isScalingCheck: isChecked,
    };

    const ok = await sendSpectroControlMessage(
      measurementId,
      queueSet,
      channelPost,
      'changeScaling',
      msg,
    );

    if (!ok) {
      return res.status(500).json({ error: 'Failed to send scaling command' });
    }

    const response = await waitForResponse(
      queueReqv,
      'changeScaling',
      logger,
      null,
      { id: measurementId },
    );

    console.log(JSON.stringify(response));
    const { processedCurves } = response;

    return res.json({
      message: 'Scaling changed for spectro successfully',
      updatedData: processedCurves,
    });
  } catch (err) {
    logger.error('Error in /changeScaling:', err);
    return res.status(500).json({ error: 'Failed to change scaling' });
  }
});

router.post('/changeSmoothing', async (req, res) => {
  try {
    const {
      measurementId, isChecked, threshold, factor,
    } = req.body;
    const { sessionId, queueSet, queueReqv } = await assertSessionQueues(req, queueManager, measurementId, logger);

    const msg = {
      operation: 'changeSmoothingParams',
      smoothingLevel: threshold,
      smoothingFactor: factor,
      isSmoothingCheck: isChecked,
    };

    const ok = await sendSpectroControlMessage(
      measurementId,
      queueSet,
      channelPost,
      'changeSmoothingParams',
      msg,
    );

    if (!ok) {
      return res.status(500).json({ error: 'Failed to send smoothing command' });
    }

    const response = await waitForResponse(
      queueReqv,
      'changeSmoothingParams',
      logger,
      null,
      { id: measurementId },
    );

    console.log(JSON.stringify(response));

    const { processedCurves } = response;

    return res.json({
      message: 'Smoothing parameters for spectro updated successfully',
      updatedData: processedCurves,
    });
  } catch (err) {
    logger.error('Error in /changeSmoothing:', err);
    return res.status(500).json({ error: 'Failed to change smoothing params' });
  }
});

router.post('/close', async (req, res) => {
  const { measurementId, needsToSave = false, sourcePath = null, dataToSave = {} } = req.body;
  try {
    const { sessionId } = await assertSessionQueues(req, queueManager, measurementId, logger);

    if (!measurementId) {
      return res.status(400).json({ error: 'measurementId is required' });
    }

    console.log('closing session',sessionId)

    logger.warn(
      `Received POST /spectro/close for '${measurementId}' (needsToSave=${needsToSave})`,
    );

    const closeMessage = {
      operation: 'closeMeasurSpectr',
      measurementName: measurementId,
      save: needsToSave,
      sourcePath,
      ...dataToSave,
    }; 


    await closeSpectroMeasurement({
      measurementId,
      closeMessage,
      logger,
      queueManager,
      sessionId,
    });

    return res.status(200).json({ message: 'Measurement closed successfully' });
  } catch (err) {
    logger.error(`Error closing spectro '${measurementId}': ${err.message}`);
    return res.status(500).json({
      error: 'Failed to close measurement',
      details: err.message,
    });
  }
});

router.post('/save', async (req, res) => {
  const { measurementId, needsToSave = true, sourcePath = null, dataToSave = {} } = req.body;
  const { sessionId, queueSet, queueReqv } = await assertSessionQueues(req, queueManager, measurementId, logger);

  if (!measurementId) {
    return res.status(400).json({ error: 'measurementId is required' });
  }

  logger.warn(
    `Received POST /spectro/save for '${measurementId}'`,
  );

  const message = {
    operation: 'saveMeasurSpectr',
    measurementName: measurementId,
    save: needsToSave,
    sourcePath,
    ...dataToSave,
  };

  logger.info(`saving spectro in ${queueSet} ${JSON.stringify(message)}`)

  try { 
    channelPost.sendToQueue(
      queueSet,
      Buffer.from(JSON.stringify(message)),
    );

    return res.status(200).json({ message: 'Measurement saved successfully' });
  } catch (err) {
    logger.error(`Error closing spectro '${measurementId}': ${err.message}`);
    return res.status(500).json({
      error: 'Failed to save measurement',
      details: err.message,
    });
  }
});

router.post('/deleteCurve', async (req, res) => {
  try {
    const { measurementId, curveIndex } = req.body;

    if (!measurementId || curveIndex === undefined) {
      return res.status(400).json({
        error: 'measurementId and curveIndex are required',
      });
    }

    const { sessionId, queueSet, queueReqv } = await assertSessionQueues(req, queueManager, measurementId, logger);

    const operation = 'deleteSpectroCurve';

    const msg = {
      operation,
      curveIndex: Number(curveIndex),
    };

    // Send request to device
    const ok = await sendSpectroControlMessage(
      measurementId,
      queueSet,
      channelPost,
      operation,
      msg,
    );

    if (!ok) {
      return res
        .status(500)
        .json({ error: 'Failed to send deleteSpectroCurve command' });
    }

    // Wait for device response
    const response = await waitForResponse(
      queueReqv,
      operation,
      logger,
      null,
      { id: measurementId },
    );

    logger.info(
      `[${measurementId}] deleteCurve response: ${JSON.stringify(response)}`,
    );

    const { processedCurves } = response;

    return res.json({
      message: 'Curve deleted successfully',
      updatedData: processedCurves,
    });
  } catch (err) {
    logger.error('Error in /spectro/deleteCurve:', err);
    return res.status(500).json({ error: 'Failed to delete curve' });
  }
});

router.post('/changeBackground', async (req, res) => {
  try {
    const {
      measurementId, backgroundIndex, isSmoothingCheck, isScalingCheck,
    } = req.body;

    if (!measurementId) {
      return res.status(400).json({ error: 'measurementId is required' });
    }

    const { sessionId, queueSet, queueReqv } = await assertSessionQueues(req, queueManager, measurementId, logger);

    const operation = 'changeBackgroundSpectre';

    const msg = {
      operation,
      backgroundIndex,
      isSmoothingCheck,
      isScalingCheck,
    };

    // Send request to spectro device
    const ok = await sendSpectroControlMessage(
      measurementId,
      queueSet,
      channelPost,
      operation,
      msg,
    );

    if (!ok) {
      return res.status(500).json({
        error: 'Failed to send changeBackground command',
      });
    }

    // Wait for device ack
    const response = await waitForResponse(
      queueReqv,
      operation,
      logger,
      null,
      { id: measurementId },
    );

    logger.info(
      `[${measurementId}] changeBackground response: ${JSON.stringify(response)}`,
    );

    const { processedCurves } = response;

    return res.json({
      message: 'Background index changed successfully',
      updatedData: processedCurves,
    });
  } catch (err) {
    logger.error('Error in /spectro/changeBackground:', err);
    return res.status(500).json({
      error: 'Failed to change background index',
    });
  }
});

router.post('/stop', async (req, res) => {
  try {
    const { measurementId } = req.body;

    if (!measurementId) {
      return res.status(400).json({ error: 'measurementId is required' });
    }

    logger.info(`[${measurementId}] Received POST /spectro/stop`);

    const { sessionId, queueSet, queueReqv } = await assertSessionQueues(req, queueManager, measurementId, logger);

    const operation = 'stopMeasurSpectr';

    await sendOperationMessage({
      measurementId,
      operation,
      logger,
      queueManager,
      serviceState,
      sessionId
    });

    logger.warn(`[${measurementId}] Spectro measurement stopping initiated`);

    return res.json({
      message: 'Spectro measurement stopping initiated',
    });
  } catch (err) {
    logger.error(`Error in /spectro/stop: ${err.message}`);
    return res.status(500).json({
      error: 'Failed to stop spectro measurement',
      details: err.message,
    });
  }
});

router.post('/changeCorrection', async (req, res) => {
  const { measurementId, correction, isMeasuring: clientIsMeasuring } = req.body;

  logger.warn(`[${measurementId}] /changeCorrection correction='${correction}'`);

  try {
    if (!measurementId) {
      logger.error('Missing measurementId');
      return res.status(400).json({ error: 'measurementId is required' });
    }

    const { sessionId, queueSet, queueReqv } = await assertSessionQueues(req, queueManager, measurementId, logger);

    const operation = 'changeCorrection';

    // SERVER-SIDE CHECK (supersedes client info)
    const serverIsMeasuring = isMeasurementRunning(measurementId);

    const isMeasuring = clientIsMeasuring || serverIsMeasuring;

    // Always pause polling if running
    let pollingWasActive = false;
    if (isMeasuring) {
      pollingWasActive = pausePolling(measurementId);
      logger.warn(`[${measurementId}] Polling paused for correction`);
    }

    logger.warn(
      `[${measurementId}] changeCorrection: isMeasuring(client=${clientIsMeasuring}, server=${serverIsMeasuring}) → final=${isMeasuring}`,
    );

    const msg = { operation, correction };

    let hatchPromise;
    if (isMeasuring) {
      // register BEFORE sending
      hatchPromise = registerEscapeHatch(measurementId, operation);
    }

    // ALWAYS SEND THE REQUEST
    const ok = await sendSpectroControlMessage(
      measurementId,
      queueSet,
      channelPost,
      operation,
      msg,
    );

    if (!ok) {
      logger.error(
        `[${measurementId}] Sending '${operation}' failed`,
      );
      return res.status(500).json({ error: 'send failed' });
    }

    let response;

    if (isMeasuring) {
      logger.info(
        `[${measurementId}] Using escape hatch for running measurement`,
      );

      response = await hatchPromise;

      logger.info(
        `[${measurementId}] Escape hatch resolved: ${JSON.stringify(response)}`,
      );
      // resume polling AFTER correction is fully applied
      resumePolling(measurementId, queueSet);
      logger.warn(`[${measurementId}] Polling resumed after correction`);
    } else {
      logger.info(
        `[${measurementId}] Using waitForResponse (measurement not running)`,
      );
      response = await waitForResponse(
        queueReqv,
        operation,
        logger,
        null,
        { id: measurementId },
      );
    }

    return res.json({
      message: `Correction updated successfully (${isMeasuring ? 'running' : 'idle'})`,
      curve: response.curve,
    });
  } catch (err) {
    logger.error(`Error in /spectro/changeCorrection: ${err.message}`, err);

    if (serviceState.escapeHatch?.[measurementId]) {
      logger.error(`[${measurementId}] Cleaning stale escape hatch due to error`);
      delete serviceState.escapeHatch[measurementId];
    }

    return res.status(500).json({ error: 'Failed to change correction' });
  }
});

const sendSaveAsSpectroMessage = async ({
  measurementId,
  filePath,
  dataToSave,
  logger,
  channelPost,
  sessionId
}) => {
  const [queueSet] = queueManager.getQueues(sessionId, measurementId);

  const message = {
    operation: 'saveMeasurSpectrAs',
    measurementName: measurementId,
    filePath,
    ...dataToSave,
  };

  logger.info(
    `Sending save-as spectro to '${queueSet}': ${JSON.stringify(message)}`,
  );

  channelPost.sendToQueue(
    queueSet,
    Buffer.from(JSON.stringify(message)),
  );
};

router.post('/save-as', async (req, res) => {
  const { measurementId, filePath, dataToSave = {} } = req.body;

  if (!measurementId || !filePath) {
    return res.status(400).json({
      error: 'measurementId and filePath are required',
    });
  }

  const { sessionId } = await assertSessionQueues(req, queueManager, measurementId, logger);

  logger.warn(
    `Received POST /spectro/save-as for '${measurementId}' -> ${filePath}`,
  );

  try {
    await sendSaveAsSpectroMessage({
      measurementId,
      filePath,
      dataToSave,
      logger,
      channelPost,
      sessionId
    });

    return res.status(200).json({
      message: 'Spectro measurement save-as requested',
      measurementId,
      filePath,
    });
  } catch (err) {
    logger.error(
      `Error save-as spectro '${measurementId}': ${err.message}`,
    );
    return res.status(500).json({
      error: 'Failed to save-as spectro measurement',
      details: err.message,
    });
  }
});

module.exports = (getChannelPost, loggerInstance, queueManagerInstance) => {
  channelPost = getChannelPost();
  logger = loggerInstance;
  queueManager = queueManagerInstance;
  return router;
};
