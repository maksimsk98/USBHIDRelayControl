/**
 * Helper functions for RabbitMQ queue name generation with session_id support.
 *
 * NoGUI backend expects queue names in format: {baseName}_sess_{sessionId}
 * Example: detector_set_sess_7377f5f7198b
 */

/**
 * Generates a session-specific RabbitMQ queue name.
 *
 * This function ensures consistent queue naming format: {baseName}_sess_{sessionId}
 * It handles sessionId with or without 'sess_' prefix to avoid double prefix issues.
 *
 * @param {string} baseName - Base queue name (e.g., 'detector_set', 'pumps_reqv')
 * @param {string} sessionId - Session identifier (e.g., 'sess_7377f5f7198b' or '7377f5f7198b')
 * @returns {string} Queue name in format: {baseName}_sess_{sessionIdWithoutPrefix}
 *
 * @example
 * getRabbitMQQueueName('detector_set', 'sess_7377f5f7198b')
 * // Returns: 'detector_set_sess_7377f5f7198b'
 *
 * getRabbitMQQueueName('main_set', '7377f5f7198b')
 * // Returns: 'main_set_sess_7377f5f7198b'
 */
function getRabbitMQQueueName(baseName, sessionId) {
  if (baseName == null || typeof baseName !== 'string') {
    throw new Error(`Invalid baseName: ${baseName}.`);
  }
  if (baseName == null  || typeof sessionId !== 'string') {
    throw new Error(`Invalid sessionId: ${sessionId}.`);
  }

  if (sessionId === '') return baseName

  // Remove 'sess_' prefix if present to avoid double prefix in result
  // C++ backend expects format: {baseName}_sess_{sessionId}
  // where sessionId does NOT include 'sess_' prefix
  const cleanSessionId = sessionId.startsWith('sess_')
    ? sessionId.substring(5) // Remove 'sess_' prefix (5 characters: 's', 'e', 's', 's', '_')
    : sessionId;

  return `${baseName}_${cleanSessionId}`;
}

/**
 * Extracts base name and session ID from a session-specific queue name.
 *
 * @param {string} queueName - Full queue name (e.g., 'detector_set_sess_7377f5f7198b')
 * @returns {{baseName: string, sessionId: string} | null} Parsed components or null if invalid
 *
 * @example
 * parseRabbitMQQueueName('detector_set_sess_7377f5f7198b')
 * // Returns: { baseName: 'detector_set', sessionId: 'sess_7377f5f7198b' }
 */
function parseRabbitMQQueueName(queueName) {
  if (!queueName || typeof queueName !== 'string') {
    return null;
  }

  // Match pattern: {baseName}_sess_{sessionId}
  const match = queueName.match(/^(.+?)_sess_(.+)$/);
  if (!match) {
    return null;
  }

  return {
    baseName: match[1],
    sessionId: `sess_${match[2]}`,
  };
}

/**
 * Checks if a queue name is session-specific.
 *
 * @param {string} queueName - Queue name to check
 * @returns {boolean} True if queue name contains '_sess_' pattern
 */
function isSessionQueue(queueName) {
  if (!queueName || typeof queueName !== 'string') {
    return false;
  }
  return queueName.includes('_sess_');
}

module.exports = {
  getRabbitMQQueueName,
  parseRabbitMQQueueName,
  isSessionQueue,
};
