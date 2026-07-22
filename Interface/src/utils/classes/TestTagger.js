export class TestTagger {
  constructor(config) {
    if (typeof window !== 'undefined') {
      if (!window.__TEST_TAGS) {
        window.__TEST_TAGS = {
          flags: new Map(),
          logs: []
        };
      }
      this.tags = window.__TEST_TAGS;
      this.doLogTestTagToConsole = config?.doLogTestTagToConsole ?? false
    }
  }

  setFlag(flagName, value = true) {
    if (typeof window !== 'undefined') {
      this.tags.flags.set(flagName, value);
      if (this.doLogTestTagToConsole) console.log(`[TEST_TAG] ${flagName} = ${value}`);
    }
  }

  getFlag(flagName) {
    if (typeof window !== 'undefined') {
      return this.tags.flags.get(flagName) || false;
    }
    return false;
  }

  addLog(message, type = 'info') {
    if (typeof window !== 'undefined') {
      this.tags.logs.push({
        message,
        type,
        timestamp: Date.now()
      });
    }
  }

  getLogs() {
    if (typeof window !== 'undefined') {
      return this.tags.logs;
    }
    return [];
  }

  clear() {
    if (typeof window !== 'undefined') {
      this.tags.flags.clear();
      this.tags.logs = [];
    }
  }

  // Helper to check if all required flags are set
  hasAllFlags(flagNames) {
    return flagNames.every(flag => this.getFlag(flag));
  }

  // Helper to check if specific log message exists
  hasLogContaining(text) {
    return this.getLogs().some(log => log.message.includes(text));
  }
}

// Singleton instance
export const testTagger = new TestTagger();