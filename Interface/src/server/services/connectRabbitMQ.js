const amqp = require('amqplib');
const fs = require('fs');
const path = require('path');

const axios = require('axios');

const { logger } = require('./logger'); // Assuming logger is defined somewhere
const { ESSENTIAL_QUEUE_NAMES } = require('./constants');

let connection;
let channels = [];
const moduleChannels = new Map(); // moduleName -> channel

const ADMIN_API_CONFIG = {
  baseURL: 'http://localhost:15672/api',
  auth: {
    username: process.env.RABBITMQ_USER || 'guest',
    password: process.env.RABBITMQ_PASS || 'guest',
  },
  timeout: 10000,
};

async function createSafeAdminClient() {
  // Check if we're in development
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Admin HTTP calls are only allowed in development environment');
  }

  // Try to check if admin plugin is available
  try {
    // Test endpoint to check if admin plugin is available
    const testClient = axios.create({
      baseURL: ADMIN_API_CONFIG.baseURL,
      auth: ADMIN_API_CONFIG.auth,
      timeout: 5000, // Shorter timeout for health check
    });

    // Try to access a basic admin endpoint
    await testClient.get('/overview');
    
    // If we get here, admin plugin is available
    return axios.create(ADMIN_API_CONFIG);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('RabbitMQ admin plugin is not available (connection refused). Make sure RabbitMQ management plugin is enabled.');
    } else if (error.response?.status === 401) {
      throw new Error('Authentication failed for RabbitMQ admin API. Check credentials.');
    } else {
      throw new Error(`RabbitMQ admin plugin check failed: ${error.message}`);
    }
  }
}

/**
 * Safely delete all queues via HTTP with development and admin plugin checks
 */
async function deleteAllQueuesViaHttp(vhost = '/') {
  let client;
  try {
    client = await createSafeAdminClient();
  } catch (error) {
    // Log the error but don't throw - this allows the application to continue
    // without admin functionality if it's not in development or admin plugin is off
    logger.warn(`Cannot use admin HTTP API: ${error.message}`);
    logger.info('Proceeding without queue cleanup via HTTP API');
    return; // Exit gracefully without throwing
  }

  try {
    const v = encodeURIComponent(vhost);
    const { data: queues } = await client.get(`/queues/${v}`);

    const deletions = queues
      .filter(q => !ESSENTIAL_QUEUE_NAMES.includes(q.name))
      .map(async (q) => {
        try {
          await client.delete(`/queues/${v}/${encodeURIComponent(q.name)}`);
          logger.warn(`Deleted queue via HTTP API: ${q.name}`);
        } catch (deleteError) {
          logger.error(`Failed to delete queue ${q.name}: ${deleteError.message}`);
        }
      });

    await Promise.allSettled(deletions);
    
    if (queues.length > 0) {
      logger.warn(`HTTP cleanup completed for vhost "${vhost}"`);
    }
  } catch (error) {
    // Log error but don't crash the application
    logger.error(`Error during HTTP queue cleanup: ${error.message}`);
    if (error.response) {
      logger.error(`HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`);
    }
  }
}

/**
 * Check if admin API is available (for optional features)
 * This doesn't throw, just returns boolean
 */
async function isAdminApiAvailable() {
  if (process.env.NODE_ENV !== 'development') {
    return false;
  }

  try {
    const testClient = axios.create({
      baseURL: ADMIN_API_CONFIG.baseURL,
      auth: ADMIN_API_CONFIG.auth,
      timeout: 3000,
    });
    await testClient.get('/overview');
    return true;
  } catch {
    return false;
  }
}


async function connectRabbitMQ() {
  if (connection) return connection; // singleton
  try {
    connection = await amqp.connect('amqp://localhost:5672');
        connection.on('close', () => {
      logger.warn('AMQP CONNECTION CLOSED');
    });

    connection.on('error', (err) => {
      logger.error('AMQP CONNECTION ERROR', err);
    });

    await deleteAllQueuesViaHttp('/');
    
    // Initialize essential queues
    const adminChannel = await createChannel();
    await initializeEssentialQueues(adminChannel);
    await processLogFiles(adminChannel); // Process log files related to queue deletion
    await safeCloseChannel(adminChannel);
    logger.warn('Connected to RabbitMQ');
  } catch (error) {
    logger.error(`Failed to connect to RabbitMQ: ${error.message}`);
    throw error;
  }
}

