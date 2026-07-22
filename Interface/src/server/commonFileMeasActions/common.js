const crypto = require('crypto');

const { mockUpdateMarker } = require('../mockData/mockIndex');
const { createChannel } = require('../services/connectRabbitMQ');

const { waitForResponse } = require('../services/resolver');
const { resolveSessionQueues } = require('../services/sessionQueuesHelpers');

const environment = process.env.NODE_ENV || 'production';

// in case of future deviations in logic between file and meas we use this structure and not singular endpoint just in case

function createUpdateTabParams({ logger, channelPost, queueManager }) {
  return async function updateTabParams(req, res) {
    try {
      const {
        tabId, paramName, value, responseWithStream = false, ...extraValues
      } = req.body; // responseWithStream send new data with measurement stream and doesn;t require listening specificly
      
      const { sessionId, queueSet, queueReqv } = resolveSessionQueues(req, queueManager, tabId, logger);
  
      let messageToSend;
      let expectResponse = false;
      let expectedOperation = null;

      switch (paramName) {
        case 'isSignalAveraging':
          expectedOperation = 'changeAveraging';
          messageToSend = {
            operation: expectedOperation,
            averaging: value,
            ...extraValues,
          };
          expectResponse = true;
          break;

        case 'isCheckedCorrection':
          expectedOperation = 'updateCorrection';
          messageToSend = {
            operation: expectedOperation,
            isCheckedCorrection: value,
          };

          expectResponse = true;
          break;

        case 'isCheckedDriftCompensation':
          expectedOperation = 'updateDriftCompensation';
          messageToSend = {
            operation: expectedOperation,
            isCheckedDriftCompensation: value,
          };
          expectResponse = true;
          break;

        case 'isCheckedShift':
          expectedOperation = 'updateShift';
          messageToSend = {
            operation: expectedOperation,
            isCheckedShift: value,
          };
          expectResponse = true;
          break;

        default:
          return res.status(400).json({ error: 'Unknown parameter' });
      }

      channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(messageToSend)));
      logger.info(`Sent param update for ${paramName} to ${queueSet}:`, messageToSend);

      let responseData = null;
      if (expectResponse && !responseWithStream) {
        const response = await waitForResponse(queueReqv, expectedOperation, logger, null, { id: tabId });

        logger.info(`Received response for ${paramName}:`, response);
        if (response.operation !== expectedOperation) {
          return res.status(500).json({ error: `Unexpected response operation: ${response.operation}` });
        }
        responseData = response;
      }

      res.status(200).json({
        message: `Parameter ${paramName} updated successfully`,
        ...(responseData && { updatedData: responseData }),
      });
    } catch (error) {
      logger.error('Failed to update param:', error);
      res.status(500).json({ error: 'Failed to update parameter' });
    }
  };
}

function createUpdateMarkers({ logger, channelPost, queueManager }) {
  
  const pendingMarkerRequests = new Set();

  return async function updateMarkers(req, res) {
    let correlationId = null;
    try {
      const {
        tabId, leftBorder, rightBorder, responseWithStream = false,
      } = req.body;
      const { sessionId, queueSet, queueReqv } = resolveSessionQueues(req, queueManager, tabId, logger);
  


      correlationId = crypto.randomUUID();
      if (!responseWithStream) pendingMarkerRequests.add(correlationId); // do not add to set those that go with measurement. monitor through logs

      const operation = 'changeMarker';
      const messageToSend = {
        operation,
        leftBorder,
        rightBorder,
        correlationId,
        responseWithStream,
      };

      channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(messageToSend)));
      logger.info(`Sent marker update to ${queueSet}: ${JSON.stringify(messageToSend)}`);

      if (!responseWithStream) {
        const response = environment === 'development'
          ? mockUpdateMarker
          : await waitForResponse(
            queueReqv,
            'updateMarker',
            logger,
            null,
            { id: tabId },
          );

        const { correlationId: respId } = response || {};

        if (response.operation !== 'updateMarker') {
          return res.status(500).json({ error: `Unexpected response operation: ${response.operation}` });
        }

        if (pendingMarkerRequests.has(respId)) {
          pendingMarkerRequests.delete(respId);
        } else {
          logger.warn(`Marker response with unexpected correlationId: ${respId}`);
        }

        return res.status(200).json({
          message: 'Marker updated successfully',
          updatedData: response,
        });
      }

      res.status(200).json({
        message: 'Marker updated successfully, response with stream',
      });
    } catch (error) {
      logger.error(`Failed to update marker: pendingRequests=${JSON.stringify(pendingMarkerRequests)}, error=${JSON.stringify(error)}`, error);
      res.status(500).json({ error: 'Failed to update marker' });
    }
  };
}

