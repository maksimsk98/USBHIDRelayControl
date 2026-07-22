// api-mocks.js
import ApiLogger from "./ApiLogger";
import fs from 'fs';
import path from 'path';

class ApiMocks {
  constructor(page, options = {}) {
    this.page = page;
    this.activeMocks = new Map(); // Track all active mocks
    this.capturedRequests = new Map(); // Store captured requests
    this.captureEnabled = options.captureEnabled || false; // Enable request capture
    this.writeToFileEnabled = options.writeToFileEnabled || true; // Enable writing to file
    this.outputDir = options.outputDir || path.join(process.cwd(), 'test-results', 'api-mocks'); // Output directory
    this.logger = new ApiLogger({
      enabled: options.loggingEnabled || false,
      logger: options.logger || console,
      verbose: options.verboseLogging || false,
      prefix: options.logPrefix || '[API]'
    });
    
    // Ensure output directory exists
    if (this.writeToFileEnabled && !fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Extract endpoint from URL (strip query parameters)
   */
  _extractEndpoint(url) {
    const urlObj = new URL(url);
    return urlObj.pathname;
  }

  /**
   * Generate filename for captured request
   */
  _generateFilename(method, endpoint, timestamp) {
    const sanitizedEndpoint = endpoint.replace(/\//g, '_').replace(/^_/, '');
    return `${method}_${sanitizedEndpoint}_${timestamp}.json`;
  }

  /**
   * Write captured request to file
   */
  _writeToFile(method, endpoint, url, requestData) {
    if (!this.writeToFileEnabled) return;
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = this._generateFilename(method, endpoint, timestamp);
    const filepath = path.join(this.outputDir, filename);
    
    const output = {
      timestamp,
      method,
      endpoint,
      fullUrl: url,
      data: requestData
    };
    
    try {
      fs.writeFileSync(filepath, JSON.stringify(output, null, 2), 'utf8');
      this.logger.log(`📁 Captured request written to: ${filepath}`);
    } catch (error) {
      this.logger.log(`❌ Failed to write captured request to file: ${error.message}`);
    }
  }

  /**
   * Enable/disable request capture
   */
  enableCapture(enabled = true) {
    this.captureEnabled = enabled;
    this.logger.log(`Request capture ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Enable/disable writing to file
   */
  enableWriteToFile(enabled = true, outputDir = null) {
    this.writeToFileEnabled = enabled;
    if (outputDir) {
      this.outputDir = outputDir;
    }
    if (enabled && !fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
    this.logger.log(`Writing to file ${enabled ? 'enabled' : 'disabled'} (output: ${this.outputDir})`);
  }

  /**
   * Set output directory for captured requests
   */
  setOutputDir(outputDir) {
    this.outputDir = outputDir;
    if (this.writeToFileEnabled && !fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
    this.logger.log(`Output directory set to: ${this.outputDir}`);
  }

    /**
   * Write response data to file
   */
  _writeResponseToFile(endpoint, method, responseData, statusCode, requestData) {
    if (!this.writeToFileEnabled) return;
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedEndpoint = endpoint.replace(/\//g, '_').replace(/^_/, '');
    const filename = `response_${method}_${sanitizedEndpoint}_${timestamp}.json`;
    const filepath = path.join(this.outputDir, filename);
    
    const output = {
      timestamp,
      method,
      endpoint,
      statusCode,
      request: requestData,
      response: responseData
    };
    
    try {
      fs.writeFileSync(filepath, JSON.stringify(output, null, 2), 'utf8');
      this.logger.log(`📁 Response written to: ${filepath}`);
    } catch (error) {
      this.logger.log(`❌ Failed to write response to file: ${error.message}`);
    }
  }

  /**
   * Clear captured requests
   */
  clearCapturedRequests() {
    this.capturedRequests.clear();
    this.logger.log('Captured requests cleared');
  }

  /**
   * Get captured requests for a specific endpoint
   * @param {string} endpoint - API endpoint
   * @param {string} method - HTTP method (default: 'POST')
   * @returns {Array} Array of captured requests
   */
  getCapturedRequests(endpoint, method = 'POST') {
    const key = `${method}_${endpoint}`;
    return this.capturedRequests.get(key) || [];
  }

  /**
   * Get the most recent captured request for an endpoint
   * @param {string} endpoint - API endpoint
   * @param {string} method - HTTP method (default: 'POST')
   * @returns {Object|null} Most recent request or null
   */
  getLastCapturedRequest(endpoint, method = 'POST') {
    const requests = this.getCapturedRequests(endpoint, method);
    return requests.length > 0 ? requests[requests.length - 1] : null;
  }

  /**
   * Capture request data
   */
  _captureRequest(method, endpoint, url, requestData) {
    if (!this.captureEnabled) return;
    
    const key = `${method}_${endpoint}`;
    if (!this.capturedRequests.has(key)) {
      this.capturedRequests.set(key, []);
    }
    
    const capture = {
      timestamp: new Date().toISOString(),
      method,
      endpoint,
      fullUrl: url,
      data: requestData
    };
    
    this.capturedRequests.get(key).push(capture);
    this.logger.log(`📝 Captured ${method} request to ${endpoint}`, requestData);
    
    // Write to file if enabled
    this._writeToFile(method, endpoint, url, requestData);
  }

  /**
   * Enable logging for specific endpoint
   */
  enableEndpointLogging(method, endpoint, options = {}) {
    this.logger.setEndpointLogging(method, endpoint, { 
      enabled: true, 
      verbose: options.verbose 
    });
  }

  /**
   * Disable logging for specific endpoint
   */
  disableEndpointLogging(method, endpoint) {
    this.logger.setEndpointLogging(method, endpoint, { enabled: false });
  }

  /**
   * Enable logging for multiple endpoints
   */
  enableEndpointsLogging(endpoints) {
    endpoints.forEach(({ method, endpoint, verbose }) => {
      this.enableEndpointLogging(method, endpoint, { verbose });
    });
  }

  /**
   * Clear all endpoint filters
   */
  clearEndpointFilters() {
    this.logger.clearEndpointFilters();
  }

  /**
   * Enable global logging
   */
  enableLogging(verbose = false) {
    this.logger.setEnabled(true);
    if (verbose !== undefined) {
      this.logger.setVerbose(verbose);
    }
  }

  /**
   * Disable global logging
   */
  disableLogging() {
    this.logger.setEnabled(false);
  }

  /**
   * Set logging options
   */
  setLoggingOptions(options) {
    if (options.enabled !== undefined) {
      this.logger.setEnabled(options.enabled);
    }
    if (options.verbose !== undefined) {
      this.logger.setVerbose(options.verbose);
    }
  }

    /**
   * Write mock to file
   */
  _writeMockToFile(endpoint, method, mockData) {
    if (!this.writeToFileEnabled) return;
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedEndpoint = endpoint.replace(/\//g, '_').replace(/^_/, '');
    const filename = `mock_${method}_${sanitizedEndpoint}_${timestamp}.json`;
    const filepath = path.join(this.outputDir, filename);
    
    const output = {
      timestamp,
      method,
      endpoint,
      data: mockData
    };
    
    try {
      fs.writeFileSync(filepath, JSON.stringify(output, null, 2), 'utf8');
      this.logger.log(`📁 Mock written to: ${filepath}`);
    } catch (error) {
      this.logger.log(`❌ Failed to write mock to file: ${error.message}`);
    }
  }

  async mockGet(endpoint, responseData) {
    const pattern = `http://localhost:5000${endpoint}*`;
    this.activeMocks.set(endpoint, responseData);

    this.logger.logMockRegistration('GET', endpoint, responseData);

    // Write mock to file
    if (this.writeToFileEnabled) {
      this._writeMockToFile(endpoint, 'GET', responseData);
    }
    
    await this.page.route(pattern, async (route) => {
      const data = this.activeMocks.get(endpoint);
      const url = route.request().url();
      
      this.logger.logFulfilled('GET', url, data);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(data),
      });
    });
  }

  async mockPost(endpoint, responseData, statusCode = 200) {
    const pattern = `http://localhost:5000${endpoint}*`;
    const key = `${endpoint}_POST`;
    this.activeMocks.set(key, responseData);

    this.logger.logMockRegistration('POST', endpoint, responseData, statusCode);
    
    // Write mock to file
    if (this.writeToFileEnabled) {
      this._writeMockToFile(endpoint, 'POST', responseData);
    }
    
    await this.page.route(pattern, async (route) => {
      const data = this.activeMocks.get(key);
      const url = route.request().url();
      const postData = route.request().postDataJSON();
      
      const cleanEndpoint = this._extractEndpoint(url);
      
      this._captureRequest('POST', cleanEndpoint, url, postData);
      
      this.logger.logFulfilled('POST', url, data, statusCode, postData);
      
      // Write response to file if capture is enabled
      if (this.captureEnabled && this.writeToFileEnabled) {
        this._writeResponseToFile(cleanEndpoint, 'POST', data, statusCode, postData);
      }

      await route.fulfill({
        status: statusCode,
        contentType: 'application/json',
        body: JSON.stringify(data),
      });
    });
  }

  async clearAllMocks() {
    this.logger.logClearAll();
    await this.page.unroute('**');
    this.activeMocks.clear();
  }

  /**
   * Get all current mocks
   */
  getAllMocks() {
    const mocks = {};
    for (const [key, value] of this.activeMocks.entries()) {
      mocks[key] = JSON.parse(JSON.stringify(value));
    }
    return mocks;
  }

  /**
   * Set multiple mocks at once
   */
  async setMocks(mocks) {
    for (const [endpoint, data] of Object.entries(mocks)) {
      if (endpoint.endsWith('_POST')) {
        await this.mockPost(endpoint.replace('_POST', ''), data);
      } else {
        await this.mockGet(endpoint, data);
      }
    }
  }
}

export default ApiMocks;