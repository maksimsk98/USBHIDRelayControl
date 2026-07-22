const crypto = require('crypto');
const fs = require('fs');
const { NODE_STATUSES, PUMP_STATES } = require('./constants');

const genTimeoutPromise = (timeout) => new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), timeout));

// Utility to validate numeric values
const validateNumericValue = (value, name, logger, fallback = null) => {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }
  logger.error(`Invalid value for ${name}: ${value} fallback to ${fallback}`);
  return fallback;
};

const validateStrValue = (value, name, logger, fallback = '') => {
  if (typeof value === 'string') {
    return value;
  }
  logger.error(`Invalid value for ${name}: ${value} fallback to ${fallback}`);
  return fallback;
};

const validateArrayPointWithFallback = (target, source, name, logger) => {
  if (!Array.isArray(source)) {
    logger.error(`${name} is not an array ${source}`);
    return;
  }

  source.forEach((point, index) => {
    if (typeof point === 'number' && !Number.isNaN(point)) {
      target.push(point);
    } else {
      const previousValue = target[target.length - 1] || 0;
      logger.error(`Bad ${name} point at index ${index}, duplicated previous value: ${previousValue}`);
      target.push(previousValue);
    }
  });
};

const validateAndSetStatus = (targetObject, propName, newStatus, logger) => {
  if (Object.values(NODE_STATUSES).includes(newStatus)) {
    targetObject[propName] = newStatus;
  } else {
    logger.error(`Bad status for ${propName}: \"${newStatus}\", allowed statuses: ${JSON.stringify(Object.values(NODE_STATUSES))}`);
  }
};

const validateAndSetPumpState = (targetObject, propName, queuePropName, newState, logger) => {
  if (PUMP_STATES.includes(newState)) {
    if (!Array.isArray(targetObject[queuePropName])) {
      targetObject[queuePropName] = [];
    }
    const lastQueued = targetObject[queuePropName][targetObject[queuePropName].length - 1] || targetObject[propName];

    if (newState !== lastQueued) {
      targetObject[queuePropName].push(newState);
    }

    targetObject[propName] = newState;
  } else {
    logger.error(`Bad state for ${propName}: \"${newState}\", allowed states: ${JSON.stringify(PUMP_STATES)}`);
  }
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hashFile(filePath, algo = 'sha256') {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash(algo);
    const stream = fs.createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

module.exports = {
  validateArrayPointWithFallback,
  validateNumericValue,
  validateStrValue,
  validateAndSetStatus,
  genTimeoutPromise,
  validateAndSetPumpState,
  sleep,
  hashFile,
};
