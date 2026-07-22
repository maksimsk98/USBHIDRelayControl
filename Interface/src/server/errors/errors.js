const express = require('express');
const { createChannel } = require('../services/connectRabbitMQ');
const { resolveSessionQueues } = require('../services/sessionQueuesHelpers');

const router = express.Router();

let queueManager;
let errorPollChannel;
let logger;
/* const environment = process.env.NODE_ENV || 'production'; */

const fetchErrors = async (queueReqv) => {
  try {
    const message = await errorPollChannel.get(queueReqv, { noAck: false });
    if (message) {
      const errorMessage = JSON.parse(message.content.toString());
      console.log('Message received:', errorMessage);
      errorPollChannel.ack(message); // Acknowledge the message
      return errorMessage;
    }
    return null;
  } catch (error) {
    logger.error(`Failed to fetch errors message in ${queueReqv}: ${error.message}`);
    return { message: 'Error fetching errors message' };
  }
};

// API route to fetch error messages
router.get('/fetchErrors', async (req, res) => {
  const { sessionId, queueSet, queueReqv } = resolveSessionQueues(req, queueManager, 'errors', logger);
  const errors = await fetchErrors(queueReqv); // Pass the timeout value to fetchErrors
  res.status(200).json(errors); // Return the errors if found, or a timeout message
});

module.exports = async (loggerInstance, manager) => {
  errorPollChannel = await createChannel();
  logger = loggerInstance;
  queueManager = manager;
  return router;
};
