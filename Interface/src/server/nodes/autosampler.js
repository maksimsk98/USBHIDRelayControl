const express = require('express');
const fs = require('fs');
const { cloneDeep } = require('lodash');
const crypto = require('crypto');
const { waitForResponse } = require('../services/resolver');
const {
  dataState, startListeningChroma, serviceState, closeMeasurement, cleanupMeasurementInternals, stopMeasurement, clearDataState,
} = require('../measurement/chromaLifecycle');
const { createChannel } = require('../services/connectRabbitMQ');

const { mockAutosamplerConfig } = require('../mockData/mockAutosamplerConfig');
const { mockAutosamplerState } = require('../mockData/mockAutosamplerState');
const { resolveSessionQueues, assertSessionQueues } = require('../services/sessionQueuesHelpers');

const router = express.Router();

let channelPost;
let logger;
let queueManager;
const environment = process.env.NODE_ENV || 'production';

const pendingAutosamplerRequests = new Set();

router.post('/singleInjection', async (req, res) => {
  try {
    const {queueSet, } = resolveSessionQueues(req, queueManager, 'autosampler', logger);
  
    // i don't know how solution in ui turned into solvent semantically different, so in my code i keep what i belive is more acurate and will just change keys on post
    const operation = 'controlSingleInjection';
    const {
      switchTo, params: {
        vialId,
        method = 10, // api sets 10 (when max is 9) as default
        preWashSolvent,
        postWashSolvent,
      },
    } = req.body;
    const message = {
      operation,
      turnOn: switchTo,
      vialId,
      selectedMethod: method,
      preWashSolvent,
      postWashSolvent,
    };

    if (environment !== 'production') console.log(message);

    logger.info(`Changing single injection state in ${queueSet}: ${JSON.stringify(message)}`);
    channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));

    res.status(200).end();
  } catch (error) {
    const errorMessage = 'Failed changing single injection state:';
    logger.error(errorMessage, error);
    res.status(500).json({ errorMessage, error });
  }
});

router.post('/wash', async (req, res) => {
  try {
    const { queueSet } = resolveSessionQueues(req, queueManager, 'autosampler', logger);

    const operation = 'controlWash';
    const {
      switchTo, params: {
        solvent,
        volume,
        volumeInternal = null,
        washObject,
        wasteVial,
      },
    } = req.body;
    // api has some inconsistencies with actual ui in naming
    const message = {
      operation,
      turnOn: switchTo,
      targetVial: solvent,
      wasteVial,
      volume,
      volumeInternal,
      washParameter: washObject,
    };

    if (environment !== 'production') console.log(message);

    logger.info(`Changing washing state in ${queueSet}: ${JSON.stringify(message)}`);
    channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));

    res.status(200).end();
  } catch (error) {
    const errorMessage = 'Failed changing washing state:';
    logger.error(errorMessage, error);
    res.status(500).json({ errorMessage, error });
  }
});

router.post('/autoThermostat', async (req, res) => {
  try {
    const { queueSet } = resolveSessionQueues(req, queueManager, 'autosampler', logger);

    const operation = 'controlThermostatAutosampler';
    const {
      switchTo, params: {
        targetTemp,
      },
    } = req.body;
    // api has some inconsistencies with actual ui in naming
    const message = {
      operation,
      turnOn: switchTo,
      targetTemp,
    };

    if (environment !== 'production') console.log(message);

    logger.info(`Changing autosampler thermostat state in ${queueSet}: ${JSON.stringify(message)}`);
    channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));

    res.status(200).end();
  } catch (error) {
    const errorMessage = 'Failed changing autosampler thermostat state:';
    logger.error(errorMessage, error);
    res.status(500).json({ errorMessage, error });
  }
});