function createChangeAveragingHandler({ logger, channelPost, queueManager }) {
  const pendingAveragingRequests = new Set(); // LOCAL per factory

  return async function changeAveraging(req, res) {
    let correlationId = null;

    try {
      const { tabId, averaging, isMeasuring = false } = req.body;
      const { sessionId, queueSet, queueReqv } = resolveSessionQueues(req, queueManager, tabId, logger);
  
      correlationId = crypto.randomUUID();
      if (!isMeasuring) pendingAveragingRequests.add(correlationId); // do not add to set those that go with measurement. monitor through logs

      const message = {
        operation: 'changeAveraging',
        averaging,
        correlationId,
      };

      logger.info(`Sending changeAveraging for ${tabId} to queue ${queueSet}: ${JSON.stringify(message)}`);
      channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));

      if (isMeasuring) {
        return res.status(200).end(); // measuring, no response expected
      }

      const response = await waitForResponse(queueReqv, 'changeAveraging', logger, null, { id: tabId });

      const { correlationId: respId } = response || {};

      if (pendingAveragingRequests.has(respId)) {
        pendingAveragingRequests.delete(respId);
      } else {
        logger.warn(`Averaging response with unexpected correlationId: ${respId}`);
      }

      res.status(200).json({
        message: 'Averaging changed successfully',
        updatedData: response,
      });
    } catch (error) {
      logger.error(`Failed to change averaging for ${req.body?.fileId}:`, error);
      res.status(500).json({ error: 'Failed to change averaging' });
    }
  };
}

function createUpdateSmoothingParams({ logger, channelPost, queueManager }) {
  return async function updateSmoothingParams(req, res) {
    try {
      const { tabId, params, withoutResponse } = req.body;

      const { sessionId, queueSet, queueReqv } = resolveSessionQueues(req, queueManager, tabId, logger);
  
      const operation = 'changePeaksSmoothingParameters';
      const messageToSend = {
        operation,
      withoutResponse,
        ...params,
      };

      channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(messageToSend)));
      logger.info(`Sent smoothing param update to ${queueSet}: ${JSON.stringify(messageToSend)}`);
      
    if (withoutResponse) {
      return res.status(200).json({ ok: true });
    }

      const response = await waitForResponse(queueReqv, operation, logger, null, { id: tabId });
      res.status(200).json(response);
    } catch (error) {
      logger.error('Failed to update smoothing params:', error);
      res.status(500).json({ error: 'Failed to update smoothing parameters' });
    }
  };
}

function createUpdatePeakIdParams({ logger, channelPost, queueManager }) {
  return async function updatePeakIdParams(req, res) {
    try {
      const { tabId, params, withoutResponse } = req.body;
      const { sessionId, queueSet, queueReqv } = resolveSessionQueues(req, queueManager, tabId, logger);

      const operation = 'changePeaksIdentificationParameters';
      const messageToSend = {
        operation,
        withoutResponse,
      ...params,
      };

      channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(messageToSend)));
      logger.info(`Sent peaks id params update to ${queueSet}: ${JSON.stringify(messageToSend)}`);

    
    if (withoutResponse) {
      return res.status(200).json({ ok: true });
    }

      const response = await waitForResponse(queueReqv, operation, logger, null, { id: tabId });
      res.status(200).json(response);
    } catch (error) {
      logger.error('Failed to update peaks id params:', error);
      res.status(500).json({ error: 'Failed to update peaks id parameters' });
    }
  };
}

module.exports = {
  createUpdateTabParams,
  createUpdateMarkers,
  createChangeAveragingHandler,
  createUpdateSmoothingParams,
  createUpdatePeakIdParams,
};
