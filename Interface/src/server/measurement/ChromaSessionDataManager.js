const _ = require('lodash');
const ChromaMeasurementData = require('./ChromaMeasurementData');

class ChromaSessionDataManager {
  constructor() {
    this.sessions = new Map(); // sessionId -> SessionData instance
  }

  // Get session or create new one
  getSession(sessionId) {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, new SessionData(sessionId));
    }
    return this.sessions.get(sessionId);
  }

  // Get measurement data for a session
  getMeasurementData(sessionId, measurementName, customInitValues = {}) {
    const session = this.getSession(sessionId);
    return session.getMeasurementData(measurementName, customInitValues);
  }

  // Check if measurement exists
  hasMeasurement(sessionId, measurementName) {
    const session = this.getSession(sessionId);
    return session.hasMeasurement(measurementName);
  }

  // Clear all stored data for a measurement
  clearStoredData(sessionId, measurementName, useDeepReset = false) {
    const measurementData = this.getMeasurementData(sessionId, measurementName);
    const mode = useDeepReset ? 'toInit' : 'toEmpty';
    measurementData.clearStoredData(mode);
  }

  // Clear only point data for a measurement
  clearPointsOnly(sessionId, measurementName) {
    const measurementData = this.getMeasurementData(sessionId, measurementName);
    measurementData.clearPointsOnly();
  }

  // Clear point data from batches
  clearPointDataFromBatches(sessionId, measurementName) {
    const measurementData = this.getMeasurementData(sessionId, measurementName);
    measurementData.clearPointDataFromBatches();
  }

  // Get data for /listen endpoint
  getDataForListen(sessionId, measurementName) {
    const measurementData = this.getMeasurementData(sessionId, measurementName);
    return measurementData.getDataForListen();
  }

  // Add batch to measurement
  addBatch(sessionId, measurementName) {
    const measurementData = this.getMeasurementData(sessionId, measurementName);
    measurementData.addBatch();
  }

  // Check if measurement has pending batches
  hasPendingBatches(sessionId, measurementName) {
    const measurementData = this.getMeasurementData(sessionId, measurementName);
    return !_.isEmpty(measurementData.batches);
  }

  // Clean up a specific measurement
  cleanupMeasurement(sessionId, measurementName) {
    const session = this.getSession(sessionId);
    session.cleanupMeasurement(measurementName);
    
    // If session is empty, clean it up too
    if (session.isEmpty()) {
      this.sessions.delete(sessionId);
    }
  }

  // Clean up entire session
  cleanupSession(sessionId) {
    const session = this.getSession(sessionId);
    const measurementNames = session.getAllMeasurements();
    
    measurementNames.forEach(measurementName => {
      session.cleanupMeasurement(measurementName);
    });
    
    this.sessions.delete(sessionId);
  }

  // Get all sessions (for debugging)
  getAllSessions() {
    return Array.from(this.sessions.keys());
  }

  // Get all measurements for a session
  getSessionMeasurements(sessionId) {
    const session = this.getSession(sessionId);
    return session.getAllMeasurements();
  }

  // Cleanup old sessions
  cleanupOldSessions(maxAgeMs = 3600000) {
    const now = Date.now();
    const sessionsToDelete = [];
    
    this.sessions.forEach((session, sessionId) => {
      if (now - session.lastActivity > maxAgeMs) {
        sessionsToDelete.push(sessionId);
      }
    });
    
    sessionsToDelete.forEach(sessionId => {
      this.cleanupSession(sessionId);
    });
    
    return sessionsToDelete.length;
  }

  
  // Channel management
  setChannel(sessionId, measurementName, channelType, channel) {
    const session = this.getSession(sessionId);
    session.setChannel(measurementName, channelType, channel);
  }

  getChannel(sessionId, measurementName, channelType) {
    const session = this.getSession(sessionId);
    return session.getChannel(measurementName, channelType);
  }

  getAllChannels(sessionId, measurementName) {
    const session = this.getSession(sessionId);
    return session.getAllChannels(measurementName);
  }

  removeChannel(sessionId, measurementName, channelType) {
    const session = this.getSession(sessionId);
    session.removeChannel(measurementName, channelType);
  }

  // Consumer tags
  setConsumerTag(sessionId, measurementName, consumerTag) {
    const session = this.getSession(sessionId);
    session.setConsumerTag(measurementName, consumerTag);
  }

  getConsumerTag(sessionId, measurementName) {
    const session = this.getSession(sessionId);
    return session.getConsumerTag(measurementName);
  }

  removeConsumerTag(sessionId, measurementName) {
    const session = this.getSession(sessionId);
    session.removeConsumerTag(measurementName);
  }

  // Polling intervals
  setPollingInterval(sessionId, measurementName, intervalId) {
    const session = this.getSession(sessionId);
    session.setPollingInterval(measurementName, intervalId);
  }

  getPollingInterval(sessionId, measurementName) {
    const session = this.getSession(sessionId);
    return session.getPollingInterval(measurementName);
  }

  removePollingInterval(sessionId, measurementName) {
    const session = this.getSession(sessionId);
    session.removePollingInterval(measurementName);
  }

  // Pending markers
  setPendingMarker(sessionId, measurementName, value) {
    const session = this.getSession(sessionId);
    session.setPendingMarker(measurementName, value);
  }

  getPendingMarker(sessionId, measurementName) {
    const session = this.getSession(sessionId);
    return session.getPendingMarker(measurementName);
  }

  clearPendingMarker(sessionId, measurementName) {
    const session = this.getSession(sessionId);
    session.clearPendingMarker(measurementName);
  }

  // Cleanup helpers
  cancelPollingInterval(sessionId, measurementName) {
    const intervalId = this.getPollingInterval(sessionId, measurementName);
    if (intervalId) {
      clearInterval(intervalId);
      this.removePollingInterval(sessionId, measurementName);
      return true;
    }
    return false;
  }

  async cancelConsumingMeasure(sessionId, measurementName) {
    const consumerTag = this.getConsumerTag(sessionId, measurementName);
    if (consumerTag) {
      const channel = this.getChannel(sessionId, measurementName, 'measurementChannelGet');
      if (channel) {
        await channel.cancel(consumerTag);
        this.removeConsumerTag(sessionId, measurementName);
        return true;
      }
    }
    return false;
  }
}

