import path from 'path';
import fs from 'fs';

/**
 * Screenshot helper class for managing test screenshots
 */
class ScreenshotHelper {
  constructor(options = {}) {
    this.baseDir = options.baseDir || path.join(process.cwd(), 'test-results', 'screenshots');
    this.testFolder = options.testFolder || null;
    this.logger = options.logger || console;
    this.enableLogging = options.enableLogging || false;
    this.ensureDirExists();
  }

  /**
   * Get the full directory path (including test folder if specified)
   */
  getFullDirPath() {
    if (this.testFolder) {
      return path.join(this.baseDir, this.testFolder);
    }
    return this.baseDir;
  }

  /**
   * Ensure screenshot directory exists
   */
  ensureDirExists() {
    const dirPath = this.getFullDirPath();
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      this._log(`Created screenshot directory: ${dirPath}`);
    }
  }

  /**
   * Log message if logging is enabled
   */
  _log(message, data = null) {
    if (this.enableLogging) {
      if (data) {
        this.logger.log(`[ScreenshotHelper] ${message}`, data);
      } else {
        this.logger.log(`[ScreenshotHelper] ${message}`);
      }
    }
  }

  /**
   * Get full path for a screenshot
   * @param {string} filename - Screenshot filename
   * @returns {string} Full path to screenshot
   */
  getPath(filename) {
    return path.join(this.getFullDirPath(), filename);
  }

  /**
   * Set test folder for organizing screenshots
   * @param {string} folderName - Name of the test folder
   */
  setTestFolder(folderName) {
    this.testFolder = folderName;
    this.ensureDirExists();
    this._log(`Test folder set to: ${folderName}`);
  }

  /**
   * Create a new instance for a specific test
   * @param {string} testName - Name of the test
   * @returns {ScreenshotHelper} New ScreenshotHelper instance
   */
  forTest(testName) {
    const sanitizedName = testName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    return new ScreenshotHelper({
      baseDir: this.baseDir,
      testFolder: sanitizedName,
      logger: this.logger,
      enableLogging: this.enableLogging
    });
  }

  /**
   * Take a screenshot of the entire page
   * @param {Object} page - Playwright page object
   * @param {string} name - Screenshot name (without extension)
   * @param {Object} options - Screenshot options
   * @returns {Promise<string>} Path to saved screenshot
   */
  async takeFullPage(page, name, options = {}) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${name}_${timestamp}.png`;
    const filepath = this.getPath(filename);
    
    this._log(`Taking full page screenshot: ${filename}`);
    
    await page.screenshot({
      path: filepath,
      fullPage: true,
      ...options
    });
    
    return filepath;
  }

  /**
   * Take a screenshot of a specific element
   * @param {Object} element - Playwright element locator
   * @param {string} name - Screenshot name (without extension)
   * @param {Object} options - Screenshot options
   * @returns {Promise<string>} Path to saved screenshot
   */
  async takeElement(element, name, options = {}) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${name}_${timestamp}.png`;
    const filepath = this.getPath(filename);
    
    this._log(`Taking element screenshot: ${filename}`);
    
    await element.screenshot({
      path: filepath,
      ...options
    });
    
    return filepath;
  }

  /**
   * Take a screenshot of a specific region
   * @param {Object} page - Playwright page object
   * @param {string} name - Screenshot name (without extension)
   * @param {Object} region - { x, y, width, height }
   * @returns {Promise<string>} Path to saved screenshot
   */
  async takeRegion(page, name, region) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${name}_${timestamp}.png`;
    const filepath = this.getPath(filename);
    
    this._log(`Taking region screenshot: ${filename}`, region);
    
    await page.screenshot({
      path: filepath,
      clip: region
    });
    
    return filepath;
  }

  /**
   * Take screenshot on test failure
   * @param {Object} page - Playwright page object
   * @param {string} testName - Name of the test
   * @param {Object} error - Error object
   * @returns {Promise<string>} Path to saved screenshot
   */
  async takeOnFailure(page, testName, error) {
    const sanitizedName = testName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `FAIL_${sanitizedName}_${timestamp}.png`;
    const filepath = this.getPath(filename);
    
    this._log(`Taking failure screenshot: ${filename}`);
    this._log(`Error: ${error.message}`);
    
    await page.screenshot({
      path: filepath,
      fullPage: true
    });
    
    return filepath;
  }

  /**
   * Take screenshot of step table
   * @param {Object} window - Playwright page object
   * @param {string} name - Screenshot name
   * @returns {Promise<string>} Path to saved screenshot
   */
  async takeStepTable(window, name) {
    const table = window.getByTestId('step-table-container');
    return await this.takeElement(table, `step_table_${name}`);
  }

  /**
   * Clean up old screenshots
   * @param {number} daysOld - Remove screenshots older than this many days
   */
  cleanup(daysOld = 7) {
    const dirPath = this.getFullDirPath();
    const now = Date.now();
    const maxAge = daysOld * 24 * 60 * 60 * 1000;
    
    if (!fs.existsSync(dirPath)) return;
    
    const files = fs.readdirSync(dirPath);
    let deleted = 0;
    
    for (const file of files) {
      const filepath = path.join(dirPath, file);
      const stats = fs.statSync(filepath);
      
      if (now - stats.mtimeMs > maxAge) {
        fs.unlinkSync(filepath);
        deleted++;
      }
    }
    
    this._log(`Cleaned up ${deleted} old screenshots from ${dirPath}`);
  }
}

/**
 * Simple function for backward compatibility
 * @param {string} filename - Screenshot filename
 * @returns {string} Full path to screenshot
 */
export function getScreenshotPath(filename) {
  const baseDir = path.join(process.cwd(), 'test-results', 'screenshots');
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
  return path.join(baseDir, filename);
}

/**
 * Create screenshot helper instance
 * @param {Object} options - Helper options
 * @returns {ScreenshotHelper} ScreenshotHelper instance
 */
export function createScreenshotHelper(options = {}) {
  return new ScreenshotHelper(options);
}

export default ScreenshotHelper;