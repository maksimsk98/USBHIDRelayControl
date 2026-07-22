const express = require('express');
const fs = require('fs');
const { waitForResponse } = require('../services/resolver');
const { mockPeaks } = require('../mockData/mockPeaks');
const { resolveSessionQueues } = require('../services/sessionQueuesHelpers');

const router = express.Router();

let logger;
let queueManager;
const environment = process.env.NODE_ENV || 'production';

function logError(endpoint, error, req, extra = {}) {
  try {
    const context = {
      params: req && req.params ? req.params : undefined,
      query: req && req.query ? req.query : undefined,
      body: req && req.body ? req.body : undefined,
      ...extra,
    };
    logger.error(
      `${endpoint} - ${error && error.message ? error.message : error} - context: ${JSON.stringify(context)} - stack: ${error && error.stack ? error.stack : 'no-stack'}`,
    );
  } catch (logErr) {
    // Fallback if logging fails
    try {
      logger.error(`${endpoint} - error while logging: ${logErr}`);
    } catch (ignore) {}
  }
}
async function fetchPeaks(queueReqv, tabId, operationInititiator, logger) {
  const responseData = await waitForResponse(queueReqv, operationInititiator, logger, null, { id: tabId });
  const logMsgMain = `Fetched peaks from ${queueReqv}: ${JSON.stringify(responseData)}`;
  logger.info(logMsgMain);

  if (!Array.isArray(responseData?.peakTable)) {
    throw new Error('PeakTable is not an array');
  }

  return responseData;
}

router.get('/fetch/:tabId', async (req, res) => {
  const { tabId } = req.params; // Extracts the measurementId from the route parameter
  const { sendRequest, operationInititiator } = req.query; // Extracts the sendRequest from query parameters
  
  if (sendRequest === 'true') { // in querry params it is string so we make it bool
    try {
      const { queueSet } = resolveSessionQueues(req, queueManager, tabId, logger);
  
      const message = { operation: 'fetchPeaks' };
      const logMsgMain = `Sending to queue ${queueSet} from get /peaks/fetch/${tabId}: ${JSON.stringify(message)}`;
      logger.info(logMsgMain);

      channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));
    } catch (error) {
      logError('GET /peaks/fetch sendRequest', error, req, { tabId });
      return res.status(500).json({ error: 'Failed to send request to fetch peaks to queue' });
    }
  }

  try {
    let data;
    if (environment === 'development') {
      data = mockPeaks;
    } else {
      const { queueReqv } = resolveSessionQueues(req, queueManager, tabId, logger);
      data = await fetchPeaks(queueReqv, tabId, operationInititiator, logger);
    }
    console.log('peaks', data);
    res.json(data);
  } catch (error) {
    logError('GET /peaks/fetch retrieve', error, req, { tabId, sendRequest, operationInititiator });
    res.status(500).json({ error: 'Failed to retrieve peak table' });
  }
});

router.post('/autoMark', async (req, res) => {
  const { tabId, ...paramsToSend } = req.body;
  const operation = 'autoMark';

  try {   
    const { queueSet } = resolveSessionQueues(req, queueManager, tabId, logger);

    const message = { operation, ...paramsToSend };
    const logMsgMain = `Sending to queue ${queueSet} from get /peaks/autoMark/${tabId}: ${JSON.stringify(message)}`;
    logger.info(logMsgMain);

    channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));
  } catch (error) {
    const safeTabId = req?.body?.tabId ?? 'unknown';
    logError('POST /peaks/autoMark sendRequest', error, req, { tabId: safeTabId });
    return res.status(500).json({ error: 'Failed to send request to fetch peaks to queue' });
  }

  try {
    const { queueReqv } = resolveSessionQueues(req, queueManager, tabId, logger);
    const data = environment !== 'development'
      ? await waitForResponse(queueReqv, operation, logger, null, { id: tabId })
      : defaultRecalculatedPeaks.peakTable; // need to send peakTable
    res.json(data);
  } catch (error) {
    const safeTabId = req?.body?.tabId ?? 'unknown';
    logError('POST /peaks/autoMark retrieve', error, req, { tabId: safeTabId, operation: 'autoMark' });
    res.status(500).json({ error: 'Failed to retrieve peak table' });
  }
});

