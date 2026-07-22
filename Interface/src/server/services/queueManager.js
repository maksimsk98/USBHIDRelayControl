const { MODULE_BASES } = require("./constants");
const QueueModule = require("./queueModule");

class QueueManager {
  constructor(queueNamesLogger, logger) {
    this.queueNamesLogger = queueNamesLogger;
    this.logger = logger
    this.modules = new Map(); // sessionId → QueueModule instance
  }

  async ensureModule(sessionId, { initialize = true } = {}) {
    if (!this.modules.has(sessionId)) {
      const module = await QueueModule.create(this.queueNamesLogger, sessionId);
      this.modules.set(sessionId, module);
      if (initialize) {
        await this.initializeModuleQueues(sessionId);
      }
    }
    return this.modules.get(sessionId);
  }

  async initializeModuleQueues(sessionId) {
    const module = this.getModule(sessionId);
    const results = [];

    for (const base of MODULE_BASES) {
      try {
        await module.generateQueues(base);
        results.push({ base, status: 'ok' });
      } catch (err) {
        results.push({ base, status: 'failed', message: err.message });
        this.logger.error(`Failed to init ${base}_${sessionId}: ${err.message}`);
      }
    }

    const succeeded = results.filter(r => r.status === 'ok').map(r => r.base);
    const failed = results.filter(r => r.status === 'failed');
    if (failed.length > 0) {
      this.logger.warn(
        `Initialized essential queues for ${sessionId} (success: [${succeeded.join(', ')}], failed: [${failed
          .map(f => `${f.base} → ${f.message}`)
          .join('; ')}])`
      );
    } else {
      this.logger.warn(`All essential queues initialized for ${sessionId}: [${succeeded.join(', ')}]`);
    }
  }

  async generateQueues(sessionId, baseName) {
    const module = await this.ensureModule(sessionId, { initialize: false });
    return module.generateQueues(baseName);
  }

  /**
   * Get the QueueModule for a registered session.
   * Throws if missing (strict mode).
   */
  getModule(sessionId) {
    const module = this.modules.get(sessionId);
    if (!module) {
      throw new Error(`QueueModule not found for session ${sessionId}`);
    }
    return module;
  }

  /**
   * Get queues for a sessionId + baseName.
   * Throws if no module or queues missing.
   */
  getQueues(sessionId, baseName, log) {
    try {
      const module = this.getModule(sessionId);
      return module.getQueues(baseName);
    } catch (error) {
      if (log) this.logger.error(`Error getting queues for ${sessionId} base ${baseName} error: ${error}`)
      throw error
    }
    
  }

  /**
   * Delete all queues for a specific sessionId.
   */
  async deleteSessionQueues(sessionId) {
    const module = this.modules.get(sessionId);
    if (module) {
      await module.deleteAllQueues();
      this.modules.delete(sessionId);
    }
  }

    /**
   * Delete only the queues for a specific base name on a given sessionId.
   * Does NOT remove the QueueModule itself unless all queues are gone.
   * @param {string} sessionId
   * @param {string} baseName
   */
  async deleteQueuesByBase(sessionId, baseName) {
    const module = this.modules.get(sessionId);
    if (!module) {
      throw new Error(`No QueueModule found for ${sessionId}`);
    }

    try {
      await module.deleteQueues(baseName);

      // If that was the last base, remove the module entry
      if (Object.keys(module.queueParams).length === 0) {
        this.logger.warn(`deleted last base ${baseName} for ${sessionId}`)
        this.modules.delete(sessionId);
      }

    } catch (err) {
      throw new Error(
        `Failed to delete queues for base "${baseName}" on device ${sessionId}: ${err.message}`
      );
    }
  }

  /**
   * Delete all queues for all sessionIds.
   */
  async deleteAll() {
    for (const [sessionId, module] of this.modules.entries()) {
      await module.deleteAllQueues();
    }
    this.modules.clear();
  }

}

module.exports = QueueManager;
