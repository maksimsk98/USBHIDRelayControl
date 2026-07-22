const express = require('express');

const router = express.Router();
const chromaRoutes = require('./chromaModule');
const spectroRoutes = require('./spectroModule');

module.exports = (getChannelPost, logger, queueNamesLogger) => {
  router.use('/chroma', chromaRoutes(
    getChannelPost,
    logger,
    queueNamesLogger,
  ));
  router.use('/spectro', spectroRoutes(
    getChannelPost,
    logger,
    queueNamesLogger,
  ));
  return router;
};