router.post('/moveBorders', async (req, res) => {
  const { tabId, ...paramsToSend } = req.body;
  const operation = 'moveBorders';

  try {    
    const { queueSet } = resolveSessionQueues(req, queueManager, tabId, logger);

    const message = { operation, ...paramsToSend };
    const logMsgMain = `Sending to queue ${queueSet} from get /peaks/moveBorders/${tabId}: ${JSON.stringify(message)}`;
    logger.info(logMsgMain);

    channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));
  } catch (error) {
    const safeTabId = req?.body?.tabId ?? 'unknown';
    logError('POST /peaks/moveBorders sendRequest', error, req, { tabId: safeTabId });
    return res.status(500).json({ error: 'Failed to send request to fetch peaks to queue' });
  }

  try {
    const { queueReqv } = resolveSessionQueues(req, queueManager, tabId, logger);
    const data = environment !== 'development'
      ? await waitForResponse(queueReqv, operation, logger, null, { id: tabId })
      : defaultRecalculatedPeaks.peakTable; // need to send peakTable
    res.json(data);
  } catch (error) {
    const safeTabId = req?.body?.tabId ?? 'unknown';
    logError('POST /peaks/moveBorders retrieve', error, req, { tabId: safeTabId, operation: 'moveBorders' });
    res.status(500).json({ error: 'Failed to retrieve peak table' });
  }
});

router.post('/addPeak', async (req, res) => { 
  const { tabId, xCoord } = req.body;
  const operation = 'addPeak';

  try {
    const { queueSet } = resolveSessionQueues(req, queueManager, tabId, logger);

    const message = { operation, xCoord };
    const logMsgMain = `Sending to queue ${queueSet} from post /peaks/addPeak/${tabId}: ${JSON.stringify(message)}`;
    logger.info(logMsgMain);

    channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));
  } catch (error) {
    const safeTabId = req?.body?.tabId ?? 'unknown';
    logError('POST /peaks/addPeak sendRequest', error, req, { tabId: safeTabId, xCoord: req?.body?.xCoord });
    return res.status(500).json({ error: 'Failed to send request to add peaks to queue' });
  }

  try {
    const { queueReqv } = resolveSessionQueues(req, queueManager, tabId, logger);
    const data = environment !== 'development'
      ? await waitForResponse(queueReqv, operation, logger, null, { id: tabId })
      : defaultRecalculatedPeaks.peakTable; // need to send peakTable
    res.json(data);
  } catch (error) {
    const safeTabId = req?.body?.tabId ?? 'unknown';
    logError('POST /peaks/addPeak retrieve', error, req, { tabId: safeTabId, operation: 'addPeak' });
    res.status(500).json({ error: 'Failed to retrieve peak table' });
  }
});

router.post('/deletePeak', async (req, res) => {
  const { tabId, leftPoint, rightPoint } = req.body;
  const operation = 'deletePeak';

  try { 
    const { queueSet } = resolveSessionQueues(req, queueManager, tabId, logger);

    const message = { operation, leftPoint, rightPoint };
    const logMsgMain = `Sending to queue ${queueSet} from post /peaks/deletePeak/${tabId}: ${JSON.stringify(message)}`;
    logger.info(logMsgMain);

    channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));
  } catch (error) {
    const safeTabId = req?.body?.tabId ?? 'unknown';
    logError('POST /peaks/deletePeak sendRequest', error, req, { tabId: safeTabId, leftPoint: req?.body?.leftPoint, rightPoint: req?.body?.rightPoint });
    return res.status(500).json({ error: 'Failed to send request to delete peaks to queue' });
  }

  try {
    const { queueReqv } = resolveSessionQueues(req, queueManager, tabId, logger);
    const data = environment !== 'development'
      ? await waitForResponse(queueReqv, operation, logger, null, { id: tabId })
      : defaultRecalculatedPeaks.peakTable; // need to send peakTable
    res.json(data);
  } catch (error) {
    const safeTabId = req?.body?.tabId ?? 'unknown';
    logError('POST /peaks/deletePeak retrieve', error, req, { tabId: safeTabId, operation: 'deletePeak' });
    res.status(500).json({ error: 'Failed to retrieve peak table' });
  }
});

