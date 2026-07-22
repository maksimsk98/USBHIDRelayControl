/**
 * Registry IPC Client for Electron Main Process
 *
 * This module provides functions for connecting to the Python registry IPC server
 * and managing communication between Electron windows and the StartAll orchestrator.
 *
 * Features:
 * - TCP socket connection to registry server (localhost:5001)
 * - Automatic reconnection with exponential backoff
 * - Heartbeat mechanism for connection health
 * - Message buffering for offline scenarios
 * - Window lifecycle event handling
 */

const net = require('net');

// Registry IPC constants (configurable via CLI arguments or environment variables)
// CLI arguments take precedence over environment variables, which take precedence over defaults
// Format: --registry-host <host> --registry-port <port>
// Environment: PEAKEXPERT_REGISTRY_HOST, PEAKEXPERT_REGISTRY_PORT
const REGISTRY_HOST = (() => {
  const hostArgIndex = process.argv.indexOf('--registry-host');
  if (hostArgIndex !== -1 && hostArgIndex + 1 < process.argv.length) {
    return process.argv[hostArgIndex + 1];
  }
  return process.env.PEAKEXPERT_REGISTRY_HOST || '127.0.0.1';
})();

const REGISTRY_PORT = (() => {
  const portArgIndex = process.argv.indexOf('--registry-port');
  if (portArgIndex !== -1 && portArgIndex + 1 < process.argv.length) {
    return parseInt(process.argv[portArgIndex + 1], 10);
  }
  return parseInt(process.env.PEAKEXPERT_REGISTRY_PORT || '5001', 10);
})();

const HEARTBEAT_INTERVAL_MS = 10000; // 10 seconds
const CONNECTION_TIMEOUT_MS = 5000;
const MAX_MESSAGE_SIZE = 64 * 1024; // 64 KB
const MAX_RETRY_ATTEMPTS = 5;
const RETRY_DELAY_MS = 2000;

/**
 * Registry IPC Client class
 *
 * Manages connection to Python registry server, handles reconnection,
 * heartbeats, and message sending/receiving.
 */
class RegistryClient {
  /**
   * Create a new RegistryClient instance
   *
   * @param {string} sessionId - Session ID for this Electron window
   * @param {Object} mainWindow - Electron BrowserWindow instance
   * @param {boolean} isOfflineMode - Whether running in offline mode
   */
  constructor(sessionId, mainWindow, isOfflineMode = false) {
    this.sessionId = sessionId;
    this.mainWindow = mainWindow;
    this.isOfflineMode = isOfflineMode;

    this.client = null;
    this.retryAttempts = 0;
    this.heartbeatInterval = null;
    this.messageBuffer = [];
    this.isConnecting = false;
  }

  /**
   * Connect to registry IPC server
   *
   * @returns {void}
   */
  connect() {
    if (!this.sessionId || this.isOfflineMode) {
      return;
    }

    if (this.isConnecting || (this.client && !this.client.destroyed)) {
      return; // Already connecting or connected
    }

    this.isConnecting = true;
    this.retryAttempts = 0;

    console.log(`[Registry] Connecting to registry server at ${REGISTRY_HOST}:${REGISTRY_PORT}...`);

    const client = new net.Socket();
    client.setTimeout(CONNECTION_TIMEOUT_MS);

    client.on('connect', () => {
      console.log('[Registry] Connected to registry server');
      this.isConnecting = false;
      this.retryAttempts = 0;
      this.client = client;

      // Disable timeout after successful connection
      // The timeout was only needed for connection establishment, not for ongoing communication
      client.setTimeout(0);

      // Send window_created event
      const windowId = this.mainWindow && this.mainWindow.id
        ? `win_${Date.now()}_${this.mainWindow.id}`
        : `win_${Date.now()}_${process.pid}`;

      this.sendMessage({
        type: 'window_created',
        session_id: this.sessionId,
        window_id: windowId,
      });

      // Start heartbeat
      this.startHeartbeat();

      // Flush any buffered messages
      this.flushMessageBuffer();
    });

    client.on('data', (data) => {
      this.handleMessage(data);
    });

    client.on('error', (err) => {
      console.error('[Registry] Connection error:', err);
      this.handleConnectionError();
    });

    client.on('close', () => {
      console.log('[Registry] Connection closed');
      this.client = null;
      this.stopHeartbeat();
      this.handleConnectionError();
    });

    client.on('timeout', () => {
      console.error('[Registry] Connection timeout');
      client.destroy();
      this.handleConnectionError();
    });

    // Attempt connection
    try {
      client.connect(REGISTRY_PORT, REGISTRY_HOST);
    } catch (err) {
      console.error('[Registry] Failed to connect:', err);
      this.isConnecting = false;
      this.scheduleRetry();
    }
  }

  /**
   * Handle connection error and schedule retry
   *
   * @returns {void}
   */
  handleConnectionError() {
    this.isConnecting = false;

    if (this.retryAttempts < MAX_RETRY_ATTEMPTS) {
      this.scheduleRetry();
    } else {
      console.error('[Registry] Max retry attempts reached. Giving up.');
    }
  }