class SessionData {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.measurements = new Map(); // measurementName -> ChromaMeasurementData
    
    // Per-measurement tracking within this session
    this.channelMap = new Map(); // measurementName -> { channelPost, measurementChannelGet }
    this.consumerTags = new Map(); // measurementName -> consumerTag
    this.pollingIntervals = new Map(); // measurementName -> intervalId
    this.pendingMarkers = new Map(); // measurementName -> boolean
    
    this.lastActivity = Date.now();
  }

  // Measurement data methods
  getMeasurementData(measurementName, customInitValues = {}) {
    if (!this.measurements.has(measurementName)) {
      this.measurements.set(
        measurementName, 
        new ChromaMeasurementData(measurementName, customInitValues)
      );
    }
    this.lastActivity = Date.now();
    return this.measurements.get(measurementName);
  }

  hasMeasurement(measurementName) {
    return this.measurements.has(measurementName);
  }

  // Channel management
  setChannel(measurementName, channelType, channel) {
    if (!this.channelMap.has(measurementName)) {
      this.channelMap.set(measurementName, {});
    }
    const channels = this.channelMap.get(measurementName);
    channels[channelType] = channel;
    this.lastActivity = Date.now();
  }

  getChannel(measurementName, channelType) {
    const channels = this.channelMap.get(measurementName);
    return channels ? channels[channelType] : undefined;
  }

  getAllChannels(measurementName) {
    return this.channelMap.get(measurementName) || {};
  }

  removeChannel(measurementName, channelType) {
    const channels = this.channelMap.get(measurementName);
    if (channels) {
      delete channels[channelType];
      // If no channels left, remove the entry
      if (Object.keys(channels).length === 0) {
        this.channelMap.delete(measurementName);
      }
    }
  }

  // Consumer tags
  setConsumerTag(measurementName, consumerTag) {
    this.consumerTags.set(measurementName, consumerTag);
    this.lastActivity = Date.now();
  }

  getConsumerTag(measurementName) {
    return this.consumerTags.get(measurementName);
  }

  removeConsumerTag(measurementName) {
    this.consumerTags.delete(measurementName);
  }

  // Polling intervals
  setPollingInterval(measurementName, intervalId) {
    this.pollingIntervals.set(measurementName, intervalId);
    this.lastActivity = Date.now();
  }

  getPollingInterval(measurementName) {
    return this.pollingIntervals.get(measurementName);
  }

  removePollingInterval(measurementName) {
    this.pollingIntervals.delete(measurementName);
  }

  // Pending markers
  setPendingMarker(measurementName, value) {
    this.pendingMarkers.set(measurementName, value);
    this.lastActivity = Date.now();
  }

  getPendingMarker(measurementName) {
    return this.pendingMarkers.get(measurementName) || false;
  }

  clearPendingMarker(measurementName) {
    this.pendingMarkers.delete(measurementName);
  }

  // Cleanup a measurement
  cleanupMeasurement(measurementName) {
    // Clear polling interval if exists
    const intervalId = this.pollingIntervals.get(measurementName);
    if (intervalId) {
      clearInterval(intervalId);
      this.pollingIntervals.delete(measurementName);
    }

    // Clear measurement data
    const measurementData = this.measurements.get(measurementName);
    if (measurementData) {
      measurementData.clearStoredData('toEmpty');
      this.measurements.delete(measurementName);
    }

    // Remove all other references
    this.channelMap.delete(measurementName);
    this.consumerTags.delete(measurementName);
    this.pendingMarkers.delete(measurementName);
    
    this.lastActivity = Date.now();
  }

  isEmpty() {
    return this.measurements.size === 0;
  }

  getAllMeasurements() {
    return Array.from(this.measurements.keys());
  }

  // Get session stats
  getStats() {
    return {
      sessionId: this.sessionId,
      measurementCount: this.measurements.size,
      measurements: this.getAllMeasurements(),
      hasPendingMarkers: Array.from(this.pendingMarkers.values()).filter(Boolean).length,
      lastActivity: this.lastActivity,
      age: Date.now() - this.lastActivity,
    };
  }
}

// Export singleton
module.exports = new ChromaSessionDataManager();