router.post('/deleteAllPeaks', async (req, res) => { 
  const { tabId } = req.body;
  const operation = 'deleteAllPeaks';

  try {
    const { queueSet } = resolveSessionQueues(req, queueManager, tabId, logger);

    const message = { operation };
    const logMsgMain = `Sending to queue ${queueSet} from post /peaks/deleteAllPeaks/${tabId}: ${JSON.stringify(message)}`;
    logger.info(logMsgMain);

    channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));
  } catch (error) {
    const safeTabId = req?.body?.tabId ?? 'unknown';
    logError('POST /peaks/deleteAllPeaks sendRequest', error, req, { tabId: safeTabId });
    return res.status(500).json({ error: 'Failed to send request to delete peaks to queue' });
  }

  try {
    const { queueReqv } = resolveSessionQueues(req, queueManager, tabId, logger);
    const data = environment !== 'development'
      ? await waitForResponse(queueReqv, operation, logger, null, { id: tabId })
      : defaultRecalculatedPeaks.peakTable; // need to send peakTable
    res.json(data);
  } catch (error) {
    const safeTabId = req?.body?.tabId ?? 'unknown';
    logError('POST /peaks/deleteAllPeaks retrieve', error, req, { tabId: safeTabId, operation: 'deleteAllPeaks' });
    res.status(500).json({ error: 'Failed to retrieve peak table' });
  }
});

router.post('/movePeakHistory', async (req, res) => {
  const { tabId, command } = req.body;
  const operationMap = {
    undoPeak: 'peaksUndoMarking',
    redoPeak: 'peaksRedoMarking',
  };

  const operation = operationMap[command];

  try {    
    const { queueSet } = resolveSessionQueues(req, queueManager, tabId, logger);

    const message = { operation };
    const logMsgMain = `Sending to queue ${queueSet} from post /peaks/addPeak/${tabId}: ${JSON.stringify(message)}`;
    logger.info(logMsgMain);

    channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));
  } catch (error) {
    const safeTabId = req?.body?.tabId ?? 'unknown';
    logError('POST /peaks/movePeakHistory sendRequest', error, req, { tabId: safeTabId, command: req?.body?.command });
    return res.status(500).json({ error: 'Failed to send request to add peaks to queue' });
  }

  try {
    const { queueReqv } = resolveSessionQueues(req, queueManager, tabId, logger);
    const data = environment !== 'development'
      ? await waitForResponse(queueReqv, operation, logger, null, { id: tabId })
      : defaultRecalculatedPeaks.peakTable; // need to send peakTable
    res.json(data);
  } catch (error) {
    const safeTabId = req?.body?.tabId ?? 'unknown';
    logError('POST /peaks/movePeakHistory retrieve', error, req, { tabId: safeTabId, operation });
    res.status(500).json({ error: 'Failed to retrieve peak table' });
  }
});

