const PLOT_EXPORT_LOGGER_ON = false;

const logger = (...args) => {
  if (!PLOT_EXPORT_LOGGER_ON) return;

  console.log('[PLOT REGTISTER]', ...args);
};

class PlotExportRegistry {
  constructor() {
    this.map = new Map(); // key: `${tabId}:${plotType}`

    this.version = 0;
    this.subscribers = new Set();
  }

  register(tabId, plotType, extractorFn) {
    this.map.set(`${tabId}:${plotType}`, extractorFn);
    logger(`Registered: ${tabId}, ${plotType}`);

    this.notify();
  }

  get(tabId, plotType) {
    return this.map.get(`${tabId}:${plotType}`) || null;
  }

  unregister(tabId, plotType) {
    this.map.delete(`${tabId}:${plotType}`);
    logger(`Unregistered: ${tabId}, ${plotType}`);

    this.notify();
  }

  getVersion() {
    return this.version;
  }

  getAllSignals(tabId) {
    const prefix = `${tabId}:signals:`;
    const entries = [];

    for (const [key, extractor] of this.map.entries()) {
      if (key.startsWith(prefix)) {
        const initiator = key.slice(prefix.length);
        entries.push([initiator, extractor]);
      }
    }

    return entries;
  }

  notify() {
    this.version++;
    for (const cb of this.subscribers) {
      cb(this.version);
    }
  }

  subscribe(cb) {
    this.subscribers.add(cb);
    return () => this.subscribers.delete(cb);
  }
}

export const plotExportRegistry = new PlotExportRegistry();
