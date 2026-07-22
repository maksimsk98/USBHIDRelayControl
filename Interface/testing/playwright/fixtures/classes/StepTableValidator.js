import { DETECTOR_TYPES } from '../../../../src/constants/constants.js';
import { expect } from '../../fixtures/electronFixtures.js'

// ==================== StepChecker ====================
class StepChecker {
  constructor(stepTableHelper, logger) {
    this.stepTableHelper = stepTableHelper;
    this.logger = logger;
    this.detectorType = null;
  }

  setDetectorType(detectorType) {
    this.detectorType = detectorType;
    this._log(`Detector type set to: ${detectorType}`);
  }

  _log(message, data = null) {
    if (this.logger) {
      if (data) {
        this.logger.log(`[StepChecker] ${message}`, data);
      } else {
        this.logger.log(`[StepChecker] ${message}`);
      }
    }
  }

  async _checkGenericStep(stepIndex, stepData) {
    await this.stepTableHelper.checkInput('stepId', stepIndex, stepIndex + 1);
    await this.stepTableHelper.checkInput('from', stepIndex, stepData.from);
    await this.stepTableHelper.checkInput('to', stepIndex, stepData.to);
    
    if (stepData.component !== undefined) {
      await this.stepTableHelper.checkInput('component', stepIndex, stepData.component || '');
    }
  }

  async _checkDADStep(stepIndex, stepData) {
    await this.stepTableHelper.checkInput('sample_wl', stepIndex, stepData.sample_wl);
    await this.stepTableHelper.checkInput('sample_bw', stepIndex, stepData.sample_bw);
    await this.stepTableHelper.checkSelect('sample_rate', stepIndex, stepData.sample_rate);
    await this.stepTableHelper.checkSelect('time_constant', stepIndex, stepData.time_constant);
  }

  async _checkFluoratStep(stepIndex, stepData) {
    await this.stepTableHelper.checkInput('excitFilter', stepIndex, stepData.excitFilter || '');
    await this.stepTableHelper.checkInput('regFilter', stepIndex, stepData.regFilter || '');
    await this.stepTableHelper.checkSelect('sensitivity', stepIndex, stepData.sensitivity);
  }

  async _checkPanoramaStep(stepIndex, stepData) {
    await this.stepTableHelper.checkInput('lambdaEx', stepIndex, stepData.lambdaEx);
    await this.stepTableHelper.checkInput('lambdaReg', stepIndex, stepData.lambdaReg);
    await this.stepTableHelper.checkSelect('sensitivity', stepIndex, stepData.sensitivity);
  }

  async checkStep(stepIndex, stepData) {
    this._log(`Checking step ${stepIndex}`, stepData);
    
    await this._checkGenericStep(stepIndex, stepData);
    
    switch (this.detectorType) {
      case DETECTOR_TYPES.DAD:
        await this._checkDADStep(stepIndex, stepData);
        break;
      case DETECTOR_TYPES.FLUORAT:
        await this._checkFluoratStep(stepIndex, stepData);
        break;
      case DETECTOR_TYPES.PANORAMA:
        await this._checkPanoramaStep(stepIndex, stepData);
        break;
      case DETECTOR_TYPES.RID:
        this._log(`RID step ${stepIndex} verified`);
        break;
      default:
        this._log(`Unknown detector type: ${this.detectorType}, only generic fields checked`);
    }
  }

  async verifyStepsData(stepsData) {
    this._log(`Verifying ${stepsData.length} steps for detector: ${this.detectorType}`);
    this._log(`Expected detector program ${JSON.stringify(stepsData)}`);
    
    const rowCount = await this.stepTableHelper.getRowCount();
    await this.stepTableHelper.expect(rowCount).toBe(stepsData.length);
    
    for (let i = 0; i < stepsData.length; i++) {
      await this.checkStep(i, stepsData[i]);
    }
    
    this._log('✅ Steps verified successfully');
  }
}

class StepTableHelper {
  constructor(window, options = {}) {
    this.window = window;
    this.expect = options.expect || expect;
    this.logger = options.logger || console;
    this.enableLogging = options.enableLogging || false;
    this.testIdPrefix = options.testIdPrefix || 'step-table';

    // Initialize step checker with this instance
    this.stepChecker = new StepChecker(this, this.logger);
    
    // Set detector type if provided
    if (options.detectorType) {
      this.setDetectorType(options.detectorType);
    }
  }

   /**
   * Set detector type for step checking
   */
  setDetectorType(detectorType) {
    this.stepChecker.setDetectorType(detectorType);
  }