router.post('/changePeakProperty', async (req, res) => {
  const { tabId, peakIndex, property } = req.body;
  const operation = 'changePeakProperty';

  try {
    const { queueSet } = resolveSessionQueues(req, queueManager, tabId, logger);

    const message = { operation, peakIndex, property };

    logger.info(
      `Sending to queue ${queueSet} from /peaks/movePeakHistory for tabId=${tabId}: ${JSON.stringify(message)}`,
    );

    channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));
  } catch (error) {
    const safeTabId = req?.body?.tabId ?? 'unknown';
    logError('POST /peaks/changePeakProperty sendRequest', error, req, { tabId: safeTabId, peakIndex: req?.body?.peakIndex });
    return res.status(500).json({ error: 'Failed to send request to queue' });
  }

  try {
    const { queueReqv } = resolveSessionQueues(req, queueManager, tabId, logger);
    const data = await waitForResponse(queueReqv, operation, logger, null, { id: tabId });

    res.json(data);
  } catch (error) {
    const safeTabId = req?.body?.tabId ?? 'unknown';
    logError('POST /peaks/changePeakProperty retrieve', error, req, { tabId: safeTabId, operation: 'changePeakProperty' });
    res.status(500).json({ error: 'Failed to retrieve peak table' });
  }
});

router.post('/moveMarkers', async (req, res) => {  
  const { tabId, ...paramsToSend } = req.body;
  const operation = 'getTableForPeaks';

  try {
    const { queueSet } = resolveSessionQueues(req, queueManager, tabId, logger);

    const message = { operation, ...paramsToSend };
    const logMsgMain = `Sending to queue ${queueSet} from get /peaks/moveMarkers/${tabId}: ${JSON.stringify(message)}`;
    logger.info(logMsgMain);

    channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));
  } catch (error) {
    const safeTabId = req?.body?.tabId ?? 'unknown';
    logError('POST /peaks/moveMarkers sendRequest', error, req, { tabId: safeTabId, paramsToSend: req?.body });
    return res.status(500).json({ error: 'Failed to send request to fetch peak params table to queue' });
  }

  try {
    const { queueReqv } = resolveSessionQueues(req, queueManager, tabId, logger);
    const data = await waitForResponse(queueReqv, operation, logger, null, { id: tabId });
    res.json(data);
  } catch (error) {
    const safeTabId = req?.body?.tabId ?? 'unknown';
    logError('POST /peaks/moveMarkers retrieve', error, req, { tabId: safeTabId, operation: 'getTableForPeaks' });
    res.status(500).json({ error: 'Failed to retrieve peak params table' });
  }
});

router.post('/changeSubstanceName', async (req, res) => {
  const { tabId, row, newSubstanceName } = req.body;
  const operation = 'changeSubstanceName';

  try {
    const { queueSet } = resolveSessionQueues(req, queueManager, tabId, logger);

    const message = {
      operation,
      row,
      newSubstanceName,
    };

    logger.info(
      `Sending to queue ${queueSet} from post /peaks/changeSubstanceName/${tabId}: ${JSON.stringify(message)}`,
    );

    channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));
  } catch (error) {
    const safeTabId = req?.body?.tabId ?? 'unknown';
    logError('POST /peaks/changeSubstanceName sendRequest', error, req, { tabId: safeTabId, row: req?.body?.row });
    return res.status(500).json({ error: 'Failed to send request to queue' });
  }

  try {
    const { queueReqv } = resolveSessionQueues(req, queueManager, tabId, logger);
    const data = environment !== 'development'
      ? await waitForResponse(queueReqv, operation, logger, null, { id: tabId })
      : mockPeaks; // dev fallback, полный объект как обычно

    res.json(data);
  } catch (error) {
    const safeTabId = req?.body?.tabId ?? 'unknown';
    logError('POST /peaks/changeSubstanceName retrieve', error, req, { tabId: safeTabId, operation: 'changeSubstanceName' });
    res.status(500).json({ error: 'Failed to retrieve peak table' });
  }
});

module.exports = (getChannelPost, loggerInstance, queueManagerInstance) => {
  channelPost = getChannelPost();
  logger = loggerInstance;
  queueManager = queueManagerInstance;
  return router;
};
