// api-logger.js
class ApiLogger {
  constructor(options = {}) {
    this.enabled = options.enabled || false;
    this.logger = options.logger || console;
    this.prefix = options.prefix || '[API]';
    this.verbose = options.verbose || false;
    
    // Track specific endpoints to log
    this.filteredEndpoints = new Map(); // key: "METHOD:endpoint", value: { enabled, verbose }
  }

  /**
   * Enable/disable logging for a specific endpoint and method
   * @param {string} method - HTTP method (GET, POST, etc.)
   * @param {string} endpoint - API endpoint
   * @param {Object} options - { enabled: boolean, verbose: boolean }
   */
  setEndpointLogging(method, endpoint, options = { enabled: true, verbose: null }) {
    const key = `${method}:${endpoint}`;
    this.filteredEndpoints.set(key, {
      enabled: options.enabled,
      verbose: options.verbose !== undefined ? options.verbose : this.verbose
    });
    
    if (this.enabled) {
      this.log(`${this.prefix} Endpoint logging configured for ${method} ${endpoint} → enabled: ${options.enabled}`);
    }
  }

  /**
   * Enable logging for multiple endpoints
   * @param {Array} endpoints - Array of { method, endpoint, options }
   */
  setEndpointsLogging(endpoints) {
    endpoints.forEach(({ method, endpoint, options }) => {
      this.setEndpointLogging(method, endpoint, options);
    });
  }

  /**
   * Disable logging for a specific endpoint
   */
  disableEndpointLogging(method, endpoint) {
    this.setEndpointLogging(method, endpoint, { enabled: false });
  }

  /**
   * Clear all endpoint filters
   */
  clearEndpointFilters() {
    this.filteredEndpoints.clear();
    if (this.enabled) {
      this.log(`${this.prefix} All endpoint filters cleared`);
    }
  }

  /**
   * Check if logging should occur for this endpoint/method
   * @returns {boolean} should log
   * @returns {Object|null} logging config if should log
   */
  _shouldLog(method, endpoint) {
    // If no filters defined, use global settings
    if (this.filteredEndpoints.size === 0) {
      return this.enabled ? { enabled: true, verbose: this.verbose } : null;
    }
    
    // Check for exact match
    const key = `${method}:${endpoint}`;
    const filter = this.filteredEndpoints.get(key);
    
    // Also check for wildcard endpoint
    const wildcardKey = `${method}:*`;
    const wildcardFilter = this.filteredEndpoints.get(wildcardKey);
    
    const activeFilter = filter || wildcardFilter;
    
    if (activeFilter && activeFilter.enabled) {
      return {
        enabled: true,
        verbose: activeFilter.verbose !== null ? activeFilter.verbose : this.verbose
      };
    }
    
    return null;
  }

  /**
   * Enable/disable logging
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    if (this.enabled) {
      this.log(`${this.prefix} API Mock logging enabled`);
    } else {
      this.log(`${this.prefix} API Mock logging disabled`);
    }
  }

  /**
   * Set verbosity (show full response bodies)
   */
  setVerbose(verbose) {
    this.verbose = verbose;
  }

  /**
   * Log mock registration
   */
  logMockRegistration(method, endpoint, data, statusCode = 200) {
    const shouldLog = this._shouldLog(method, endpoint);
    if (!shouldLog) return;
    
    this.log(`${this.prefix} REGISTERED MOCK ${method} ${endpoint} → ${statusCode}`);
    if (shouldLog.verbose) {
      this.log(`   Response:`, JSON.stringify(data, null, 2));
    } else {
      this.log(`   Response: ${this._truncate(JSON.stringify(data))}`);
    }
  }

  /**
   * Log when a mock is fulfilled
   */
  logFulfilled(method, url, data, statusCode = 200, requestData = null) {
    // Extract endpoint from URL
    const urlObj = new URL(url);
    const endpoint = urlObj.pathname;
    
    const shouldLog = this._shouldLog(method, endpoint);
    if (!shouldLog) return;
    
    this.log(`✅ FULFILLED ${method} ${url}`);
    this.log(`   Status: ${statusCode}`);
    
    if (requestData && shouldLog.verbose) {
      this.log(`   Request:`, JSON.stringify(requestData, null, 2));
    } else if (requestData) {
      this.log(`   Request: ${this._truncate(JSON.stringify(requestData))}`);
    }
    
    if (shouldLog.verbose) {
      this.log(`   Response:`, JSON.stringify(data, null, 2));
    } else {
      this.log(`   Response: ${this._truncate(JSON.stringify(data))}`);
    }
  }

  /**
   * Log mock update
   */
  logMockUpdate(endpoint, method, data) {
    const shouldLog = this._shouldLog(method, endpoint);
    if (!shouldLog) return;
    
    this.log(`🔄 Updated mock for ${method} ${endpoint}`);
    if (shouldLog.verbose && data) {
      this.log(`   New data:`, JSON.stringify(data, null, 2));
    }
  }

  /**
   * Log error
   */
  logError(endpoint, method, error) {
    const shouldLog = this._shouldLog(method, endpoint);
    if (!shouldLog) return;
    
    this.log(`❌ Error in mock for ${method} ${endpoint}:`, error);
  }

  /**
   * Internal log method
   */
  log(...args) {
    this.logger.log(...args);
  }

  logClearAll() {
    if (!this.enabled) return;
    
    this.log(`${this.prefix} Clearing all mocks...`);
  }

  /**
   * Truncate long strings
   */
  _truncate(str, maxLength = 100) {
    if (!str) return 'undefined';
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
  }
}

export default ApiLogger;