  /**
   * Generate test ID based on field name, step index, and type
   */
  _getTestId(fieldName, stepIndex, type) {
    return `${this.testIdPrefix}-${fieldName}-${stepIndex}-${type}`;
  }

  /**
   * Log message if logging is enabled
   */
  _log(message, data = null) {
    if (this.enableLogging) {
      if (data) {
        this.logger.log(`[StepTableHelper] ${message}`, data);
      } else {
        this.logger.log(`[StepTableHelper] ${message}`);
      }
    }
  }

  /**
   * Check an input field value
   */
  async checkInput(fieldName, stepIndex, expectedValue) {
    const testId = this._getTestId(fieldName, stepIndex, 'input');
    
    this._log(`Checking ${fieldName}[${stepIndex}] expects "${expectedValue}"`);
    
    const input = this.window.getByTestId(testId);
    await this.expect(input).toHaveValue(String(expectedValue));
    
    return input;
  }

  /**
   * Check a select field value
   */
  async checkSelect(fieldName, stepIndex, expectedValue) {
    const testId = this._getTestId(fieldName, stepIndex, 'select');
    
    this._log(`Checking select ${fieldName}[${stepIndex}] expects "${expectedValue}"`);
    
    const select = this.window.getByTestId(testId);
    await this.expect(select).toBeVisible();
    await this.expect(select).toHaveValue(String(expectedValue));
    await this.expect(select.locator('option:checked')).toHaveText(String(expectedValue));
    
    return select;
  }

  /**
   * Verify steps data using the step checker
   */
  async verifyStepsData(stepsData) {
    await this.stepChecker.verifyStepsData(stepsData);
  }

  /**
   * Override step verification with custom function
   * @param {Function} customVerifyFn - Custom verification function
   */
  setCustomStepVerification(customVerifyFn) {
    this.stepChecker.checkStep = customVerifyFn.bind(this.stepChecker);
  }

  /**
   * Check a TD container exists
   */
  async checkTD(fieldName, stepIndex, options = {}) {
    const { type = 'inputTD' } = options;
    const testId = this._getTestId(fieldName, stepIndex, type);
    
    this._log(`Checking TD container for ${fieldName}[${stepIndex}]`);
    
    const td = this.window.getByTestId(testId);
    await this.expect(td).toBeVisible();
    
    return td;
  }

  /**
   * Get a specific input element
   */
  getInput(fieldName, stepIndex) {
    const testId = this._getTestId(fieldName, stepIndex, 'input');
    return this.window.getByTestId(testId);
  }

  /**
   * Get a specific select element
   */
  getSelect(fieldName, stepIndex) {
    const testId = this._getTestId(fieldName, stepIndex, 'select');
    return this.window.getByTestId(testId);
  }

  /**
   * Get a specific TD container
   */
  getTD(fieldName, stepIndex, type = 'inputTD') {
    const testId = this._getTestId(fieldName, stepIndex, type);
    return this.window.getByTestId(testId);
  }

    /**
     * Verify select options are correct
     * @param {string} fieldName - Name of the field
     * @param {number} stepIndex - Index of the step
     * @param {Array} expectedOptions - Expected options (numbers or strings)
     * @param {Object} options - Options object
     * @param {boolean} options.convertToString - Convert numbers to strings (default: true)
     * @returns {Promise<Array>} The actual options from the UI
     */
  async verifySelectOptions(fieldName, stepIndex, expectedOptions, options = {}) {
    const { convertToString = true } = options;
    
    const select = this.getSelect(fieldName, stepIndex);
    const actualOptions = await select.locator('option').allTextContents();
    
    // Convert expected options to strings if needed
    const expectedStrings = convertToString 
        ? expectedOptions.map(opt => String(opt))
        : expectedOptions;
    
    this._log(`Verifying options for ${fieldName}[${stepIndex}]`, {
        expected: expectedStrings,
        actual: actualOptions
    });
    
    await this.expect(actualOptions).toEqual(expectedStrings);
    return actualOptions;
    }

  /**
   * Wait for table to be ready
   */
  async waitForReady(timeout = 10000) {
    this._log('Waiting for table to be ready');
    await this.window.getByTestId('step-table-container').waitFor({ timeout });
  }

  /**
   * Get row count from the table
   */
  async getRowCount() {
    const rows = this.window.locator('[data-testid^="step-table-row-"]');
    return await rows.count();
  }
}

export default StepTableHelper;