  /**
   * Schedule retry connection with exponential backoff
   *
   * @returns {void}
   */
  scheduleRetry() {
    this.retryAttempts += 1;
    const delay = RETRY_DELAY_MS * (2 ** (this.retryAttempts - 1));

    console.log(`[Registry] Scheduling retry ${this.retryAttempts}/${MAX_RETRY_ATTEMPTS} in ${delay}ms...`);

    setTimeout(() => {
      if (this.sessionId && !this.isOfflineMode && this.mainWindow
        && !this.mainWindow.isDestroyed()) {
        this.connect();
      }
    }, delay);
  }

  /**
   * Send message to registry server
   *
   * @param {Object} message - Message object to send
   * @returns {void}
   */
  sendMessage(message) {
    if (!this.client || this.client.destroyed) {
      // Buffer message for later
      this.messageBuffer.push(message);
      return;
    }

    try {
      const messageStr = JSON.stringify(message);
      const messageBytes = Buffer.from(messageStr, 'utf-8');
      const messageLength = messageBytes.length;

      if (messageLength > MAX_MESSAGE_SIZE) {
        console.error(`[Registry] Message too large: ${messageLength} bytes`);
        return;
      }

      // Send: 4-byte length (big-endian) + message data
      const lengthBuffer = Buffer.allocUnsafe(4);
      lengthBuffer.writeUInt32BE(messageLength, 0);

      this.client.write(lengthBuffer);
      this.client.write(messageBytes);
    } catch (err) {
      console.error('[Registry] Error sending message:', err);
      // Buffer message for retry
      this.messageBuffer.push(message);
    }
  }

  /**
   * Flush buffered messages
   *
   * @returns {void}
   */
  flushMessageBuffer() {
    if (!this.client || this.client.destroyed || this.messageBuffer.length === 0) {
      return;
    }

    const messages = this.messageBuffer.slice();
    this.messageBuffer = [];

    messages.forEach((message) => this.sendMessage(message));
  }

  /**
   * Start heartbeat timer
   *
   * @returns {void}
   */
  startHeartbeat() {
    if (this.heartbeatInterval) {
      return; // Already started
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.sessionId && this.client && !this.client.destroyed) {
        this.sendMessage({
          type: 'heartbeat',
          session_id: this.sessionId,
        });
      } else {
        this.stopHeartbeat();
      }
    }, HEARTBEAT_INTERVAL_MS);

    console.log('[Registry] Heartbeat started');
  }

  /**
   * Stop heartbeat timer
   *
   * @returns {void}
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      console.log('[Registry] Heartbeat stopped');
    }
  }

  /**
   * Handle incoming message from registry server
   *
   * @param {Buffer} data - Received data
   * @returns {void}
   */
  handleMessage(data) {
    // Messages are sent as: 4-byte length + JSON data
    // For simplicity, we'll handle complete messages only
    // In production, you might need to handle partial messages

    try {
      if (data.length < 4) {
        return; // Incomplete message
      }

      const messageLength = data.readUInt32BE(0);

      if (messageLength > MAX_MESSAGE_SIZE) {
        console.error(`[Registry] Message too large: ${messageLength} bytes`);
        return;
      }

      if (data.length < 4 + messageLength) {
        return; // Incomplete message
      }

      const messageData = data.slice(4, 4 + messageLength);
      const messageStr = messageData.toString('utf-8');
      const message = JSON.parse(messageStr);

      // Handle command from server
      if (message.type === 'close_window') {
        console.log('[Registry] Received close_window command');
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.close();
        }
      } else if (message.type === 'backend_died') {
        console.log('[Registry] Received backend_died notification');
        // Optionally show notification to user
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('registry:backend-died', {
            session_id: message.session_id,
          });
        }
      }
    } catch (err) {
      console.error('[Registry] Error handling message:', err);
    }
  }

  /**
   * Send window_closing event
   *
   * @returns {void}
   */
  sendWindowClosing() {
    if (!this.sessionId || !this.client || this.client.destroyed) {
      console.warn('[Registry] Cannot send window_closing: client not available or destroyed');
      return;
    }

    try {
      const windowId = this.mainWindow && this.mainWindow.id
        ? `win_${Date.now()}_${this.mainWindow.id}`
        : `win_${Date.now()}_${process.pid}`;

      console.log(`[Registry] Sending window_closing event for session ${this.sessionId}, window ${windowId}`);

      // Flush buffer first to ensure any pending messages are sent
      this.flushMessageBuffer();

      // Send window_closing message
      this.sendMessage({
        type: 'window_closing',
        session_id: this.sessionId,
        window_id: windowId,
      });

      // Wait a bit to ensure message is sent (synchronous write should be fast, but just in case)
      // Note: This is a best-effort attempt. The main.js setTimeout handles the actual delay.
      console.log('[Registry] window_closing event sent');
    } catch (err) {
      console.error('[Registry] Error sending window_closing event:', err);
    }
  }

  /**
   * Disconnect and cleanup
   *
   * @returns {void}
   */
  disconnect() {
    this.stopHeartbeat();
    if (this.client && !this.client.destroyed) {
      this.client.destroy();
      this.client = null;
    }
    this.messageBuffer = [];
    this.isConnecting = false;
  }
}

module.exports = RegistryClient;
