const express = require('express');
const { createChannel } = require('../services/connectRabbitMQ');
const { waitForResponse } = require('../services/resolver');
const { mockConfigData } = require('../mockData/mockConfig');

const deviceManager = require('../services/deviceManager');

const router = express.Router();

let queueManager;
let configChannel;
let channelPost;
let logger;
const environment = process.env.NODE_ENV || 'production';

const fetchConfig = async (queueReqv) => new Promise(async (resolve, reject) => {
  configChannel.prefetch(1);

  try {
    const consumeResultPromise = configChannel.consume(queueReqv, async (data) => {
      if (!data) {
        logger.warn(`Received bad config message: ${data} message from queue ${queueReqv}`);
        return;
      }
      try {
        const jsonString = data.content.toString();
        const configData = JSON.parse(jsonString);

        logger.warn(`Backend version: ${configData?.backendVersion}`);
        resolve(configData);

        configChannel.ack(data);
        logger.info(`Received message from ${queueReqv} activated by GET /config/fetch: ${jsonString}`);

        const consumeResult = await consumeResultPromise;
        configChannel.cancel(consumeResult.consumerTag);
      } catch (error) {
        reject(error);
        logger.error(`Failed to receive config: ${error.message}`);
        const consumeResult = await consumeResultPromise;
        configChannel.cancel(consumeResult.consumerTag);
      }
    });
  } catch (error) {
    logger.error(`Error setting up consumer for config: ${error.message}`);
    reject(error);
  }
});

router.get('/fetchConfig', async (req, res) => {
  const { sessionId, initSetup } = req.query;

  let queueSet, queueReqv;
  try {
    const queues = queueManager.getQueues(sessionId, 'configure');
    if (!queues || queues.length === 0) {
      return res.status(404).json({ error: 'No queues found for session' });
    }
    [queueSet, queueReqv] = queues;
  } catch (error) {
    logger.error(`Error fetching queues for session ${sessionId}: ${error.message}`);
    return res.status(440).json({ error: 'Failed to get queues for session' });
  }

  const message = { operation: 'getConfigure' };
  channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));
  logger.info(`Sending message to queue ${queueSet} activated by POST /config/fetch: ${JSON.stringify(message)}`);
  try {
    const config = environment === 'development' ? mockConfigData : await fetchConfig(queueReqv);

    const attemptedName = config.lastUsedChromatograph

    const chromaOwnCheck = deviceManager.checkChromatographAvailability(attemptedName, sessionId)

    if (initSetup === 'true' && chromaOwnCheck && chromaOwnCheck.available) { 
      const lastUsedChromaData = config.chromatographs[attemptedName]
      deviceManager.assignFromConfig(
        {
          chromatograph: {
            data: lastUsedChromaData,
            name: attemptedName,
            withoutControl: lastUsedChromaData.withoutControl
          }
        },
        sessionId
      );
      logger.warn(`Session ${sessionId} claimed devices from config during init. Current ownership: ${JSON.stringify(deviceManager.getDevicesBySession())}`);
    }
        
    res.json(config);
  } catch (error) {
    logger.error(`Failed fetching config for session ${sessionId}: ${error.message}`);
    logger.error(`Error details: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`);
    logger.error(`Stack trace: ${error.stack}`);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

router.post('/saveOperationalData', async (req, res) => {
  const { sessionId } = req.query;

  let queueSet, queueReqv;
  try {
    const queues = queueManager.getQueues(sessionId, 'main');
    if (!queues || queues.length === 0) {
      return res.status(404).json({ error: 'No queues found for session' });
    }
    [queueSet, queueReqv] = queues;
  } catch (error) {
    logger.error(`Error fetching queues for session ${sessionId}: ${error.message}`);
    return res.status(440).json({ error: 'Failed to get queues for session' });
  }

  const { type, save = false } = req.body;
  
  const operationTypeMap = {
    saveProtocol: 'saveExchangeProtocol',
    saveJournal: 'saveJournal',
  };
  const message = { operation: operationTypeMap[type], save };
  channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));
  logger.info(`Sending message to queue ${queueSet} activated by POST /config/saveOperationalData: ${JSON.stringify(message)}`);
  res.status(200).end();
});

router.post('/setConfigFolders', async (req, res) => {
  const { sessionId } = req.query;

  let queueSet, queueReqv;
  try {
    const queues = queueManager.getQueues(sessionId, 'configure');
    if (!queues || queues.length === 0) {
      return res.status(404).json({ error: 'No queues found for session' });
    }
    [queueSet, queueReqv] = queues;
  } catch (error) {
    logger.error(`Error fetching queues for session ${sessionId}: ${error.message}`);
    return res.status(440).json({ error: 'Failed to get queues for session' });
  }

  try {
    const { results, templates, temporary } = req.body ?? {};

    const operation = 'setConfigFolders'
    const message = {
      operation,
      folders: {
        results,
        templates,
        temporary,
      },
    };

    channelPost.sendToQueue(
      queueSet,
      Buffer.from(JSON.stringify(message)),
    );

    logger.warn(
      `Sending message to queue ${queueSet} activated by POST /config/setConfigFolders: ${JSON.stringify(message)}`,
    );

    const responseData = environment === 'development'
      ? { success: true }
      : await waitForResponse(
        queueReqv,
        operation,
        logger,
        null,
        { id: 'utilPollingId' },
      );

      console.log('FOLDERS', responseData)
    res.status(200).json(responseData);
  } catch (error) {
    logger.error(`Failed to set config folders: ${error.message}`);
    res.status(500).json({ error: 'Failed to set config folders' });
  }
});

module.exports = async (getChannelPost, loggerInstance, queueManagerInstance) => {
  configChannel = await createChannel();
  channelPost = getChannelPost();
  logger = loggerInstance;
  queueManager = queueManagerInstance
  return router;
};
