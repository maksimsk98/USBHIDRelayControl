import { generateDefaultDADSteps, generateDefaultRIDSteps, getDADParamsFromMethodMock, getRIDParamsFromMethodMock, methodsNameMap } from "../../fixtures/mocks/methods";
import { expect as defaultExpect } from "../../configs/playwright.electron.config";
import { DETECTOR_TYPES } from "../../../../src/constants/constants";
import { verifyRIDParams } from "../validators/RIDParamsValidator";
import { verifyDADParams } from "../validators/DADParamsValidator";
import { reloadApplication } from "../appLifeCycle";

/**
 * Open measurements and change to seconds
 */
export const switchToMeasurementsSubTabAndSetSeconds = async (window) => {
    await window.getByTestId('dockview-dv-default-tab').first().click();
  await window.getByTestId('averaging-timeunit-timeunit-select').selectOption('sec');
};


/**
 * Open measurements and change to seconds
 */
export const openMeasurementsAndSetSeconds = async (window) => {
  await window.getByRole('button', { name: 'Измерения' }).click();
  await window.getByRole('menuitem', { name: 'Хроматографические' }).click();
  await window.getByTestId('averaging-timeunit-timeunit-select').selectOption('sec');
};

/**
 * Verify steps data
 */
export const verifyStepsData = async (stepTableHelper, stepsData, logger) => {
  logger.log('Checking stepTable by stepsData');
  await stepTableHelper.verifyStepsData(stepsData);
};

/**
 * Select method from dropdown
 */
export const selectMethod = async (window, expect, methodToSelect, logger) => {
  const combobox = window.locator('#methods-global-menu').getByRole('combobox');
  const rawOptions = await combobox.locator('option').allTextContents();
  const options = rawOptions.map(method => method === '' ? 'null' : method);
  logger.log(`Combobox options: ${options.join(', ')}`);
  
  await window.locator('#methods-global-menu').getByRole('combobox')
    .selectOption(methodToSelect);
  await expect(window.locator('#methods-global-menu').getByRole('combobox'))
    .toHaveValue(methodToSelect);
};

/**
 * Test body for SET_METHOD test (select method after opening measurements)
 */
export const setMethodTestBody = async ({
  expect = defaultExpect,
  window, 
  loggers, 
  mockHelper, 
  stepTableHelper,
  setupCallback,
  methodToSelect = methodsNameMap.DAD1
}) => {
  const logger = loggers.testLogger;
  
  // Run setup callback
  const { stepsData } = await setupCallback();
  
  // Select method from dropdown
  await selectMethod(window, expect, methodToSelect, logger);
  
  // Open measurements and set seconds
  await openMeasurementsAndSetSeconds(window);
  
  // Verify steps
  await verifyStepsData(stepTableHelper, stepsData, logger);
  
  logger.log('✅ Test completed successfully');
};

/**
 * Test body for FORCE_METHOD test (open measurements before selecting method)
 */
export const forceMethodTestBody = async ({ 
  expect = defaultExpect,
  window, 
  loggers, 
  mockHelper, 
  stepTableHelper,
  setupCallback,
  methodToSelect = methodsNameMap.DAD1
}) => {
  const logger = loggers.testLogger;
  
  // Run setup callback
  const { stepsData } = await setupCallback();
  
  // Open measurements and set seconds first
  await openMeasurementsAndSetSeconds(window);
  
  // Select method from dropdown
  await selectMethod(window, expect, methodToSelect, logger);
  
  // Verify steps
  await verifyStepsData(stepTableHelper, stepsData, logger);
  
  logger.log('✅ Test completed successfully');
};

/**
 * Generate expected steps data from default generator
 * @returns {Array} Expected steps data
 */
export const generateExpectedNullMethodSteps = () => {
  const defaultSteps = generateDefaultDADSteps();
  
  // For null method, we expect default values with placeholders
  return defaultSteps.map((step, index) => ({
    stepId: index + 1,
    from: step.from,
    to: step.to,
    component: step.component || '',
    sample_wl: step.sample_wl || '\\d+',  // Regex pattern for any number
    sample_bw: step.sample_bw || '8',
    sample_rate: step.sample_rate || '0.5',
    time_constant: step.time_constant || '\\d+'
  }));
};

