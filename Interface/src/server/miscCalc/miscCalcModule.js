const express = require('express');
const { waitForResponse } = require('../services/resolver');
const { resolveSessionQueues } = require('../services/sessionQueuesHelpers');

const router = express.Router();

const environment = process.env.NODE_ENV || 'production';

let logger;
let queueManager;
let channelPost;

router.post('/getNoiseEval', async (req, res) => {
  const { measurementId, noiseEvalParams } = req.body;

  if (!measurementId) {
    return res.status(400).json({ error: 'measurementId is required' });
  }

  try {
    // #WATCHLIST here was wierd code with fallback to gen queues
    const { sessionId, queueSet, queueReqv } = resolveSessionQueues(req, queueManager, measurementId, logger);
  
    const operation = 'getNoiseEval';

    const message = {
      operation,
      ...noiseEvalParams,
    };

    logger.warn(
      `Sending noiseEval to '${queueSet}': ${JSON.stringify(message)}`,
    );

    channelPost.sendToQueue(
      queueSet,
      Buffer.from(JSON.stringify(message)),
    );

    /*     if (environment === 'development') {
      const MOCK_NOISE = {"operation":"getNoiseEval","noiseValue":1.2}
      logger.warn(
        `[DEV] Mock noiseEval for ${measurementId}: returning ${JSON.stringify(MOCK_NOISE)}`
      );

      return res.json(MOCK_NOISE);
    } */

    const response = await waitForResponse(
      queueReqv,
      operation,
      logger,
      null,
      { id: measurementId },
    );

    logger.warn(
      `Received noiseEval response from '${queueReqv}': ${JSON.stringify(response)}`,
    );

    res.json(response);
  } catch (err) {
    logger.error(`NoiseEval failed for ${measurementId}`, err);
    res.status(500).json({ error: 'Failed to calculate noise evaluation' });
  }
});

router.post('/setStandardConcentration', async (req, res) => {
  const { measurementId, concentration } = req.body;

  if (!measurementId) {
    return res.status(400).json({ error: 'measurementId is required' });
  }

  if (concentration == null) {
    return res.status(400).json({ error: 'concentration is required' });
  }

  try {
    const { sessionId, queueSet, queueReqv } = resolveSessionQueues(req, queueManager, measurementId, logger);

    const operation = 'setStandardConcentration';

    const message = {
      operation,
      concentration,
    };

    logger.warn(
      `Sending concentration to '${queueSet}': ${JSON.stringify(message)}`,
    );

    channelPost.sendToQueue(
      queueSet,
      Buffer.from(JSON.stringify(message)),
    );

    const response = await waitForResponse(
      queueReqv,
      operation,
      logger,
      null,
      { id: measurementId },
    );

    logger.warn(
      `Received concentration response from '${queueReqv}': ${JSON.stringify(response)}`,
    );

    res.json(response);
  } catch (err) {
    logger.error(`confirmConcentration failed for ${measurementId}`, err);
    res.status(500).json({ error: 'Failed to confirm concentration' });
  }
});

router.get('/getCalibrationStandard', async (req, res) => {
  const { calibrationName } = req.query;

  if (!calibrationName) {
    return res.status(400).json({ error: 'calibrationName is required' });
  }

  try {
    const { sessionId, queueSet, queueReqv } = resolveSessionQueues(req, queueManager, 'main', logger);

    const operation = 'getCalibrationStandard';

    const message = {
      operation,
      calibrationName,
    };

    logger.warn(
      `Sending getCalibrationStandard to '${queueSet}': ${JSON.stringify(message)}`,
    );

    channelPost.sendToQueue(
      queueSet,
      Buffer.from(JSON.stringify(message)),
    );

    const response = await waitForResponse(
      queueReqv,
      operation,
      logger,
      null,
      { id: calibrationName },
    );

    logger.warn(
      `Received getCalibrationStandard from '${queueReqv}': ${JSON.stringify(response)}`,
    );

    res.json(response);
  } catch (err) {
    logger.error(`getCalibrationStandard failed for ${calibrationName}`, err);
    res.status(500).json({ error: 'Failed to get calibration standard' });
  }
});

module.exports = (getChannelPost, loggerInstance, queueManagerInstance) => {
  logger = loggerInstance;
  queueManager = queueManagerInstance;
  channelPost = getChannelPost();

  return router;
};