router.post('/autoControl', async (req, res) => {
  try {
    const { sessionId: appSessionId, queueSet } = resolveSessionQueues(req, queueManager, 'autosampler', logger);

    const operation = 'controlAutosamplerProgram';
    const { switchTo, sessionId: autoSessionId, params: { programSteps = [] } = {} } = req.body;

    const { sessionId, queueSet: measQueueSet, queueReqv: measQueueReqv } = await assertSessionQueues(req, queueManager, autoSessionId, logger);

    const autoSessionQueueNames = [measQueueSet, measQueueReqv];

    const effectiveSteps = programSteps.map(({
      vialIndex, sampleName, method, injectionsCount,
    }) => ({
      vialId: vialIndex + 1, // for some reason counting from 1
      sampleName,
      methodName: method,
      numberInjections: injectionsCount,
    }));

    const message = {
      operation,
      ...(switchTo && { queueNames: autoSessionQueueNames }),
      measurementName: autoSessionId, 
      turnOn: switchTo,
      ...(switchTo && { stepData: effectiveSteps }),
    };

    logger.info(`Changing autosampler control state in ${queueSet}: ${JSON.stringify(message)}`);
    channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));

    if (switchTo) {
      const measurementChannelPost = await createChannel();
      serviceState.channelMap[autoSessionId] = { channelPost: measurementChannelPost };
      startListeningChroma({
        measurementName: autoSessionId, logger, queueManager, sessionId: appSessionId
      });
    }

    res.status(200).end();
  } catch (error) {
    const errorMessage = 'Failed changing autosampler control state:';
    
    // Convert error to string safely
    const errorStr = error instanceof Error 
      ? `${error.message}\n${error.stack}` 
      : JSON.stringify(error);

    logger.warn(`${errorMessage} ${errorStr}`);
    

    res.status(500).json({ errorMessage, error: errorStr });
  }
});

router.post('/autoControlFinish', async (req, res) => {
 
  const { sessionId: autoSessionId } = req.body;
  try {
    const { sessionId: appSessionId, queueSet, queueReqv } = resolveSessionQueues(req, queueManager, autoSessionId, logger)
        
    await stopMeasurement({ // gotta stop first so no eternal reqv consumer in cleanup await
      measurementId: autoSessionId,
      sendMessage: false,
      purgeQueues: true,
      stopPolling: true,
      cancelConsumer: true,
      closeChannel: true,
      logger,
      queueManager,
      appSessionId
    });

    /* clearDataState(sessionId) */ // deletes in next line poissibly redundant
    await cleanupMeasurementInternals(autoSessionId, logger, queueManager, appSessionId);
    res.status(200).end();
  } catch (error) {
    const errorMessage = `Failed finishing autosampler control session ${autoSessionId}:`;
    const errorStr = error instanceof Error 
      ? `${error.message}\n${error.stack}` 
      : JSON.stringify(error);

    logger.warn(`${errorMessage} ${errorStr}`);
    res.status(500).json({ errorMessage: `Failed finishing autosampler control session ${autoSessionId}`, error });
  }
});

router.get('/autoControlListen', async (req, res) => {
  const { autoSessionId, sessionId: appSessionId } = req.query;
  if (!autoSessionId) {
    logger.error(`no valid autoSessionId "${autoSessionId}" in app session ${appSessionId}`);
  }
  const response = dataState[autoSessionId];
  res.json(response);
  clearDataState(autoSessionId);
});

router.post('/autoSubMeasurementClose', async (req, res) => {
  try {
    const { sessionId: autoSessionId, needsToSave = true, alteredData } = req.body;
    const { sessionId: appSessionId, queueSet, queueReqv } = resolveSessionQueues(req, queueManager, autoSessionId, logger)
       

    await closeMeasurement({
      measurementId: autoSessionId,
      needsToSave,
      isAutoControlled: true,
      alteredData,
      logger,
      queueManager,
      appSessionId
    });
    logger.warn(`Autosampler measurement ${autoSessionId} closed successfully.`);
    res.json({ message: 'Measurement closed successfully' });
  } catch (error) {
    logger.error('Failed to close measurement:', error);
    res.status(500).json({ error: 'Failed to close measurement' });
  }
});