/**
 * Generate steps data for null method (default values)
 */
export const generateNullMethodStepsData = (detectorType) => {
    const generatorMap = {
        [DETECTOR_TYPES.DAD]: generateDefaultDADSteps,
        [DETECTOR_TYPES.RID]: generateDefaultRIDSteps,
    }

  const generator = generatorMap[detectorType];
  if (!generator && typeof generator !== 'function') {
    throw new Error(`No step generator found for detector type: ${detectorType}`);
  }

  const defaultSteps = generator();
  
  return defaultSteps
};

/**
 * Test body for NULL_METHOD test (no method selected, default values)
 */
export const nullMethodTestBody = async ({
  expect = defaultExpect,
  window, 
  loggers, 
  mockHelper, 
  stepTableHelper,
  setupCallback
}) => {
  const logger = loggers.testLogger;
  
  // Run setup callback and get detector type
  const { detectorType } = await setupCallback();
  
  // Open measurements and set seconds
  await openMeasurementsAndSetSeconds(window);
  
  // Generate null method steps data from default generator
  const nullStepsData = generateNullMethodStepsData(detectorType);
  logger.log(`Null steps data for ${detectorType}`, nullStepsData)
  // Verify steps using the same verifyStepsData function
  await verifyStepsData(stepTableHelper, nullStepsData, logger);
  
  logger.log('✅ Null method test completed successfully');
};

/**
 * Generate method test function (SET or FORCE)
 * @param {Object} config - Test configuration
 * @returns {Function} Test function
 */
export const createMethodTestFunction = ({
  testType,
  detectorType,
  setupDetector,
  getMethodName,
  getParamsFromMethodMock,
  verifyParams,
  options = {}
}) => {
  const {
    enableCapture = true,
    verifyRequest = true,
    closeModal = true
  } = options;

  return async ({ window, loggers, apiMocks, expect, mockHelper, stepTableHelper }) => {
    const logger = loggers.testLogger;
    
    // Enable capture if requested
    if (enableCapture) {
      apiMocks.enableCapture(true);
    }
    
    let methodMock = null;
    
    // Setup callback
    const setupCallback = async () => {
      await setupDetector(mockHelper);
      methodMock = await mockHelper.setupMethod({ 
        detectorType, 
        clearAllMocks: false 
      });
      await reloadApplication(window);
      return { stepsData: methodMock.detectorProgram.stepsData };
    };
    
    // Run test body
    const testBody = testType === 'set' ? setMethodTestBody : forceMethodTestBody;
    await testBody({
      expect,
      window,
      loggers,
      mockHelper,
      stepTableHelper,
      setupCallback,
      methodToSelect: getMethodName()
    });
    
    // Verify captured request
    if (verifyRequest && enableCapture) {
      const capturedRequest = apiMocks.getLastCapturedRequest('/api/methods/chooseMethod', 'POST');
      expect(capturedRequest).toBeDefined();
      expect(capturedRequest.data.name).toBe(getMethodName());
      logger.log('Captured request data:', JSON.stringify(capturedRequest.data));
    }
    
    // Verify detector params
    const expectedParams = getParamsFromMethodMock(methodMock);
    await verifyParams(window, expect, expectedParams, { logger, closeModal });
    
    // Disable capture
    if (enableCapture) {
      apiMocks.enableCapture(false);
    }
    
    logger.log(`✅ ${testType.toUpperCase()} method test completed successfully`);
  };
};

// DAD specific test creators
export const createDADSetMethodTest = (options = {}) => createMethodTestFunction({
  testType: 'set',
  detectorType: DETECTOR_TYPES.DAD,
  setupDetector: (mockHelper) => mockHelper.setupDAD('DADName'),
  getMethodName: () => methodsNameMap.DAD1,
  getParamsFromMethodMock: getDADParamsFromMethodMock,
  verifyParams: verifyDADParams,
  options
});

export const createDADForceMethodTest = (options = {}) => createMethodTestFunction({
  testType: 'force',
  detectorType: DETECTOR_TYPES.DAD,
  setupDetector: (mockHelper) => mockHelper.setupDAD('DADName'),
  getMethodName: () => methodsNameMap.DAD1,
  getParamsFromMethodMock: getDADParamsFromMethodMock,
  verifyParams: verifyDADParams,
  options
});

