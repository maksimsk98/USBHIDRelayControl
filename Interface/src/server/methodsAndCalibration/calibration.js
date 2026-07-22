const express = require('express');

const router = express.Router();

const { createChannel } = require('../services/connectRabbitMQ');
const { waitForResponse } = require('../services/resolver');
const { mockCalibration } = require('../mockData/mockCalibration');
const { mockSelectCalibration } = require('../mockData/mockSelectCalibration');
const { resolveSessionQueues } = require('../services/sessionQueuesHelpers');

let queueManager;

let channelPost;
let logger;
const environment = process.env.NODE_ENV || 'production';

router.post('/viewCalibration', async (req, res) => {
  try {
    const {
      name, selectedMethod, chromaFileId, calibrationTabId,
    } = req.body;
    if (name === '' || name === undefined) res.status(200).end(); // catching falsy values
  
    const { sessionId, queueSet, queueReqv } = resolveSessionQueues(req, queueManager, 'main', logger)

    const operation = 'viewCalibration';
    const message = {
      operation, name, chromaFileId, selectedMethod,
    };
    channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));
    logger.info(`Sending message to queue ${queueSet} activated by POST /calibration/viewCalibration: ${JSON.stringify(message)}`);


    const fetchedCalibration = environment === 'development'
      ? mockCalibration
      : await waitForResponse(queueReqv, operation, logger, null, { id: calibrationTabId });
    res.status(200).json(fetchedCalibration);
  } catch (error) {
    logger.error(`Failed to choose calibration activated by POST /calibration/viewCalibration: ${error.message}`);
    res.status(500).end();
  }
});

router.post('/closeCalibration', async (req, res) => {
  try {
    const { name, chromaFileId, selectedMethod } = req.body;

    if (!name) {
      logger.error(`Missing params for /closeCalibration: name=${name}`);
      return res.status(400).json({ error: 'Missing calibration name' });
    }

    const { sessionId, queueSet, queueReqv } = resolveSessionQueues(req, queueManager, 'main', logger)

    const operation = 'closeCalibration';
    const message = { operation, name, chromaFileId, selectedMethod };

    channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));
    logger.info(`Sending message to queue ${queueSet} activated by POST /calibration/closeCalibration: ${JSON.stringify(message)}`);

    return res.status(200).end();
  } catch (error) {
    logger.error(`Failed to perform operation closeCalibration: ${error.message}`);
    return res.status(500).end();
  }
});

router.get('/confirmComponentEquality', async (req, res) => {
  try {
    const { calibrationName, tabId } = req.query;

    if (calibrationName === undefined || tabId === undefined) {
      logger.warn(`Missing params for /confirmComponentEquality: calibrationName=${calibrationName}, tabId=${tabId}`);
      return res.status(400).json({ error: 'Missing calibrationName or tabId' });
    }

    const operation = 'calibrationApplyCheck';
    const messageStr = JSON.stringify({
      operation,
      calibrationName,
    });

    const { sessionId, queueSet, queueReqv } = resolveSessionQueues(req, queueManager, tabId, logger)

    channelPost.sendToQueue(queueSet, Buffer.from(messageStr));
    logger.info(`Sending message to queue ${queueSet} for operation ${operation}: ${messageStr}`);

    let responseData;
    if (environment === 'development') {
      responseData = { namesComponentsSame: false, displayWarning: true };
    } else {
      // Expect updated peak table from measurement/file queue
      responseData = await waitForResponse(
        queueReqv,
        operation,
        logger,
        null,
        { id: tabId },
      );
    }

    res.json(responseData);
  } catch (error) {
    logger.error(`Failed to perform operation calibrationApplyCheck: ${error.message}`);
    res.status(500).end();
  }
});

router.post('/selectCalibration', async (req, res) => {
  const { name, tabId } = req.body;
  if (name === '' || name === undefined) {
    return res.status(200).json(null);
  }

  try {
    const { sessionId, queueSet, queueReqv } = resolveSessionQueues(req, queueManager, tabId, logger)

    const operation = 'selectCalibration';
    const message = { operation, name };
    channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));
    logger.info(
      `Sending message to queue ${queueSet} activated by POST /calibration/selectCalibration: ${JSON.stringify(message)}`,
    );

  
    res.status(200).end();
  } catch (error) {
    logger.error(`Failed to choose calibration activated by POST /calibration/selectCalibration: ${error.message}`);
    res.status(500).end();
  }
});

