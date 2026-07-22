const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { v4 } = require('uuid');
const {
  createUpdateTabParams, createUpdateMarkers, createChangeAveragingHandler,
  createUpdateSmoothingParams,
  createUpdatePeakIdParams,
} = require('../commonFileMeasActions/common');
const { waitForResponse } = require('../services/resolver');
const { fileIdGenerator } = require('../../utils/shared/fileIdGenerator');
const { hashFile } = require('../services/utils');
const { mockPackageFile, mockSpectroFile, mockPlotWithManyPeaks } = require('../mockData/mockIndex');
const { mockChromaPeakTest } = require('../mockData/mockChromaPeakTest');
const { resolveSessionQueues, generateSessionQueues, assertSessionQueues } = require('../services/sessionQueuesHelpers');
const { createChannel } = require('../services/connectRabbitMQ');

const router = express.Router();

const MOCK_FILE_MAP = {
  chroma: mockPlotWithManyPeaks,
  peaks: mockChromaPeakTest,
  package: mockPackageFile,
  spectro: mockSpectroFile,
};

let channelPost;
let logger;
let queueManager;
let upload; // Multer instance
const environment = process.env.NODE_ENV || 'production';

const ensureUploadDir = () => {
  const uploadDir = path.resolve(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
    logger.warn(`Upload directory created at ${uploadDir}`);
  }
  return uploadDir;
};

const hasRejected = (arrayOfObjects) => arrayOfObjects.some((object) => object.status === 'rejected');

const deleteFiles = (filePaths) => {
  logger.warn('deleting', filePaths);
  filePaths.forEach((filePath) => {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`Deleted file: ${filePath}`);
    }
  });
};