// RID specific test creators
export const createRIDSetMethodTest = (options = {}) => createMethodTestFunction({
  testType: 'set',
  detectorType: DETECTOR_TYPES.RID,
  setupDetector: (mockHelper) => mockHelper.setupRID('RIDName'),
  getMethodName: () => methodsNameMap.RID1,
  getParamsFromMethodMock: getRIDParamsFromMethodMock,
  verifyParams: verifyRIDParams,
  options
});

export const createRIDForceMethodTest = (options = {}) => createMethodTestFunction({
  testType: 'force',
  detectorType: DETECTOR_TYPES.RID,
  setupDetector: (mockHelper) => mockHelper.setupRID('RIDName'),
  getMethodName: () => methodsNameMap.RID1,
  getParamsFromMethodMock: getRIDParamsFromMethodMock,
  verifyParams: verifyRIDParams,
  options
});

/**
 * Fill steps in the step table
 * @param {Object} window - Playwright window/page object
 * @param {Array} steps - Array of step configurations
 * @param {Object} logger - Logger object
 * @param {Object} expect - Playwright expect
 */
export const fillSteps = async (window, steps, logger, expect) => {
  for (const step of steps) {
    const { stepIndex, field, value, type = 'input' } = step;
    
    if (type === 'select') {
      const select = window.getByTestId(`step-table-${field}-${stepIndex}-select`);
      await select.selectOption(String(value));
      logger.log(`Set step ${stepIndex} ${field} = ${value}`);
    } else {
      const input = window.getByTestId(`step-table-${field}-${stepIndex}-input`);
      await input.dblclick();
      await input.fill(String(value));
      logger.log(`Set step ${stepIndex} ${field} = ${value}`);
    }
  }
  
  // Add new steps if needed
  const maxStepIndex = Math.max(...steps.map(s => s.stepIndex), 0);
  for (let i = 0; i <= maxStepIndex; i++) {
    if (!steps.some(s => s.stepIndex === i)) {
      await window.getByTestId('step-table-add--1-button').click();
      logger.log(`Added step ${i}`);
    }
  }
};

/**
 * Fill DAD parameters
 * @param {Object} window - Playwright window/page object
 * @param {Object} params - Channel parameters configuration
 * @param {Object} logger - Logger object
 * @param {Object} expect - Playwright expect
 */
export const fillDADParams = async (window, params, logger, expect) => {
  await window.getByTestId('dad-params-open-button').click();
  await expect(window.getByTestId('dad-params-modal')).toBeVisible();
  
  for (const [channel, channelConfig] of Object.entries(params)) {
    if (channel === 'autoZero') continue;
    
    if (channelConfig.sample_wl !== undefined) {
      const input = window.getByTestId(`dad-params-channel-${channel}-sample-wl-input`);
      await input.click();
      await input.fill(String(channelConfig.sample_wl));
      logger.log(`Set channel ${channel} sample_wl = ${channelConfig.sample_wl}`);
    }
    
    if (channelConfig.sample_bw !== undefined) {
      const input = window.getByTestId(`dad-params-channel-${channel}-sample-bw-input`);
      await input.click();
      await input.fill(String(channelConfig.sample_bw));
      logger.log(`Set channel ${channel} sample_bw = ${channelConfig.sample_bw}`);
    }
    
    if (channelConfig.reference_wl !== undefined) {
      const input = window.getByTestId(`dad-params-channel-${channel}-reference-wl-input`);
      await input.click();
      await input.fill(String(channelConfig.reference_wl));
      logger.log(`Set channel ${channel} reference_wl = ${channelConfig.reference_wl}`);
    }
    
    if (channelConfig.reference_bw !== undefined) {
      const input = window.getByTestId(`dad-params-channel-${channel}-reference-bw-input`);
      await input.click();
      await input.fill(String(channelConfig.reference_bw));
      logger.log(`Set channel ${channel} reference_bw = ${channelConfig.reference_bw}`);
    }
    
    if (channelConfig.reference_use !== undefined) {
      const checkbox = window.getByTestId(`dad-params-channel-${channel}-reference-use-checkbox`);
      if (channelConfig.reference_use) {
        await checkbox.check();
      } else {
        await checkbox.uncheck();
      }
      logger.log(`Set channel ${channel} reference_use = ${channelConfig.reference_use}`);
    }
  }
  
  // Apply modal changes
  await window.getByTestId('dad-params-apply-button').click();
  await expect(window.getByTestId('dad-params-modal')).not.toBeVisible();
};

