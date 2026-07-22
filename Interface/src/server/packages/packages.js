const express = require('express');
const fs = require('fs');
const path = require('path');
const { waitForResponse } = require('../services/resolver');
const { hashFile } = require('../services/utils');
const { fileIdGenerator } = require('../../utils/shared/fileIdGenerator');
const { generateSessionQueues, resolveSessionQueues, assertSessionQueues } = require('../services/sessionQueuesHelpers');

const router = express.Router();

let logger;
let queueManager;
const environment = process.env.NODE_ENV || 'production';

router.post('/createPackage', async (req, res) => {
  const { packageId } = req.body;

  try {
    const { sessionId, queueSet: mainQueueSet, queueReqv: mainQueueReqv } = resolveSessionQueues(req, queueManager, 'main', logger);
    const { queueSet: packQueueSet, queueReqv: packQueueReqv } = await assertSessionQueues(req, queueManager, packageId, logger);
  
    const operation = 'createPackage';

    if (!packageId || !packQueueSet || !packQueueReqv) {
      throw new Error(`Queue not found for package: ${packageId}`);
    }

    const queueNames = [packQueueSet, packQueueReqv];

    const message = {
      operation,
      queueNames,
      packageId,
    };

    const logMsgMain = `Sending to queue ${mainQueueSet} from operation ${operation}: ${JSON.stringify(message)}`;
    logger.warn(logMsgMain);

    await channelPost.sendToQueue(mainQueueSet, Buffer.from(JSON.stringify(message)));
    res.json({ message: 'Package created successfully' });
  } catch (error) {
    logger.error('Failed to create package:', error);
    res.status(500).json({ error: 'Failed to create package' });
  }
});

router.post('/closePackage', async (req, res) => {
  try {
    const { packageId } = req.body;

    const operation = 'closePackage';

    const message = {
      operation,
    };
  
    const { sessionId, queueSet, queueReqv } = resolveSessionQueues(req, queueManager, packageId, logger);
  
    const logMsgMain = `Sending to queue ${queueSet} from operation ${operation}: ${JSON.stringify(message)}`;
    logger.info(logMsgMain);

    channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));

    res.status(200).end();
  } catch (error) {
    logger.error('Failed to close package:', error);
    res.status(500).json({ error: 'Failed to close package' });
  }
});

router.post('/savePackage', async (req, res) => {
  try {
    const { packageId, deletedFilesIndexes = [], filesIdsToAppend = [] } = req.body;
    
    const { sessionId, queueSet, queueReqv } = resolveSessionQueues(req, queueManager, packageId, logger);
  

    operation = 'savePackage';

    if (!deletedFilesIndexes.length && !filesIdsToAppend.length) return res.status(500).json({ error: 'Failed to create package, nothing to create from' });

    const matchedFilePaths = [];

    if (filesIdsToAppend.length) {
      // get files from uploads stash
      const uploadDir = path.resolve(process.cwd(), 'uploads');
      const packageDir = path.join(uploadDir, packageId);

      if (!fs.existsSync(packageDir)) {
        return res.status(404).json({ error: `Package folder not found: ${packageDir}` });
      }

      const filesInFolder = fs.readdirSync(packageDir);

      for (const fileName of filesInFolder) {
        const fullPath = path.join(packageDir, fileName);
        const hash = await hashFile(fullPath);
        const fileId = fileIdGenerator.getId(fileName, hash);
        if (filesIdsToAppend.includes(fileId)) {
          matchedFilePaths.push(fullPath);
        }
      }
    }

    const message = {
      operation,
      deletedFilesIndexes,
      filePathsToAppend: matchedFilePaths,
      packageId,
    };
  
    if (!packageId || !queueSet) {
      throw new Error(`Queue not found for package: ${tabId}`);
    }

    const logMsgMain = `Sending to queue ${queueSet} from post /package/savePackage: ${JSON.stringify(message)}`;
    logger.info(logMsgMain);

    channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));
  } catch (error) {
    logger.error('Failed to save package:', error);
    return res.status(500).json({ error: 'Failed to save package' });
  }

  res.json({ message: 'Package saved successfully' });
});

module.exports = (getChannelPost, loggerInstance, queueManagerInstance) => {
  channelPost = getChannelPost();
  logger = loggerInstance;
  queueManager = queueManagerInstance
  return router;
};