const handleCalibrationOperation = async (req, operation, calibrationData, originTabId, res) => {
  const messageStr = JSON.stringify({ operation, calibrationData });

  try {
    const { sessionId, queueSet, queueReqv } = resolveSessionQueues(req, queueManager, originTabId, logger)

    channelPost.sendToQueue(queueSet, Buffer.from(messageStr));
    logger.info(`Sending message to queue ${queueSet} for operation ${operation}: ${messageStr}`);
    const responseData = await waitForResponse(queueReqv, operation, logger, null, { id: originTabId });
    logger.info(`Recived message to queue ${queueReqv} for operation ${operation}: ${JSON.stringify(responseData)}`);
    res.json(responseData);
  } catch (error) {
    logger.error(`Failed to perform operation ${operation}: ${error.message}`);
    res.status(500).end();
  }
};

router.post('/addCalibration', async (req, res) => {
  const { calibrationData, originTabId } = req.body;
  await handleCalibrationOperation(req, 'addCalibration', calibrationData, originTabId, res);
});

router.post('/recalibrate', async (req, res) => {
  const { calibrationData, originTabId } = req.body;
  await handleCalibrationOperation(req, 'recalibrate', calibrationData, originTabId, res);
});

router.post('/addComponent', async (req, res) => {
  const { calibrationData, originTabId } = req.body;
  await handleCalibrationOperation(req, 'addComponent', calibrationData, originTabId, res);
});

router.post('/confirmAbleToAddLevel', async (req, res) => {
  const { name, originTabId, selectedMethod } = req.body;

  const operation = 'confirmAbleToAddLevel';
  const messageStr = JSON.stringify({ operation, name, selectedMethod });

  try {
    const { sessionId, queueSet, queueReqv } = resolveSessionQueues(req, queueManager, originTabId, logger)

    channelPost.sendToQueue(queueSet, Buffer.from(messageStr));
    logger.info(`Sending message to queue ${queueSet} for operation ${operation}: ${messageStr}`);
    const responseData = await waitForResponse(queueReqv, operation, logger, null, { id: originTabId });
    res.json(responseData);
  } catch (error) {
    logger.error(`Failed to perform operation ${operation}: ${error.message}`);
    res.status(500).end();
  }
});

router.post('/addLevel', async (req, res) => {
  const {
    levelData, originTabId, selectedCalibration, selectedMethod,
  } = req.body;

  try {
    const operation = 'addCalibrationLevel';
    const messageStr = JSON.stringify({
      operation,
      levelData,
      calibrationName: selectedCalibration,
      templateName: selectedMethod,
    });

    const { sessionId, queueSet, queueReqv } = resolveSessionQueues(req, queueManager, originTabId, logger)

    channelPost.sendToQueue(queueSet, Buffer.from(messageStr));
    logger.info(`Sending message to queue ${queueSet} for operation ${operation}: ${messageStr}`);
    const responseData = await waitForResponse(queueReqv, operation, logger, null, { id: originTabId });
    res.json(responseData);
  } catch (error) {
    logger.error(`Failed to perform operation ${operation}: ${error.message}`);
    res.status(500).end();
  }
});

// api doc is trolling me, so you have to bear with it also
router.post('/deleteCalib', async (req, res) => {
  const { name, selectedMethod, chromaFileId } = req.body;

  const operation = 'deleteCalibration';
  const messageStr = JSON.stringify({
    operation, name, selectedMethod, chromaFileId,
  });

  try {
    const { sessionId, queueSet, queueReqv } = resolveSessionQueues(req, queueManager, 'main', logger)

    channelPost.sendToQueue(queueSet, Buffer.from(messageStr));
    logger.info(`Sending message to queue ${queueSet} for operation ${operation}: ${messageStr}`);
    const responseData = await waitForResponse(queueReqv, operation, logger, null, { id: name });
    res.json(responseData);
  } catch (error) {
    logger.error(`Failed to perform operation ${operation}: ${error.message}`);
    res.status(500).end();
  }
});

router.post('/copyCalib', async (req, res) => {
  const {
    name, methodToAppendTo, sourceCalibration, sourceMethod, chromaFileId,
  } = req.body;

  const operation = 'addCopyCalibration';
  const messageStr = JSON.stringify({
    operation,
    name: sourceCalibration,
    newName: name,
    methodToAppendTo,
    chromaFileId,
    selectedMethod: sourceMethod,
  });

  try {
    const { sessionId, queueSet, queueReqv } = resolveSessionQueues(req, queueManager, 'main', logger)

    channelPost.sendToQueue(queueSet, Buffer.from(messageStr));
    logger.info(`Sending message to queue ${queueSet} for operation ${operation}: ${messageStr}`);
    const responseData = await waitForResponse(queueReqv, operation, logger, null, { id: name });
    res.json(responseData);
  } catch (error) {
    logger.error(`Failed to perform operation ${operation}: ${error.message}`);
    res.status(500).end();
  }
});