/**
 * Fill RID parameters
 * @param {Object} window - Playwright window/page object
 * @param {Object} params - RID parameters configuration
 * @param {Object} logger - Logger object
 * @param {Object} expect - Playwright expect
 */
export const fillRIDParams = async (window, params, logger, expect) => {
  await window.getByTestId('rid-params-open-button').click();
  await expect(window.getByTestId('rid-params-modal')).toBeVisible();
  
  if (params.sampleRate !== undefined) {
    await window.getByTestId('rid-params-sample-rate-select').selectOption(String(params.sampleRate));
    logger.log(`Set sample rate = ${params.sampleRate}`);
  }
  
  if (params.polarity !== undefined) {
    const expectedValue = params.polarity ? 'true' : 'false';
    await window.getByTestId('rid-params-polarity-select').selectOption(expectedValue);
    logger.log(`Set polarity = ${params.polarity}`);
  }
  
  if (params.temperature !== undefined) {
    const input = window.getByTestId('rid-params-temperature-input');
    await input.click();
    await input.fill(String(params.temperature));
    logger.log(`Set temperature = ${params.temperature}`);
  }
  
  if (params.temperatureTolerance !== undefined) {
    const input = window.getByTestId('rid-params-temperature-tolerance-input');
    await input.click();
    await input.fill(String(params.temperatureTolerance));
    logger.log(`Set temperature tolerance = ${params.temperatureTolerance}`);
  }
  
  if (params.waitForTemperature !== undefined) {
    const checkbox = window.getByTestId('rid-params-wait-for-temperature-checkbox');
    if (params.waitForTemperature) {
      await checkbox.check();
    } else {
      await checkbox.uncheck();
    }
    logger.log(`Set wait for temperature = ${params.waitForTemperature}`);
  }
  
  if (params.autoZero !== undefined) {
    const checkbox = window.getByTestId('rid-params-auto-zero-checkbox');
    if (params.autoZero) {
      await checkbox.check();
    } else {
      await checkbox.uncheck();
    }
    logger.log(`Set auto zero = ${params.autoZero}`);
  }
  
  // Close modal
  await window.getByTestId('rid-params-cancel-button').click();
  await expect(window.getByTestId('rid-params-modal')).not.toBeVisible();
};

export const saveMethod = async (window, methodName, logger, expect, apiMocks) => {
  // Create a promise that resolves when the request is captured
  let capturedResolve;
  const capturedPromise = new Promise(resolve => {
    capturedResolve = resolve;
  });
  
  // Check periodically if the request was captured
  const checkInterval = setInterval(() => {
    const captured = apiMocks.getLastCapturedRequest('/api/methods/submit', 'POST');
    if (captured) {
      clearInterval(checkInterval);
      capturedResolve(captured);
    }
  }, 100);
  
  // Click through the save flow
  await window.getByRole('button', { name: 'Метод' }).click();
  await window.getByRole('button', { name: 'Сохранить' }).click();
  await window.locator('input[name="methodName"]').click();
  await window.locator('input[name="methodName"]').fill(methodName);
  await window.getByRole('button', { name: 'Сохранить' }).click();
  
  // Wait for the request to be captured (max 5 seconds)
  const captured = await Promise.race([
    capturedPromise,
    new Promise(resolve => setTimeout(() => resolve(null), 5000))
  ]);
  
  clearInterval(checkInterval);
  
  if (!captured) {
    logger.log('⚠️ No POST request to /api/methods/submit captured within 5 seconds');
  } else {
    logger.log(`✅ POST request to /api/methods/submit captured`);
  }
  
  logger.log(`Method saved as: ${methodName}`);
  return captured;
};

/**
 * Create submit method test function
 */