module.exports = (getChannelPost, passedLogger, queueManagerInstance) => {
  channelPost = getChannelPost();
  logger = passedLogger;
  queueManager = queueManagerInstance;

  const BASE_UPLOAD_DIR = ensureUploadDir(); // once at module init

  const cleanupUploadDir = () => {
    const files = fs.readdirSync(BASE_UPLOAD_DIR).map((file) => path.join(BASE_UPLOAD_DIR, file));
    deleteFiles(files);
    logger.info(`Cleaned up upload directory. ${BASE_UPLOAD_DIR}`);
  };

  // Configure storage for Multer
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const baseUploadDir = BASE_UPLOAD_DIR;
      const packageId = req.query.packageId || null;

      if (packageId) {
        const packageDir = path.join(baseUploadDir, packageId);
        if (!fs.existsSync(packageDir)) {
          fs.mkdirSync(packageDir, { recursive: true });
          logger.warn(`Created subdirectory for packageId: ${packageDir}`);
        }
        cb(null, packageDir);
      } else {
        cb(null, baseUploadDir);
      }
    },
    filename: (req, file, cb) => {
      file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8'); // Crutch fix to stop utf8 names from breaking
      cb(null, file.originalname);
    },
  });

  upload = multer({ storage });

  const isMultipart = (req) => req.headers['content-type']?.startsWith('multipart/form-data');

  function createUploadOrJsonHandler({ upload, isMultipart, handler }) {
    return (req, res, next) => {
      if (isMultipart(req)) {
        upload.array('files', 30)(req, res, (err) => {
          if (err) return res.status(400).send({ error: 'File upload error.' });
          handler(req, res, next);
        });
      } else {
        express.json()(req, res, (err) => {
          if (err) return res.status(400).send({ error: 'Invalid JSON.' });
          handler(req, res, next);
        });
      }
    };
  }

  function createFileProxyHandler({
    operation = 'openFiles', // e.g., 'openFiles', 'pureGetFilesData'
    queueToSendBase = 'main', // e.g., 'main', 'other'
    queueToGetBase = null, // per index pairing with files, hashes etc.
    environment = 'production',
    MOCK_FILE_MAP,
    MOCK_TO_RETURN = 'chroma', // 'chroma' or 'package'
    queueNamingMode = 'resolver', // 'name' (old) | 'resolver' (future)
    logger,
    channelPost,
    queueManager,
    fileIdGenerator,
    hashFile,
    formMessageCallback = null,
    getShouldDeleteFiles = (parseNameFromPath, packageId) => !parseNameFromPath && packageId != null,
  }) {
    return async function fileProxyHandler(req, res) {
      // most likely queue to send base is main, but it can be other service queue, thus main-ish
      const { sessionId, queueSet: queueMainishSet } = resolveSessionQueues(req, queueManager, queueToSendBase, logger);
      
      let queueMainishReqv = null;
      if (queueToGetBase) {
        ({ queueReqv: queueMainishReqv } = resolveSessionQueues(req, queueManager, queueToGetBase, logger));
      }

      const {
        parseNameFromPath, filePathsToOpen, hashes: hashesJson, packageId = null,
      } = req.body;
      const { files } = req;
      const queryId = v4();
      const filePaths = [];
      let normalizedfiles = [];

      const clientHashes = hashesJson ? JSON.parse(hashesJson) : null;
      const isPathMode = parseNameFromPath && Array.isArray(filePathsToOpen) && filePathsToOpen.length > 0;

      if (isPathMode) {
        filePathsToOpen.forEach((filePath) => {
          const originalname = path.basename(filePath);
          normalizedfiles.push({ originalname });
          filePaths.push(filePath);
        });
      } else if (files?.length > 0) {
        normalizedfiles = Array.from(files);
        for (const file of normalizedfiles) {
          filePaths.push(file.path); // correct even when a package subdir is used
        }
      } else {
        return res.status(400).send({ error: 'No file uploaded or filePathsToOpen missing.' });
      }

      const algo = 'sha256';

      let hashSettled;
      if (!clientHashes || clientHashes.length !== filePaths.length) {
        hashSettled = await Promise.allSettled(filePaths.map((p) => hashFile(p, algo)));
      } else {
        hashSettled = clientHashes.map((h) => ({ status: 'fulfilled', value: h }));
      }

      const filesWithHashes = normalizedfiles.map((f, i) => {
        const resolve = hashSettled[i];
        const hash = resolve.status === 'fulfilled' ? resolve.value : null;
        const hashError = resolve.status === 'rejected' ? (resolve.reason?.message || String(resolve.reason)) : null;
        const resolverKey = fileIdGenerator.getId(f.originalname, hash);
        return {
          name: f.originalname,
          path: filePaths[i],
          hashAlgo: algo,
          hash,
          hashError,
          resolverKey,
        };
      });

      const getQueueKey = (f) => (queueNamingMode === 'resolver' ? f.resolverKey : f.name);

      let withQueues;

      if (typeof queueMainishReqv === 'string') {
        withQueues = filesWithHashes.map((f) => ({
          ...f,
          queues: [null, queueMainishReqv],
        }));
        logger.info(`Using shared response queue '${queueMainishReqv}' for all files`);
      } else {
        withQueues = await Promise.all(filesWithHashes.map(async (f) => {
          const queueKey = getQueueKey(f);
          console.log(`Resolving/generating queues for file ${f.name}: key=${queueKey}`);
          const { sessionId, queueSet, queueReqv } = await assertSessionQueues(req, queueManager, queueKey, logger);
          const queues = [queueSet, queueReqv];

          console.log(`Generated queues for file ${f.name}: ${ queueSet } ${ queueReqv }`);
          logger.warn(`${sessionId} Generated queues for file: ${queueKey}`);
          return { ...f, queues };
        }));
      }

      const message = formMessageCallback
        ? formMessageCallback({ withQueues, operation, queryId })
        : {
          operation,
          filePaths: withQueues.map((f) => f.path),
          fileIds: withQueues.map((f) => f.resolverKey),
          queueNames: withQueues.map((f) => f.queues),
          queryId,
        };

      channelPost.sendToQueue(queueMainishSet, Buffer.from(JSON.stringify(message)));
      logger.info(`Sent message to '${queueMainishSet}' with operation '${operation}': ${JSON.stringify({ ...message, filePaths: '[...]' })}`);

      try {
        let responseData;

        if (environment !== 'development') {
          const promises = withQueues.map((f) => waitForResponse(f.queues[1], operation, logger, null, { id: f.name }));

          const settled = await Promise.allSettled(promises);
          responseData = settled.map((r, i) => {
            const f = withQueues[i];
            console.log(`${f.name}:`, f);
            if (r.status === 'fulfilled') {
              const fileType = r.value?.fileType;
              const data = fileType === 'package' ? r.value.fileData : r.value?.data;
              return {
                status: 'fulfilled',
                data,
                fileName: f.name,
                queueNames: f.queues,
                hash: f.hash,
                path: f.path,
                resolverKey: f.resolverKey,
                ...(fileType && { fileType }),
              };
            }
            const reason = r.reason?.message || String(r.reason);
            logger.error(`Failed to consume data for file ${f.name}: ${reason}`);
            return {
              status: 'rejected',
              reason,
              fileName: f.name,
              queueNames: f.queues,
              path: f.path,
              hash: f.hash,
            };
          });
        } else {
          console.log(`Mocking file open with mock of ${MOCK_TO_RETURN}`);

          const data = MOCK_TO_RETURN === 'package' ? MOCK_FILE_MAP[MOCK_TO_RETURN]?.fileData : MOCK_FILE_MAP[MOCK_TO_RETURN]?.data;
          responseData = withQueues.map((file) => ({
            status: 'fulfilled',
            data,
            fileName: file.name,
            queueNames: file.queues,
            hash: file.hash,
            path: file.path,
            fileType: MOCK_TO_RETURN,
            resolverKey: file.resolverKey,
          }));
        }

        if (getShouldDeleteFiles(parseNameFromPath, packageId)) {
          deleteFiles(filePaths);
        }

        if (hasRejected(responseData)) {
          res.status(207).json({ message: 'Some files failed', responseData });
          logger.warn(`Some files upload failed: ${JSON.stringify(responseData)}`);
        } else {
          res.status(200).json({ message: 'Success', responseData });
          logger.info('File(s) uploaded successfully:');
        }
      } catch (err) {
        logger.error('File proxy failed:', err);
        res.status(500).json({ error: 'Internal error' });
      }
    };
  }

  const formOpenFilesMessage = ({ withQueues, operation, queryId }) => {
    if (!withQueues || !operation) throw new Error('missing data');
    const filePaths = [];
    const queueNames = [];
    const fileIds = [];
    for (const fileEntry of withQueues) {
      filePaths.push(fileEntry?.path);
      queueNames.push(fileEntry?.queues);
      fileIds.push(fileEntry?.resolverKey);
    }

    return {
      operation,
      filePaths,
      queueNames,
      fileIds,
    };
  };

  const formPureGetMessage = ({ withQueues, operation, queryId }) => {
    if (!withQueues || !operation) throw new Error(`Missing data in formMessageCallback: ${JSON.stringify({ withQueuesLength: withQueues?.length, operation, queryId })}`);
    const filePaths = [];
    const fileIds = [];
    for (const fileEntry of withQueues) {
      filePaths.push(fileEntry?.path);
      fileIds.push(fileEntry?.resolverKey);
    }

    return {
      operation,
      filePaths,
      fileIds,
      queryId,
    };
  };

  router.post('/upload', createUploadOrJsonHandler({
    upload,
    isMultipart,
    handler: createFileProxyHandler({
      operation: 'openFiles',
      queueToSendBase: 'main',
      environment,
      MOCK_FILE_MAP,
      MOCK_TO_RETURN: 'peaks',
      queueNamingMode: 'resolver',
      logger,
      channelPost,
      queueManager,
      fileIdGenerator,
      hashFile,
      formMessageCallback: formOpenFilesMessage,
    }),
  }));

  router.post('/pureGetFilesData', createUploadOrJsonHandler({
    upload,
    isMultipart,
    handler: createFileProxyHandler({
      operation: 'pureGetFilesData',
      queueToSendBase: 'main',
      queueToGetBase: 'pureData',
      useQueryId: true,
      sendQueues: false,
      environment,
      MOCK_FILE_MAP,
      queueNamingMode: 'resolver',
      logger,
      channelPost,
      queueManager,
      fileIdGenerator,
      hashFile,
      formMessageCallback: formPureGetMessage,
    }),
  }));

  const updateTabParams = createUpdateTabParams({
    logger: passedLogger,
    channelPost: getChannelPost(),
    queueManager,
  });

  router.post('/updateFileParam', updateTabParams);

  const updateMarkers = createUpdateMarkers({
    logger: passedLogger,
    channelPost: getChannelPost(),
    queueManager,
  });

  router.post('/updateMarkers', updateMarkers);

  router.post('/close', async (req, res) => {
    logger.warn(`Received close request: ${JSON.stringify(req.body)}`);
    try {
      const {
        fileId, needsToSave, alteredData, measurementType,
        forRestart = false, filePath = null,
      } = req.body;
      const { sessionId, queueSet } = resolveSessionQueues(req, queueManager, fileId, logger);
  
      let message;
      if (measurementType === 'chroma') {
        message = {
          chromaState: 'close',
          save: needsToSave,
          ...(needsToSave && { alteredData }),
          ...(filePath && { filePath }),
        };
      } else if (measurementType === 'spectro') {
        message = {
          operation: 'closeSpectroFile',
          save: needsToSave,
          ...(forRestart && { forRestart }),
          ...(filePath && { filePath }),
        };
      }

      channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));

      logger.info(`Sent close message for file ${fileId} to queue ${queueSet}: ${JSON.stringify(message)}`);
      res.status(200).json({ message: `File ${fileId} closed successfully` });
    } catch (error) {
      logger.error('Failed to close file:', error);
      res.status(500).json({ error: 'Failed to close file' });
    }
  });

  const sendSaveAsFileMessage = (sessionId,fileId, filePath, alteredData) => {
    try {
      const [queueSet] = queueManager.getQueues(sessionId, fileId);
  
      const message = {
        operation: 'saveFileAs',
        fileId,
        filePath,
        alteredData,
      };
  
      const logMsg = `Sending to queue '${queueSet}' from POST /file/save-as: ${JSON.stringify(message)}`;
      logger.info(logMsg);
  
      channelPost.sendToQueue(queueSet, Buffer.from(JSON.stringify(message)));
    } catch (error) {
      logger.error(`Failed to send save-as message for file ${fileId}: ${error.message}`);
      throw error;
    }
  };

  router.post('/save-as', async (req, res) => {
    try {
      const {
        fileId, filePath, alteredData, measurementType,
      } = req.body;

      const { sessionId } = await assertSessionQueues(req, queueManager, fileId, logger);
      
      sendSaveAsFileMessage(sessionId, fileId, filePath, alteredData);

      logger.warn(`Save-as requested for file ${fileId} -> ${filePath}`);

      res.status(200).json({
        message: 'File save-as requested',
        fileId,
        filePath,
        measurementType,
      });
    } catch (error) {
      logger.error('Failed to save file as:', error);
      res.status(500).json({
        error: 'Failed to save file as',
      });
    }
  });

  router.post('/changeAveraging', createChangeAveragingHandler({
    logger: passedLogger,
    channelPost: getChannelPost(),
    queueManager,
  }));

  router.post('/updateSmoothingParams', createUpdateSmoothingParams({
    logger: passedLogger,
    channelPost: getChannelPost(),
    queueManager,
  }));

  router.post('/updatePeakIdParams', createUpdatePeakIdParams({
    logger: passedLogger,
    channelPost: getChannelPost(),
    queueManager,
  }));

  return {
    router,
    cleanupUploadDir, // Exposing the cleanup function
  };
};
