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
    const fillVolume = Number(req.body.volume) || 0;
    const message = { pumpMode: 'isocrat', pumpFillOn, volume: fillVolume };
    logger.info(`Sending to queue '${queueSet}' from ${req.method} ${req.url}: ${JSON.stringify(message)}`);
    logger.warn('fill');
    await channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));
    res.status(200).send(`pumpFillOn: ${pumpFillOn}, fillVolume: ${fillVolume}`);
  } catch (err) {
    logger.error(`Isocrat fill failed: ${err.message}`);
    res.status(400).send({ error: err.message });
  }
});

router.post('/drain', async (req, res) => {
  try {
    const { queueSet } = resolveSessionQueues(req, queueManager, 'pumps', logger);
    const { pumpDrainOn } = req.body;
    const drainVolume = Number(req.body.volume) || 0;
    const message = { pumpMode: 'isocrat', pumpDrainOn, volume: drainVolume };
    logger.info(`Sending to queue '${queueSet}' from ${req.method} ${req.url}: ${JSON.stringify(message)}`);
    logger.warn('drain');
    await channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));
    res.status(200).send(`pumpDrainOn: ${pumpDrainOn}, drainVolume: ${drainVolume}`);
  } catch (err) {
    logger.error(`Isocrat drain failed: ${err.message}`);
    res.status(400).send({ error: err.message });
  }
});

router.post('/supply', async (req, res) => {
  try {
    const { queueSet } = resolveSessionQueues(req, queueManager, 'pumps', logger);
    const supplyData = req.body;
    const message = {
      pumpMode: 'isocrat', ...supplyData,
    };
    logger.info(`Sending to queue '${queueSet}' from ${req.method} ${req.url}: ${JSON.stringify(message)}`);
    logger.warn('supply');
    await channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));
    res.status(200).send(`supply command sent with params ${message}`);
  } catch (err) {
    logger.error(`Isocrat supply failed: ${err.message}`);
    res.status(400).send({ error: err.message });
  }
});

module.exports = (getChannelPost, loggerInstance, queueManagerInstance) => {
  channelPost = getChannelPost();
  logger = loggerInstance;
  queueManager = queueManagerInstance;
  return router;
};