router.post('/autoSubMeasurementStop', async (req, res) => {
  try {
    const { sessionId: autoSessionId } = req.body;
    const { sessionId: appSessionId, queueSet, queueReqv } = resolveSessionQueues(req, queueManager, autoSessionId, logger)
        
    await stopMeasurement({
      measurementId: autoSessionId,
      sendMessage: true,
      purgeQueues: true,
      stopPolling: false,
      cancelConsumer: false,
      closeChannel: false,
      logger,
      queueManager,
      appSessionId
    });
    logger.warn(`Autosampler measurement ${autoSessionId} stopped.`);
    res.json({ message: 'Measurement stopped' });
  } catch (error) {
    logger.error('Failed to stop and close measurement:', error);
    res.status(500).json({ error: 'Failed to stop and close measurement' });
  }
});

router.post('/autoControlUpdate', async (req, res) => {
  try {
    const { queueSet } = resolveSessionQueues(req, queueManager, 'autosampler', logger);
  
    const operation = 'updateAutosamplerProgram';
    const {
      params: {
        programSteps,
      },
    } = req.body;
    const effectiveSteps = programSteps.map(({
      vialIndex, sampleName, method, injectionsCount,
    }) => ({
      vialId: vialIndex + 1, // for some reason counting from 1
      sampleName,
      methodName: method,
      numberInjections: injectionsCount,
    }));
    const message = {
      operation,
      stepData: effectiveSteps,
    };

    if (environment !== 'production') console.log(message);

    logger.info(`Updating autosampler control state: ${JSON.stringify(message)}`);
    channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));

    res.status(200).end();
  } catch (error) {
    const errorMessage = 'Failed updating autosampler control state:';
    logger.error(errorMessage, error);
    res.status(500).json({ errorMessage, error });
  }
});

router.get('/fetchAutoConfig', async (req, res) => {
  try {
    const operation = 'getAutosamplerProperties';
    const {queueSet, queueReqv } = resolveSessionQueues(req, queueManager, 'autosampler', logger);

    const message = {
      operation,
    };

    if (environment !== 'production') console.log(message);

    logger.info(`Fetching autosampler config: ${JSON.stringify(message)}`);
    channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));
    const responseData = environment !== 'development'
      ? await waitForResponse(queueReqv, operation, logger, null, { id: 'utilPollingId' })
      : mockAutosamplerConfig;

    logger.info(`Received autosampler config: ${JSON.stringify(responseData)}`);

    // legacy code has naming that is a bit off and jarring, so i normilize here
    const normilizedData = {
      ...responseData,
      preWashSolvents: responseData.inputWashSolvents,
      postWashSolvents: responseData.outputWashSolvents,
      rowsCount: responseData.numberRows,
      samplesPerRow: responseData.numberSamplesInRow,
    };
    res.json(normilizedData);
  } catch (error) {
    const errorMessage = 'Failed fetching autosampler config';
    logger.error(errorMessage, error);
    res.status(500).json({ errorMessage, error });
  }
});

