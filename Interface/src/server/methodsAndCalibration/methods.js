const express = require('express');

const router = express.Router();

const { createChannel } = require('../services/connectRabbitMQ');
const { waitForResponse } = require('../services/resolver');
const { mockNullCalibrationList } = require('../mockData/mockCalibrationList');
const { mockIsocratMethod } = require('../mockData/mockIsocratMethod');
const { mockMethodsList } = require('../mockData/mockMethodsList');
const mockBareMethod = require('../mockData/mockBareMethod');
const { resolveSessionQueues } = require('../services/sessionQueuesHelpers');
const { mockDADMethod } = require('../mockData/mockDADMethod');

let queueManager;
let channelPost;
let logger;
const environment = process.env.NODE_ENV || 'production';

router.get('/fetchMethods', async (req, res) => {
  const operation = 'getTemplatesList';
  const message = { operation };

  try {
    const { sessionId, queueSet, queueReqv } = resolveSessionQueues(req, queueManager, 'main', logger)

    channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));
    logger.info(`Sending message to queue ${queueSet} activated by GET /methods/fetch: ${JSON.stringify(message)}`);

    const methods = environment === 'development' ? mockMethodsList : await waitForResponse(queueReqv, operation, logger, null, { id: 'utilPollingId' });
    res.json(methods);
  } catch (error) {
    logger.error(`Failed to fetch methods activated by GET /methods/fetch: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch methods' });
  }
});

router.post('/chooseMethod', async (req, res) => {
  let { name } = req.body;
  if (name === '' || name === undefined) name = null; // catching falsy values
  const operation = 'getTemplateByName';
  try {
    const { sessionId, queueSet, queueReqv } = resolveSessionQueues(req, queueManager, 'main', logger)

    const message = { operation, name };
    channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));
    logger.info(`Sending message to queue ${queueSet} activated by POST /methods/chooseMethod: ${JSON.stringify(message)}`);

    const responseData = environment === 'development'
      ? name
        ? mockDADMethod // mockIsocratMethod
        : mockNullCalibrationList
      : await waitForResponse(queueReqv, operation, logger, null, { id: 'utilPollingId' });

    res.status(200).json(responseData);
  } catch (error) {
    logger.error(`Failed to choose method activated by POST /methods/chooseMethod: ${error.message}`);
    res.status(500).end();
  }
});

router.post('/submit', async (req, res) => {
  const operation = 'saveTemplate';
  const methodData = req.body;

  try {
    const { sessionId, queueSet, queueReqv } = resolveSessionQueues(req, queueManager, 'main', logger)

    const message = { operation, ...methodData };

    channelPost.sendToQueue(
      queueSet,
      Buffer.from(JSON.stringify(message)),
    );

    logger.warn(
      `Sending message to queue '${queueSet}' activated by POST /methods/submit: ${JSON.stringify(message)}`,
    );

    let responseData;

    if (environment === 'development') {
      const newName = methodData?.name ?? null;

      const prevTemplates = mockMethodsList.templates;

      const templates = prevTemplates.includes(newName)
        ? prevTemplates
        : [...prevTemplates, newName];

      responseData = {
        ...mockMethodsList,
        templates,
      };
    } else {
      responseData = await waitForResponse(
        queueReqv,
        operation,
        logger,
        null,
        { id: 'utilPollingId' },
      );
    }

    res.status(200).json(responseData);
  } catch (error) {
    logger.error(
      `Failed to submit method activated by POST /methods/submit: ${error.message}`,
    );
    res.status(500).json({ error: 'Failed to submit method' });
  }
});

module.exports = async (getChannelPost, loggerInstance, queueManagerInstance) => {
  methodsListChannelGet = await createChannel();
  methodChannelGet = await createChannel();
  channelPost = getChannelPost();
  logger = loggerInstance;
  queueManager = queueManagerInstance
  return router;
};