async function createChannel() {
  if (!connection) {
    logger.error('No RabbitMQ connection available. Please ensure you are connected.');
    throw new Error('No RabbitMQ connection');
  }
  const channel = await connection.createChannel();

  channels.push(channel); // Add the channel to the array

  // Automatically remove the channel from the array when it closes
  channel.on('close', () => {
    const a = channels.length;
    channels = channels.filter((ch) => ch !== channel);
    const b = channels.length;
    /* if (a > b ) {
      logger.warn(`Channel closed and was removed from the list automaticly.`);
    }     */
  });
  return channel;
}

/** Module-specific channel (singleton per module) */
async function createModuleChannel(moduleName) {
  if (!moduleName || typeof moduleName !== 'string') {
    throw new Error('moduleName must be a non-empty string');
  }

  if (moduleChannels.has(moduleName)) return moduleChannels.get(moduleName);

  const channel = await createChannel();
  moduleChannels.set(moduleName, channel);

  channel.on('close', () => {
    moduleChannels.delete(moduleName);
  });

  return channel;
}


// Safely close a channel and remove it from the array
async function safeCloseChannel(channel) {
  try {
    if (channel) {
      await channel.close();
      /* logger.warn(`Channel closed`); */
    }
  } catch (error) {
    if (error.message !== 'Channel closed') {
      logger.error(`Error closing channel: ${error.message}`);
    } else {
      logger.warn(`Channel is already closed, ${error}`);
    }
  }
}

async function closeAllChannels() {
  try {
    // Close all channels (includes module channels because createModuleChannel calls createChannel)
    for (const channel of channels) {
      if (channel) {
        await safeCloseChannel(channel);
      }
    }

    if (channels.length !== 0) {
      throw new Error('after closing channels still in array');
    }
    
    channels = []; // Clear the channels array once all are closed
    moduleChannels.clear();

    logger.warn('All channels closed');
  } catch (error) {
    logger.error(`Error closing channels: ${error.message}`);
    throw error;
  }
}

async function initializeEssentialQueues(adminChannel) {
  try {
    await Promise.allSettled(
      ESSENTIAL_QUEUE_NAMES.map(async (queueName) => {
        await adminChannel.assertQueue(queueName);
        await adminChannel.purgeQueue(queueName);
      }),
    );
  } catch (error) {
    logger.error(`Error initializing essential queues: ${error.message}`);
    throw error;
  }
}

const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.warn(`Deleted log file: ${filePath}`);
    }
  } catch (error) {
    logger.error(`Error deleting file ${filePath}: ${error.message}`);
  }
};

async function processLogFiles(adminChannel) {
  try {
    const searchPattern = /^queues.*\.log$/;
    const directoryPath = './logs';
    const files = fs.readdirSync(directoryPath)
      .filter((file) => searchPattern.test(file))
      .map((file) => ({
        filePath: path.join(directoryPath, file),
        stats: fs.statSync(path.join(directoryPath, file)),
      }))
      .filter(({ stats }) => stats.isFile()); // Only include files

    if (files.length === 0) {
      logger.info('No log files found for processing.');
      return;
    }

    const latestLog = files.reduce((latest, current) => (current.stats.birthtimeMs > latest.stats.birthtimeMs ? current : latest));

    for (const file of files) {
      const { filePath } = file;
      if (filePath !== latestLog.filePath) {
        await deleteQueuesFromFile(filePath, adminChannel);
        deleteFile(filePath); // coment out to not delete queue files, to avoid access errors due to temp change of order
      }
    }
    logger.warn('Queues deleted');
  } catch (error) {
    logger.error(`Error processing log files: ${error.message}`);
  }
}

async function deleteQueuesFromFile(filename, adminChannel) {
  try {
    if (!fs.existsSync(filename)) return;

    const queues = fs.readFileSync(filename, 'utf8')
      .split('\n')
      .filter((queue) => queue.trim() !== '')
      .map((queue) => queue.trim());

    await Promise.allSettled(queues.map(async (queue) => {
      const queueSet = `${queue}_set`;
      const queueReqv = `${queue}_reqv`;
      await adminChannel.deleteQueue(queueReqv);
      await adminChannel.deleteQueue(queueSet);
    }));

    if (queues.length !== 0) {
      logger.warn(`Deleted queues: ${queues}`);
    }
  } catch (error) {
    logger.error(`Error deleting queues from file: ${error.message}`);
  }
}

async function shutdownRabbitMQ() {
  try {
    if (connection) {
      const adminChannel = await createChannel();
      /* await processLogFiles(adminChannel); */ // Process log files related to queue deletion
      await safeCloseChannel(adminChannel);
      await closeAllChannels();
      await connection.close();
      logger.warn('RabbitMQ connection closed');
    }
  } catch (error) {
    logger.error(`Error during RabbitMQ shutdown: ${error.message}`);
  }
}

module.exports = { connectRabbitMQ, createChannel, createModuleChannel, shutdownRabbitMQ };
