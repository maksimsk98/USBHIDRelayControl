const crypto = require("crypto");
const { createChannel } = require("./connectRabbitMQ");
const { getRabbitMQQueueName } = require("./queueNameHelper");


class QueueModule {
  /**
   * A QueueModule manages all queues for one device.
   * @param {object} assertChannel - AMQP channel
   * @param {object} queueNamesLogger - optional logger with createQueue/log/error methods
   * @param {string} sessionId 
   */
  constructor(assertChannel, queueNamesLogger, sessionId) {
    this.assertChannel = assertChannel;
    this.queueNamesLogger = queueNamesLogger;
    
    this.sessionId = sessionId;
    this.queueParams = {}; // { [baseName]: { queues: [set, reqv] } }
  }

  buildQueueNamesPairs(baseName) {
    return [
      getRabbitMQQueueName(`${baseName}_set`, this.sessionId),
      getRabbitMQQueueName(`${baseName}_reqv`, this.sessionId)
    ];
  }


  async generateQueues(baseName) {
    const queueNames = this.buildQueueNamesPairs(baseName);
    if (this.queueParams[baseName]) {
      logger.warn(`Queues already exist for base "${baseName}"`);
    }
    this.queueParams[baseName] = { queues: queueNames };
    

    await this.assertChannel.assertQueue(queueNames[0]);
    await this.assertChannel.assertQueue(queueNames[1]);

    this.queueNamesLogger?.createQueue?.(baseName, queueNames);
    return queueNames;
  }

  /**
   * Retrieve existing queues by base name.
   * Throws if not found.
   */
  getQueues(baseName) {
    const entry = this.queueParams[baseName];

    if (!entry) {
      const msg = `QueueModule: queues not found for base "${baseName}" (device ${this.sessionId})`;
      this.queueNamesLogger?.error?.(msg) ?? console.error(msg);
      throw new Error(msg);
    }
    return entry.queues;
  }

  /**
   * Get all queues managed by this module as a flat array.
   * @returns {string[]}
   */
  getAllQueues() {
    return Object.values(this.queueParams)
      .flatMap(entry => entry.queues);
  }

  // ---------- Cleanup ----------

  /**
   * Delete queues for a given baseName.
   */
  async deleteQueues(baseName) {
    const entry = this.queueParams[baseName];
    if (!entry) {
      console.warn(`No queues found for base name: ${baseName}`);
      return;
    }

    const { queues } = entry;
    for (const queue of queues) {
      try {
        await this.assertChannel.deleteQueue(queue);
        this.queueNamesLogger?.log?.({
          level: "deleteQueue",
          message: `Deleted queue "${queue}" for base "${baseName}"`,
        });
      } catch (err) {
        console.warn(`Failed to delete queue "${queue}":`, err.message);
      }
    }

    delete this.queueParams[baseName];
  }

  /**
   * Delete all queues managed by this module.
   */
  async deleteAllQueues() {
    for (const baseName of Object.keys(this.queueParams)) {
      await this.deleteQueues(baseName);
    }
  }

  // ---------- Factory ----------

  static async create(queueNamesLogger, sessionId) {
    const assertChannel = await createChannel();
    return new QueueModule(assertChannel, queueNamesLogger, sessionId);
  }
}

module.exports = QueueModule;
