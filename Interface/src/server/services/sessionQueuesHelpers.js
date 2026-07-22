function resolveSessionQueues(req, queueManager, moduleType, logger, log = true) {
  const { sessionId } = req.query;

  try {
    if (sessionId == null) {
      throw new Error('Missing sessionId');
    }

    const queues = queueManager.getQueues(sessionId, moduleType, log);
    if (!queues || queues.length === 0) {
      throw new Error('No queues found for session');
    }

    const [queueSet, queueReqv] = queues;
    if (!queueSet || !queueReqv) {
      throw new Error('Invalid queues for session');
    }

    return { sessionId, queueSet, queueReqv };
  } catch (err) {
    if (log) {
      logger.error(
        `resolveSessionQueues failed (module=${moduleType}, sessionId=${sessionId}): ${err.message}`
      );
    }
    throw err;
  }
}

/**
 * Ensure queues are generated for a given session + base.
 * Analog to resolveSessionQueues, but for generateQueues().
 */
async function generateSessionQueues(req, queueManager, baseName, logger) {
  const { sessionId } = req.query;

  try {
    if (sessionId == null) {
      throw new Error('Missing sessionId');
    }

    if (!baseName) {
      throw new Error('Missing baseName');
    }

    const queues = await queueManager.generateQueues(sessionId, baseName);
    logger.warn(`Generated queues for session ${sessionId}, base ${baseName}: ${queues}`);
    const [queueSet, queueReqv] = queues;
    if (!queueSet || !queueReqv) {
      throw new Error('Invalid queues for session');
    }

    return { sessionId, queueSet, queueReqv };
  } catch (err) {
    logger.error(
      `generateSessionQueues failed (base=${baseName}, sessionId=${sessionId}): ${err.message}`
    );
    throw err;
  }
}

/**
 * Ensure session queues exist.
 * Try resolve first, generate if missing.
 */
/**
 * Ensure session queues exist.
 * Try resolve first, generate if missing.
 */
async function assertSessionQueues(req, queueManager, moduleType, logger) {
  try {
    // Fast path: already exists
    const result = resolveSessionQueues(req, queueManager, moduleType, logger, false);
    logger.warn('Assert fast pass')
    return result
  } catch (err) {
    // Slow path: generate and return
    try {
      const result = await generateSessionQueues(
        req,
        queueManager,
        moduleType,
        logger
      );

      logger.warn('Assert slow pass')
      return result
    } catch (innerErr) {
      logger.error(
        `assertSessionQueues failed (module=${moduleType}): ${innerErr.message}`
      );
      throw innerErr;
    }
  }
}

module.exports = {
  resolveSessionQueues,
  generateSessionQueues,
  assertSessionQueues,
};