export const createSubmitMethodTest = ({
  setupCallback,
  steps = [],
  params = {},
  methodName = 'TestSave',
  fillParams,
  options = {}
}) => {
  const {
    enableCapture = true,
    verifyRequest = true,
    openMeasurements = true
  } = options;

  return async ({ window, loggers, apiMocks, expect, mockHelper, stepTableHelper }) => {
    const logger = loggers.testLogger;
    
    // Enable capture if requested
    if (enableCapture) {
      apiMocks.enableCapture(true);
    }
    
    // Run setup callback to configure detector - PASS apiMocks
    const { detectorType } = await setupCallback({ mockHelper, window, loggers, apiMocks });
    
    // Open measurements and set seconds
    if (openMeasurements) {
      await window.getByRole('button', { name: 'Измерения' }).click();
      await window.getByRole('menuitem', { name: 'Хроматографические' }).click();
      await window.getByTestId('averaging-timeunit-timeunit-select').selectOption('sec');
    }
    
    // Fill steps
    if (steps.length > 0) {
      await fillSteps(window, steps, logger, expect);
    }
    
    // Fill detector-specific parameters
    if (fillParams && params) {
      await fillParams(window, params, logger, expect);
    }
    
    // Save method - PASS apiMocks
    const capturedRequest = await saveMethod(window, methodName, logger, expect, apiMocks);
    
    // Verify captured POST request to /api/methods/submit
    if (verifyRequest && enableCapture) {
      if (capturedRequest) {
        logger.log('Actual submit data:', JSON.stringify(capturedRequest.data, null, 2));
        
        // Validate method name (note: in actual request it's 'name', not 'methodName')
        expect(capturedRequest.data.name).toBe(methodName);
        
        // If detector type was provided, validate it (note: in actual request it's 'instrument')
        if (detectorType) {
          expect(capturedRequest.data.instrument).toBe(detectorType);
        }
      } else {
        // Fallback to checking captured requests
        const fallbackRequest = apiMocks.getLastCapturedRequest('/api/methods/submit', 'POST');
        expect(fallbackRequest).toBeDefined();
        if (fallbackRequest) {
          logger.log('Fallback captured submit data:', JSON.stringify(fallbackRequest.data, null, 2));
          expect(fallbackRequest.data.name).toBe(methodName);
          if (detectorType) {
            expect(fallbackRequest.data.instrument).toBe(detectorType);
          }
        }
      }
    }
    
    // Disable capture
    if (enableCapture) {
      apiMocks.enableCapture(false);
    }
    
    logger.log('✅ Submit method test completed successfully');
  };
};

/**
 * Create DAD submit method test
 */
export const createDADSubmitMethodTest = (stepsConfig = [], paramsConfig = {}, methodName = 'TestSave', options = {}) => {
  return createSubmitMethodTest({
    setupCallback: async ({ mockHelper, window, apiMocks }) => {
      await mockHelper.setupDAD('DADName');
      
      // IMPORTANT: Mock the submit endpoint
      await apiMocks.mockPost('/api/methods/submit', { 
        success: true, 
        message: 'Method saved successfully' 
      }, 200);
      
      await reloadApplication(window);
      return { detectorType: 'DAD' };
    },
    steps: stepsConfig,
    params: paramsConfig,
    methodName,
    fillParams: fillDADParams,
    options
  });
};

/**
 * Create RID submit method test
 */

export const createRIDSubmitMethodTest = (stepsConfig = [], paramsConfig = {}, methodName = 'TestSave', options = {}) => {
  return createSubmitMethodTest({
    setupCallback: async ({ mockHelper, window, apiMocks }) => {
      await mockHelper.setupRID('RIDName');
      
      // Mock the submit endpoint for RID
      await apiMocks.mockPost('/api/methods/submit', { 
        success: true, 
        message: 'RID method saved successfully' 
      }, 200);
      
      await reloadApplication(window);
      return { detectorType: 'RID' };
    },
    steps: stepsConfig,
    params: paramsConfig,
    methodName,
    fillParams: fillRIDParams,
    options
  });
};

/**
 * Create custom submit method test with your own setup (for mismatch testing)
 */
export const createCustomSubmitMethodTest = ({
  setupCallback,
  steps = [],
  params = {},
  methodName = 'TestSave',
  fillParams,
  options = {}
}) => {
  return createSubmitMethodTest({
    setupCallback,
    steps,
    params,
    methodName,
    fillParams,
    options
  });
};