router.get('/fetchAutoState', async (req, res) => {
  let correlationId = null;

  try {
    // LOG CURRENT IN-FLIGHT REQUESTS
  /*  if (pendingAutosamplerRequests.size > 0) {
      logger.info(
        `Pending autosampler requests still in-flight: ${Array.from(pendingAutosamplerRequests).join(', ')}`
      );
   } */

    const operation = 'fetchAutosamplerState';
    const { queueSet, queueReqv } = resolveSessionQueues(req, queueManager, 'autosampler', logger);

    correlationId = crypto.randomUUID();

    const message = {
      operation,
      correlationId,
    };

    logger.info(`Fetching autosampler state: ${JSON.stringify(message)}`);
    pendingAutosamplerRequests.add(correlationId);

    channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));
    const responseData = environment !== 'development'
      ? await waitForResponse(queueReqv, operation, logger, null, { id: 'utilPollingId' })
      : mockAutosamplerState;

    const { correlationId: responseCorrelationId } = responseData;

    if (pendingAutosamplerRequests.has(responseCorrelationId)) {
      pendingAutosamplerRequests.delete(responseCorrelationId);
    } else {
      /*  logger.warn(`Autosampler response correlationId not expected: ${responseCorrelationId}`); */
    }

    if (correlationId !== responseCorrelationId) {
      /* logger.warn(`Mismatch of correlationId req-res for fetchAutoState (sent ${correlationId}, got ${responseCorrelationId})`); */
    }

    logger.info(`Received autosampler state: ${JSON.stringify(responseData)}`);
    const normilizedData = cloneDeep(responseData);
    if (normilizedData?.autosamplerProgram?.activeStep === 0) {
      normilizedData.autosamplerProgram.activeStep = null;
    } else {
      normilizedData.autosamplerProgram.activeStep -= 1;
    }
    if (normilizedData?.autosamplerProgram?.currentInjection === 0) normilizedData.autosamplerProgram.currentInjection = null;
    res.json(normilizedData);
  } catch (error) {
    // ensure our own pending request is removed, loudly
    if (correlationId && pendingAutosamplerRequests.has(correlationId)) {
      pendingAutosamplerRequests.delete(correlationId);
      logger.error(
        `Removed pending autosampler request ${correlationId} due to error: ${error.message}`,
      );
    }

    const errorMessage = 'Failed fetching autosampler state';
    logger.error(errorMessage, error);
    res.status(500).json({ errorMessage, error });
  }
});

router.post('/samplerSettings', async (req, res) => {
  try {
    const { samplerSettings } = req.body;
    const { queueSet } = resolveSessionQueues(req, queueManager, 'autosampler', logger);

    const operation = 'writeSamplerSettings'
    
    const message = {
      operation,
      samplerSettings
    };

    if (environment !== 'production') console.log('Writing sampler settings:', message);

    logger.info(`Writing sampler settings: ${JSON.stringify(message)}`);
    channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));

    res.status(200).json({ message: 'Sampler settings sent successfully' });
  } catch (error) {
    const errorMessage = 'Failed to write sampler settings:';
    logger.error(errorMessage, error);
    res.status(500).json({ errorMessage, error });
  }
});

router.get('/samplerSettings', async (req, res) => {
  try {
    const operation = 'readSamplerSettings';
    const { queueSet, queueReqv } = resolveSessionQueues(req, queueManager, 'autosampler', logger);

    const message = {
      operation
    };

    if (environment !== 'production') console.log('Reading sampler settings:', message);

    logger.info(`Fetching sampler settings: ${JSON.stringify(message)}`);
    channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));
    
    // В development режиме используем mock данные
    const responseData = environment !== 'development'
      ? await waitForResponse(queueReqv, operation, logger, null, { id: 'utilPollingId' })
      : {
          operation: 'readSamplerSettings',
          samplerSettings: {
            needleDepthSample: 7,
            needleDepthWash: 7,
            pumpH1SpeedSample: 77,
            pumpH2SpeedWash: 7,
            axisXSpeed: 7,
            axisYSpeed: 7,
            axisZSpeed: 7,
            loopVolume: 7,
            sampleAspirations: 7,
            defaultValvePosition: 0,
            deadVolume: 0
          }
        };

    // Проверяем, что responseData имеет правильную структуру
    if (!responseData || !responseData.samplerSettings) {
      throw new Error('Invalid response structure from sampler settings');
    }

    res.json(responseData);
  } catch (error) {
    const errorMessage = 'Failed fetching sampler settings';
    logger.error(errorMessage, error);
    res.status(500).json({ errorMessage, error });
  }
});


module.exports = (getChannelPost, loggerInstance, queueManagerInstance) => {
  channelPost = getChannelPost();
  logger = loggerInstance;
  queueManager = queueManagerInstance

  return router;
};
