const { createChannel } = require('./connectRabbitMQ');

const resolverMap = new Map(); // fileId -> Map<operation, Array<{ resolve, timeout }>>
const activeConsumers = new Map(); // queueName -> { channel, consumerTag }
const startingPromises = new Map(); // queueName -> Promise
const closingPromises = new Map(); // queueName -> Promise

async function startConsumerIfNeeded(queueName, logger, operation) {
  // Wait if consumer is currently closing
  if (closingPromises.has(queueName)) {
    await closingPromises.get(queueName); // Wait for the closing consumer to finish
  }

  if (activeConsumers.has(queueName)) return;

  if (startingPromises.has(queueName)) {
    await startingPromises.get(queueName); // Wait until it finishes starting
    return;
  }

  let resolveStart;
  const startPromise = new Promise((resolve) => {
    resolveStart = resolve;
  });
  startingPromises.set(queueName, startPromise);
  const consumerTag = `${operation}_${process.pid}_${Date.now()}_${Math.random()}`;
  try {
    const channel = await createChannel();
    // register it _immediately so stopConsumer can find it, otherwise consume may run faster then active consumers are appended
    activeConsumers.set(queueName, { channel, consumerTag });

    await channel.consume(queueName, async (msg) => {
      if (!msg) {
        logger.warn(`Received bad resolver message ${msg} from queue ${queueName}`);
        return;
      }
      const content = JSON.parse(msg.content.toString());

      if (!content || !content.operation) {
        logger.warn(`Received bad resolver message content ${JSON.stringify(content)} from queue ${queueName}`);
        channel.ack(msg);
        return;
      }
      /* logger.warn(`Procesing message ${JSON.stringify(content)} from resolver consumer for fileMap ${JSON.stringify(fileMap, null, 2)}`) */
      const { operation: receivedOperation, success, message: errorMessage } = content;

      const opMap = resolverMap.get(queueName);
      const listeners = opMap?.get(receivedOperation);
      if (listeners?.length) {
        const { resolve, reject, timeout } = listeners.shift();

        if (listeners.length === 0) {
          opMap.delete(receivedOperation);
          /*  logger.warn(`finished resolvers for ${receivedOperation} on ${queueName}`) */
          if (opMap.size === 0) {
            resolverMap.delete(queueName);
            /* logger.warn(`finished all resolvers for ${queueName}`) */
          }
        }

        clearTimeout(timeout);

        if (success === false) {
          logger.error(`Backend server reported on ${queueName} failure for operation "${receivedOperation}": ${errorMessage}. Content of response: ${JSON.stringify(content)}`);
          reject(new Error(errorMessage || `Backend server reported failure for operation "${receivedOperation}"`));
        } else {
          resolve(content);
        }
      } else {
        logger?.error?.(`No resolver for operation "${receivedOperation}" on queue "${queueName} : ${JSON.stringify(content)}"`);
      }

      channel.ack(msg);

      if (!opMap || opMap.size === 0) {
        await stopConsumer(queueName, logger);
      }
    }, { consumerTag });

    /* console.log('Started consumer', queueName, 'with tag', consumerTag, 'active after', activeConsumers) */
  } catch (error) {
    // if anything blew up, undo the premature map‐set
    activeConsumers.delete(queueName);
    console.error(`opearation ${operation} consumer ${consumerTag} and ${queueName}`, error);
  } finally {
    resolveStart(); // Always resolve even if there was an error
    startingPromises.delete(queueName);
  }
}

async function stopConsumer(queueName, logger) {
  const consumer = activeConsumers.get(queueName);

  if (!consumer) return console.warn('no active consumers for measurement', queueName, activeConsumers);

  if (closingPromises.has(queueName)) return; // Already closing

  let resolveClose;
  const closePromise = new Promise((resolve) => {
    resolveClose = resolve;
  });
  closingPromises.set(queueName, closePromise);

  const { channel, consumerTag } = consumer;
  try {
    await channel.cancel(consumerTag)
      .catch((err) => logger.warn(`channel.cancel failed: ${err.message}`));
    await channel.close()
      .catch((err) => logger.warn(`channel.close failed: ${err.message}`));
    /* logger.warn(`Consumer ${consumerTag} on ${queueName} stopped`); */
  } catch (err) {
    logger?.error?.(`Failed to stop consumer on ${queueName}: ${err.message}`);
  } finally {
    activeConsumers.delete(queueName);
    resolveClose(); // Ensure the closure promise resolves once consumer stops
    closingPromises.delete(queueName);
  }
}

function waitForResponse(queueName, operation, logger, timeoutMs, context = {}) {
  return new Promise(async (resolve, reject) => {
    let timeout;

    if (timeoutMs !== null) {
      timeout = setTimeout(() => {
        const opMap = resolverMap.get(queueName);
        if (opMap) {
          const opList = opMap.get(operation) || [];
          opMap.set(operation, opList.filter((e) => e.resolve !== resolve));
          if (opMap.get(operation)?.length === 0) opMap.delete(operation);
          if (opMap.size === 0) resolverMap.delete(queueName);
        }
        reject(new Error(`Timeout waiting for "${operation}" on queue "${queueName}"`));
      }, timeoutMs);
    }

    const opMap = resolverMap.get(queueName) || new Map();
    const listeners = opMap.get(operation) || [];
    listeners.push({
      resolve, reject, timeout, context,
    });
    opMap.set(operation, listeners);
    resolverMap.set(queueName, opMap);

    /* if (operation !== 'fetchAutosamplerState') console.log(`pushedResolverFor ${operation} for ${queueName}`); */

    try {
      await startConsumerIfNeeded(queueName, logger, operation);
    } catch {
      reject('failed to setup consumer');
    }
  });
}

function waitForResolversToSettle(id, timeoutMs = 3000) {
  return new Promise((resolve) => {
    const interval = 50;
    let waited = 0;

    const check = () => {
      let anyLeft = false;

      // resolverMap: Map<queueName, Map<operation, Listener[]>>
      for (const [queueName, opMap] of resolverMap.entries()) {
        for (const [operation, listeners] of opMap.entries()) {
          const matching = listeners.filter(({ context }) => context?.id === id);
          if (matching.length > 0) {
            anyLeft = true;
            break;
          }
        }
        if (anyLeft) break;
      }

      if (!anyLeft) {
        resolve(true);
      } else if (waited >= timeoutMs) {
        // timeout — reject and clean up matching listeners
        for (const [queueName, opMap] of resolverMap.entries()) {
          for (const [operation, listeners] of opMap.entries()) {
            const remaining = [];

            for (const listener of listeners) {
              if (listener.context?.id === id) {
                listener.reject?.(
                  new Error(`Resolver "${operation}" on "${queueName}" timed out for id "${id}"`),
                );
                clearTimeout(listener.timeout);
              } else {
                remaining.push(listener);
              }
            }

            if (remaining.length > 0) {
              opMap.set(operation, remaining);
            } else {
              opMap.delete(operation);
            }
          }

          if (opMap.size === 0) {
            resolverMap.delete(queueName);
          }
        }

        resolve(false);
      } else {
        waited += interval;
        setTimeout(check, interval);
      }
    };

    check();
  });
}

module.exports = {
  waitForResponse,
  stopConsumer,
  waitForResolversToSettle,
};
