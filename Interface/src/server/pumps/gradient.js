const express = require('express');
const { resolveSessionQueues } = require('../services/sessionQueuesHelpers');

const router = express.Router();

let channelPost;
let logger;
let queueManager;

router.post('/fill', async (req, res) => {
  try {
    const { queueSet } = resolveSessionQueues(req, queueManager, 'pumps', logger);

    const { pumpFillOn } = req.body;
    const fillFlowRate = Number(req.body.fillFlowRate) || 0;
    const volume = Number(req.body.volume) || 0;
    const pumpA = !!req.body.pumpA;
    const pumpB = !!req.body.pumpB;

    const message = {
      pumpMode: 'gradient',
      pumpFillOn,
      fillFlowRate,
      pumpA,
      pumpB,
      volume,
    };

    logger.info(`Sending to queue '${queueSet}' from ${req.method} ${req.url}: ${JSON.stringify(message)}`);
    console.warn('gradient fill', message);
    await channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));
    res.status(200).send(`Gradient fill command sent: ${JSON.stringify(message)}`);
  } catch (err) {
    logger.error(`Gradient fill failed: ${err.message}`);
    res.status(400).send({ error: err.message });
  }
});

router.post('/drain', async (req, res) => {
  try {
    const { queueSet } = resolveSessionQueues(req, queueManager, 'pumps', logger);

    const { pumpDrainOn } = req.body;
    const fillFlowRate = Number(req.body.fillFlowRate) || 0;
    const volume = Number(req.body.volume) || 0;
    const pumpA = !!req.body.pumpA;
    const pumpB = !!req.body.pumpB;

    const message = {
      pumpMode: 'gradient',
      pumpDrainOn,
      fillFlowRate,
      pumpA,
      pumpB,
      volume,
    };

    logger.info(`Sending to queue '${queueSet}' from ${req.method} ${req.url}: ${JSON.stringify(message)}`);
    console.warn('gradient drain', message);
    await channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));
    res.status(200).send(`Gradient drain command sent: ${JSON.stringify(message)}`);
  } catch (err) {
    logger.error(`Gradient drain failed: ${err.message}`);
    res.status(400).send({ error: err.message });
  }
});

router.post('/supply', async (req, res) => {
  try {
    const { queueSet } = resolveSessionQueues(req, queueManager, 'pumps', logger);

    const { pumpSupplyOn, setPumpProg } = req.body;

    const message = {
      pumpMode: 'gradient',
      pumpSupplyOn,
      setPumpProg,
    };

    logger.info(`Sending to queue '${queueSet}' from ${req.method} ${req.url}: ${JSON.stringify(message)}`);
    console.warn('gradient supply', message);
    await channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));
    res.status(200).send(`Gradient supply command sent: ${JSON.stringify(message)}`);
  } catch (err) {
    logger.error(`Gradient supply failed: ${err.message}`);
    res.status(400).send({ error: err.message });
  }
});

module.exports = (getChannelPost, loggerInstance, queueManagerInstance) => {
  channelPost = getChannelPost();
  logger = loggerInstance;
  queueManager = queueManagerInstance;
  return router;
};