router.post('/activatePoint', async (req, res) => {
  const {
    substanceIndex,
    isActive,
    name,
    selectedMethod,
    pointIndex,
    chromaFileId,
  } = req.body;

  const operation = 'changePointActivity';
  const messageStr = JSON.stringify({
    operation,
    isActive,
    substanceIndex,
    name,
    chromaFileId,
    selectedMethod,
    pointIndex,
  });

  try {
    const { sessionId, queueSet, queueReqv } = resolveSessionQueues(req, queueManager, 'main', logger)

    channelPost.sendToQueue(queueSet, Buffer.from(messageStr));
    logger.info(`Sending message to queue ${queueSet} for operation ${operation}: ${messageStr}`);
    const responseData = await waitForResponse(queueReqv, operation, logger, null, { id: name });
    res.json(responseData);
  } catch (error) {
    logger.error(`Failed to perform operation ${operation}: ${error.message}`);
    res.status(500).end();
  }
});

router.post('/deleteCalibLevel', async (req, res) => {
  const {
    substanceIndex,
    name,
    selectedMethod,
    pointIndex,
    chromaFileId,
  } = req.body;

  const operation = 'deleteLevel';
  const messageStr = JSON.stringify({
    operation,
    substanceIndex,
    name,
    chromaFileId,
    selectedMethod,
    pointIndex,
  });

  try {
    const { sessionId, queueSet, queueReqv } = resolveSessionQueues(req, queueManager, 'main', logger)

    channelPost.sendToQueue(queueSet, Buffer.from(messageStr));
    logger.info(`Sending message to queue ${queueSet} for operation ${operation}: ${messageStr}`);
    const responseData = await waitForResponse(queueReqv, operation, logger, null, { id: name });
    res.json(responseData);
  } catch (error) {
    logger.error(`Failed to perform operation ${operation}: ${error.message}`);
    res.status(500).end();
  }
});

router.post('/editComponent', async (req, res) => {
  const {
    name,
    selectedMethod,
    newComponentsTimes,
    chromaFileId,
  } = req.body;

  const operation = 'editComponent';
  const messageStr = JSON.stringify({
    operation,
    name,
    selectedMethod,
    chromaFileId,
    newComponentsTimes,
  });

  try {
    const { sessionId, queueSet, queueReqv } = resolveSessionQueues(req, queueManager, 'main', logger)

    channelPost.sendToQueue(queueSet, Buffer.from(messageStr));
    logger.info(`Sending message to queue ${queueSet} for operation ${operation}: ${messageStr}`);
    const responseData = await waitForResponse(queueReqv, operation, logger, null, { id: name });
    res.json(responseData);
  } catch (error) {
    logger.error(`Failed to perform operation ${operation}: ${error.message}`);
    res.status(500).end();
  }
});

router.post('/deleteComponent', async (req, res) => {
  const {
    substanceIndex,
    name,
    selectedMethod,
    chromaFileId,
  } = req.body;

  const operation = 'deleteComponent';
  const messageStr = JSON.stringify({
    operation,
    substanceIndex,
    name,
    selectedMethod,
    chromaFileId,
  });

  try {
    const { sessionId, queueSet, queueReqv } = resolveSessionQueues(req, queueManager, 'main', logger)

    channelPost.sendToQueue(queueSet, Buffer.from(messageStr));
    logger.info(`Sending message to queue ${queueSet} for operation ${operation}: ${messageStr}`);
    const responseData = await waitForResponse(queueReqv, operation, logger, null, { id: name });
    res.json(responseData);
  } catch (error) {
    logger.error(`Failed to perform operation ${operation}: ${error.message}`);
    res.status(500).end();
  }
});

router.post('/apply', async (req, res) => {
  try {
    const { name, tabId } = req.body;

    if (!name || !tabId) {
      logger.warn(`Missing params for /apply: calibrationName=${name}, tabId=${tabId}`);
      return res.status(400).json({ error: 'Missing calibrationName or tabId' });
    }

    const operation = 'calibrationApply';
    const messageStr = JSON.stringify({
      operation,
      calibrationName: name,
    });

    // Tab-specific queues (FILE or MEASUREMENT)
    const { sessionId, queueSet, queueReqv } = resolveSessionQueues(req, queueManager, tabId, logger)

    channelPost.sendToQueue(queueSet, Buffer.from(messageStr));
    logger.info(`Sending message to queue ${queueSet} for operation ${operation}: ${messageStr}`);

    let responseData = {};
    if (environment === 'development') {
      responseData = defaultPeaks;
    } else {
      // Expect updated peak table from measurement/file queue
      responseData = await waitForResponse(
        queueReqv,
        operation,
        logger,
        null,
        { id: tabId },
      );
    }

    // backend returns updated peak table
    res.status(200).json(responseData);
  } catch (error) {
    logger.error(`Failed to perform calibrationApply: ${error.message}`);
    res.status(500).end();
  }
});

module.exports = async (getChannelPost, loggerInstance, queueManagerInstance) => {
  calibrationChannelGet = await createChannel();
  channelPost = getChannelPost();
  logger = loggerInstance;
  queueManager = queueManagerInstance
  return router;
};
