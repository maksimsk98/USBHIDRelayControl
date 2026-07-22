/**
 * Test Controller class to manage conditional test execution
 * @template T
 */
export default class TestController {
  /**
   * @param {Object} testObj - The test object from test file
   * @param {Object} controlMap - Map of test names to control values
   * @param {boolean|null} controlMap[testName] - true=run, false=skip, null=run (default)
   */
  constructor(testObj, controlMap = {}) {
    this.test = testObj;
    this.controlMap = controlMap;
  }

  /**
   * Create a conditional test
   * @param {string} testName - Name of the test
   * @param {Function} testFn - Test function
   * @returns {Object} Playwright test object
   */
  createTest(testName, testFn) {
    const control = this.controlMap[testName];
    const shouldSkip = control === false;
    
    if (shouldSkip) {
      return this.test.skip(testName, testFn);
    }
    return this.test(testName, testFn);
  }

  /**
   * Create a test that only runs if condition is met
   * @param {string} testName - Name of the test
   * @param {boolean} condition - Condition to run test
   * @param {Function} testFn - Test function
   */
  createConditionalTest(testName, condition, testFn) {
    if (!condition) {
      return this.test.skip(testName, testFn);
    }
    return this.test(testName, testFn);
  }

  /**
   * Create a test that runs only in specific environment
   * @param {string} testName - Name of the test
   * @param {string[]} environments - Allowed environments (e.g., ['development', 'ci'])
   * @param {Function} testFn - Test function
   */
  createEnvTest(testName, environments, testFn) {
    const currentEnv = process.env.NODE_ENV || 'development';
    const shouldRun = environments.includes(currentEnv);
    
    if (!shouldRun) {
      return this.test.skip(testName, testFn);
    }
    return this.test(testName, testFn);
  }

  /**
   * Set control for a specific test
   * @param {string} testName - Name of the test
   * @param {boolean|null} value - Control value
   */
  setControl(testName, value) {
    this.controlMap[testName] = value;
  }

  /**
   * Get control value for a test
   * @param {string} testName - Name of the test
   * @returns {boolean|null}
   */
  getControl(testName) {
    return this.controlMap[testName];
  }

  /**
   * Get the underlying test object
   * @returns {Object}
   */
  getTest() {
    return this.test;
  }
}