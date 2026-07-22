export class Logger {
  constructor(prefix, enabled = false) {
    this.prefix = prefix;
    this.enabled = enabled;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  log(message, ...args) {
    if (!this.enabled) return;
    console.log(`[${this.prefix}] ${message}`, ...args);
  }

  error(message, ...args) {
    if (!this.enabled) return;
    console.error(`[${this.prefix}] ${message}`, ...args);
  }

  groupCollapsed(label, ...args) {
    if (!this.enabled) return;
    console.groupCollapsed(`[${this.prefix}] ${label}`, ...args);
  }

  groupEnd() {
    if (!this.enabled) return;
    console.groupEnd();
  }
}