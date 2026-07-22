const express = require('express');
const { v1: uuidv1 } = require('uuid');

const router = express.Router();

const { createChannel } = require('../services/connectRabbitMQ');
const { waitForResponse } = require('../services/resolver');
const { mockNodesList } = require('../mockData/mockNodesList');

const deviceManager = require('../services/deviceManager'); //singleton instance to manage device state across routes

let queueManager;
let channelPost;
let logger;
const environment = process.env.NODE_ENV || 'production';

router.get('/fetchNodes', async (req, res) => {
  const { sessionId } = req.query;

  let queueSet, queueReqv;
  try {
    const queues = queueManager.getQueues(sessionId, 'nodes');
    if (!queues || queues.length === 0) {
      return res.status(404).json({ error: 'No queues found for session' });
    }
    [queueSet, queueReqv] = queues;
  } catch (error) {
    logger.error(`Error fetching queues for session ${sessionId}: ${error.message}`);
    return res.status(440).json({ error: 'Failed to get queues for session' });
  }

  const operation = 'getConnectedDevices';
  const message = { operation };
  channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));
  logger.info(`Sending message to queue ${queueSet} activated by GET /nodes/fetch: ${JSON.stringify(message)}`);
  let nodes;
  if (environment === 'development' ) {
    nodes = mockNodesList
  } else {
    nodes = await waitForResponse(queueReqv, operation, logger, null, { id: 'utilPollingId' });
  }

  logger.info(`Received nodes from backend, updating deviceManager: ${JSON.stringify(nodes)}`);
  deviceManager.updateSnapshot(nodes);

  const freeNodes = deviceManager.getAvailableView(sessionId);
  logger.info(`Returning available nodes to client for session ${sessionId}: ${JSON.stringify(freeNodes)}`);

  res.json(freeNodes);
});

router.post('/postConfig', async (req, res) => {
  const { sessionId } = req.query;

  let queueSet, queueReqv;
  try {
    const queues = queueManager.getQueues(sessionId, 'nodes');
    if (!queues || queues.length === 0) {
      return res.status(404).json({ error: 'No queues found for session' });
    }
    [queueSet, queueReqv] = queues;
  } catch (error) {
    logger.error(`Error fetching queues for session ${sessionId}: ${error.message}`);
    return res.status(440).json({ error: 'Failed to get queues for session' });
  }
  const configData = req.body;
  const operation = 'setNodesConfigure';
  const message = { operation, ...configData };
  channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));
  logger.info(`Sending message to queue ${queueSet} activated by POST /nodes/postConfig: ${JSON.stringify(message)}`);

  try {
    const { result, pumps } = await waitForResponse(queueReqv, operation, logger, null, { id: 'utilPollingId' });
    if (result === 'success') {
      deviceManager.assignFromConfig(configData, sessionId);
      logger.warn(`Session ${sessionId} claimed devices from config. Current ownership: ${JSON.stringify(deviceManager.getDevicesBySession())}`);
      res.status(200).json({ pumps });     
    } else {
      res.status(500).json({ error: 'Failed to set configuration on backend.' });
    }
  } catch (error) {
    logger.error(`Failed to process config message: ${error.message}`);
    res.status(500).json({ error: 'Failed to send config or receive confirmation' });
  }
});

router.get('/getFirmwareVersions', async (req, res) => {
  const { sessionId } = req.query;

  let queueSet, queueReqv;
  try {
    const queues = queueManager.getQueues(sessionId, 'nodes');
    if (!queues || queues.length === 0) {
      return res.status(404).json({ error: 'No queues found for session' });
    }
    [queueSet, queueReqv] = queues;
  } catch (error) {
    logger.error(`Error fetching queues for session ${sessionId}: ${error.message}`);
    return res.status(440).json({ error: 'Failed to get queues for session' });
  }

  const operation = 'getFirmwareVersions';
  const message = { operation };
  
  try {
    channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));
    logger.info(`Sending message to queue ${queueSet} activated by GET /config/getFirmwareVersions: ${JSON.stringify(message)}`);

    const operationId = `${operation}_${uuidv1()}`;
    const responseData = await waitForResponse(queueReqv, operation, logger, null, { id: operationId });
    res.json(responseData);
  } catch (error) {
    logger.error(`Failed to perform operation ${operation}: ${error.message}`);
    res.status(500).end();
  }
});

router.get('/getDetectorSerial', async (req, res) => {
  const { sessionId } = req.query;

  let queueSet, queueReqv;
  try {
    const queues = queueManager.getQueues(sessionId, 'nodes');
    if (!queues || queues.length === 0) {
      return res.status(404).json({ error: 'No queues found for session' });
    }
    [queueSet, queueReqv] = queues;
  } catch (error) {
    logger.error(`Error fetching queues for session ${sessionId}: ${error.message}`);
    return res.status(440).json({ error: 'Failed to get queues for session' });
  }

  const operation = 'getDetectorSerialNumber';
  const message = { operation };

  try {
    channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));
    logger.info(`Sending message to queue ${queueSet} activated by GET /config/getDetectorSerialNumber: ${JSON.stringify(message)}`);

    const operationId = `${operation}_${uuidv1()}`;
    const {detectorSerialNumber} = await waitForResponse(queueReqv, operation, logger, null, { id: operationId });

    res.json({detectorSerialNumber});
  } catch (error) {
    logger.error(`Failed to perform operation ${operation}: ${error.message}`);
    res.status(500).end();
  }
});

module.exports = async (getChannelPost, loggerInstance, queueManagerInstance) => {
  queueManager = queueManagerInstance
  configChannelGet = await createChannel();
  channelPost = getChannelPost();
  logger = loggerInstance;
  return router;
};
