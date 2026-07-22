import { DETECTOR_TYPES } from '../../../../src/constants/constants.js';
import { test, expect } from '../../fixtures/electronFixtures.js'
import { DetectorMockHelper , TestController} from '../../fixtures/classes/index.js';
import { getRIDParamsFromMethodMock, methodsNameMap } from '../../fixtures/mocks/methods.js';
import { reloadApplication } from '../../helpers/appLifeCycle.js';
import StepTableHelper from '../../fixtures/classes/StepTableValidator.js';
import { createRIDForceMethodTest, createRIDMethodTests, createRIDSetMethodTest, createRIDSubmitMethodTest, forceMethodTestBody, nullMethodTestBody, openMeasurementsAndSetSeconds, setMethodTestBody } from '../../helpers/factories/methodFactories.js';
import { createScreenshotHelper } from '../../helpers/screenshots.js';
import { openFileTestBody } from '../../helpers/factories/fileFactories.js';
import { credentialsTestBody } from '../../helpers/factories/nodeFactories.js';

//detector specific
import { createRIDFileData, getRIDParamsFromFileData } from '../../fixtures/mocks/files.js';
import { verifyRIDParams } from '../../helpers/validators/RIDParamsValidator.js';
import { createRIDExploreTest } from '../../helpers/factories/exploreFactories.js';


const TEST_NAMES = {
  CREDENTIALS_FACTORY: 'RID detector - basic credentials FACTORY',
  NULL_METHOD_FACTORY: 'null RID values FACTORY',
  SET_METHOD_FACTORY: 'set RID method snapped FACTORY',
  FORCE_METHOD_FACTORY: 'nullMethod to RID method snapped FACTORY',
  OPEN_FILE_FACTORY: 'open RID file from mocked electron api FACTORY',
  SUBMIT_METHOD_FACTORY: 'submit RID method FACTORY',
  EXPLORE_FACTORY: 'DAD explore mode FACTORY',
  PARAMS_RANGES: 'RID params behavior test',
}

// true - run, false - skip
const testController = new TestController(test, {
  [TEST_NAMES.CREDENTIALS_FACTORY]: false,    
  [TEST_NAMES.NULL_METHOD_FACTORY]: false,    
  [TEST_NAMES.SET_METHOD_FACTORY]: false,
  [TEST_NAMES.FORCE_METHOD_FACTORY]: false, 
  [TEST_NAMES.SUBMIT_METHOD_FACTORY]: true, 
  [TEST_NAMES.OPEN_FILE_FACTORY]: false,  
  [TEST_NAMES.PARAMS_RANGES]: false,

  [TEST_NAMES.EXPLORE_FACTORY]: false, // DO NOT LEAVE IT TRUE OR IT PAUSES TESTS
});

// Define screenshot helper once at file level
const screenshotHelper = createScreenshotHelper({
  enableLogging: true
});

test.describe.configure({ mode: 'serial' });

test.describe('RID Detector Tests', () => {
  /** @type {DetectorMockHelper} */
  let mockHelper;
  let stepTableHelper;

  test.beforeEach(async ({ window, apiMocks, loggers }) => {
    mockHelper = new DetectorMockHelper(apiMocks);
    stepTableHelper = new StepTableHelper(window, { 
      logger: loggers.testLogger,
      enableLogging: true
    });
    await mockHelper.saveInitial();
  });

  test.afterEach(async () => {
    await mockHelper.restoreInitial();
  });

  testController.createTest(TEST_NAMES.CREDENTIALS_FACTORY, async ({ window, loggers }) => {
    await credentialsTestBody({
      expect,
      window,
      loggers,
      mockHelper,
      stepTableHelper,
      setupCallback: async () => {
        await mockHelper.setupRID('RIDName');
        await reloadApplication(window);
        return {
          detectorType: DETECTOR_TYPES.RID,
          detectorName: 'RIDName'
        };
      },
      expectedLabel: 'Рефрактометрический RID RI-201H' // Optional, will use default if not provided
    });
  });

  testController.createTest(TEST_NAMES.NULL_METHOD_FACTORY, async ({ window, loggers }) => {
    await nullMethodTestBody({
      window,
      loggers,
      mockHelper,
      stepTableHelper,
      setupCallback: async () => {
        const detectorType = await mockHelper.setupRID('RIDName');
        const methodMock = await mockHelper.setupMethod({ 
            clearAllMocks: false 
        });
        await reloadApplication(window);
        // No method selected - null method case
        return {detectorType};
      }
    });
  });

  /* testController.createTest(TEST_NAMES.SET_METHOD_FACTORY, async ({ window, loggers, apiMocks }) => {
    apiMocks.enableCapture(true);

    let methodMock = null;
    // Create setup callback closed over everything
    const setupCallback = async () => {
      await mockHelper.setupRID('RIDName');
      methodMock = await mockHelper.setupMethod({ 
        detectorType: DETECTOR_TYPES.RID, 
        clearAllMocks: false 
      });

      await reloadApplication(window);
      return { stepsData: methodMock.detectorProgram.stepsData };
    };
    
    // Run test body
    await setMethodTestBody({
      expect,
      window,
      loggers,
      mockHelper,
      stepTableHelper,
      setupCallback,
      methodToSelect: methodsNameMap.RID1
    });

    const logger = loggers.testLogger;

    // Verify what was sent in the POST request
    const capturedRequest = apiMocks.getLastCapturedRequest('/api/methods/chooseMethod', 'POST');

    expect(capturedRequest).toBeDefined();
    expect(capturedRequest.data.name).toBe(methodsNameMap.RID1);

    logger.log('Captured request data:', JSON.stringify(capturedRequest.data));

    const expectedParams = getRIDParamsFromMethodMock(methodMock)
    await verifyRIDParams(window, expectedParams, { logger });
  });

  testController.createTest(TEST_NAMES.FORCE_METHOD_FACTORY, async ({ window, loggers }) => {
    let methodMock = null;
    // Create setup callback closed over everything
    const setupCallback = async () => {
      await mockHelper.setupRID('RIDName');
      methodMock = await mockHelper.setupMethod({ 
        detectorType: DETECTOR_TYPES.RID, 
        clearAllMocks: false 
      });
      await reloadApplication(window);
      return { stepsData: methodMock.detectorProgram.stepsData };
    };
    
    // Run test body
    await forceMethodTestBody({
      expect,
      window,
      loggers,
      mockHelper,
      stepTableHelper,
      setupCallback,
      methodToSelect: methodsNameMap.RID1
    });

    const logger = loggers.testLogger;
  
    const expectedParams = getRIDParamsFromMethodMock(methodMock)
    await verifyRIDParams(window, expectedParams, { logger });
    
  }); */

     // Create test functions (capture helpers from closure)
    const ridSetMethodTest = createRIDSetMethodTest({ enableCapture: true });
    const ridForceMethodTest = createRIDForceMethodTest({ enableCapture: false });
  
    testController.createTest(TEST_NAMES.SET_METHOD_FACTORY, async ({ window, loggers, apiMocks }) => {
      return ridSetMethodTest({
        window,
        loggers,
        apiMocks,
        expect,
        mockHelper,
        stepTableHelper
      });
    });
  
    testController.createTest(TEST_NAMES.FORCE_METHOD_FACTORY, async ({ window, loggers, apiMocks }) => {
      return ridForceMethodTest({
        window,
        loggers,
        apiMocks,
        expect,
        mockHelper,
        stepTableHelper
      });
    });

  testController.createTest(TEST_NAMES.OPEN_FILE_FACTORY, async ({ window, loggers, apiMocks }) => {
    test.setTimeout(30000);
    apiMocks.enableCapture(true);

    let fileData = null;
    
    const setupCallback = async () => {
      /* await mockHelper.setupRID('RIDName'); */
      fileData = await mockHelper.setupFile({
        fileData: createRIDFileData(),
        clearAllMocks: false
      });
      await reloadApplication(window);
      return { fileData };
    };
    
    await openFileTestBody({
      test,
      window,
      loggers,
      mockHelper,
      stepTableHelper,
      screenshotHelper,
      setupCallback,
      options: {
        enableScreenshots: false,
        screenshotPath: 'open_file_RID',
        timeout: 30000,
        openMeasurements: true 
      }
    });

    // After file is opened, verify RID params match file data
  const logger = loggers.testLogger;
  
  
  // Get file data from the opened file
  const expectedParams = getRIDParamsFromFileData(fileData)
    logger.log('Expected RID params', JSON.stringify(expectedParams))

  
    await verifyRIDParams(window, expect, expectedParams, { logger });
    

    logger.log('✅ RID params verified against file data');
    apiMocks.enableCapture(false);
  });

    // RID steps configuration
    const ridStepsConfig = [
        { stepIndex: 0, field: 'to', value: 300, type: 'input' },
        { stepIndex: 0, field: 'component', value: 'Glucose', type: 'input' }
    ];

    // RID parameters configuration
    const ridParamsConfig = {
        sampleRate: 10,
        polarity: true,
        temperature: 40,
        temperatureTolerance: 2,
        waitForTemperature: false,
        autoZero: true
    };

    // Create RID submit test
    const ridSubmitMethodTest = createRIDSubmitMethodTest(
        ridStepsConfig,
        ridParamsConfig,
        'RIDTestSave',
        { enableCapture: true, verifyRequest: true }
    );

    testController.createTest(TEST_NAMES.SUBMIT_METHOD_FACTORY, async ({ window, loggers, apiMocks }) => {
        return ridSubmitMethodTest({
            window,
            loggers,
            apiMocks,
            expect,
            mockHelper,
            stepTableHelper
        });
    });

    const dadExploreTest = createRIDExploreTest({ 
        openDevTools: true,
        reloadPage: true,
        timeout: 300000 
    });

    testController.createTest(TEST_NAMES.EXPLORE_FACTORY, async ({ window, loggers, apiMocks }) => {
        return dadExploreTest({
            window,
            loggers,
            mockHelper,
            stepTableHelper,
            expect,
            test
        });
    });

    testController.createTest(TEST_NAMES.PARAMS_RANGES, async ({ window, loggers }) => {
        test.setTimeout(50000);
        const logger = loggers.testLogger;

        await mockHelper.setupRID('RIDName');
        await reloadApplication(window);

        await openMeasurementsAndSetSeconds(window)
        
        // Open RID params modal
        await window.getByTestId('rid-params-open-button').click();
        await expect(window.getByTestId('rid-params-modal')).toBeVisible();
        
        // ==================== Test 1: Valid values ====================
        logger.log('Test 1: Valid values');
        
        // Set temperature to 40
        const tempInput = window.getByTestId('rid-params-temperature-input');
        await tempInput.fill('40');
        await tempInput.blur();
        await expect(tempInput).toHaveValue('40');
        
        // Set temperature tolerance to 2
        const toleranceInput = window.getByTestId('rid-params-temperature-tolerance-input');
        await toleranceInput.fill('2');
        await toleranceInput.blur();
        await expect(toleranceInput).toHaveValue('2');
        
        // ==================== Test 2: Delete to empty ====================
        logger.log('Test 2: Delete to empty');
        
        await tempInput.fill('');
        await tempInput.blur();
        // On blur, empty should set to min (30) because of RID_RANGES
        await expect(tempInput).toHaveValue('30');
        
        await toleranceInput.fill('');
        await toleranceInput.blur();
        // On blur, empty should set to min (1)
        await expect(toleranceInput).toHaveValue('1');
        
        // ==================== Test 3: Below minimum ====================
        logger.log('Test 3: Below minimum');
        
        await tempInput.fill('20');
        await tempInput.blur();
        // Should clamp to min (30)
        await expect(tempInput).toHaveValue('30');
        
        await toleranceInput.fill('0');
        await toleranceInput.blur();
        // Should clamp to min (1)
        await expect(toleranceInput).toHaveValue('1');
        
        // ==================== Test 4: Above maximum ====================
        logger.log('Test 4: Above maximum');
        
        await tempInput.fill('60');
        await tempInput.blur();
        // Should clamp to max (50)
        await expect(tempInput).toHaveValue('50');
        
        await toleranceInput.fill('9');
        await toleranceInput.blur();
        // Should clamp to max (5)
        await expect(toleranceInput).toHaveValue('5');
        
        // ==================== Test 5: Use Thermostat checkbox ====================
        logger.log('Test 5: Use Thermostat checkbox');
        
        const useThermostatCheckbox = window.getByTestId('rid-params-use-thermostat-checkbox');
        
        // Initially should be checked (since temperature has value)
        await expect(useThermostatCheckbox).toBeChecked();
        
        // Uncheck - should clear temperature fields
        await useThermostatCheckbox.uncheck();
        await expect(tempInput).toHaveValue('');
        await expect(toleranceInput).toHaveValue('');
        await expect(tempInput).toBeDisabled();
        await expect(toleranceInput).toBeDisabled();
        
        // Check again - should restore last values (50 and 2)
        await useThermostatCheckbox.check();
        await expect(tempInput).toHaveValue('50');
        await expect(toleranceInput).toHaveValue('5');
        await expect(tempInput).toBeEnabled();
        await expect(toleranceInput).toBeEnabled();
        
        // ==================== Test 6: Partial input (during typing) ====================
        logger.log('Test 6: Partial input');
        
        // Type partial number - should allow during typing
        await tempInput.fill('4');
        await expect(tempInput).toHaveValue('4'); // Allows partial during typing
        await tempInput.fill('45');
        await tempInput.blur();
        await expect(tempInput).toHaveValue('45'); // Within range
        
        // Type invalid characters - should be filtered
        await tempInput.fill('abc');
        await expect(tempInput).toHaveValue('45'); // Should be empty or previous value
        await tempInput.blur();
        await expect(tempInput).toHaveValue('45'); // Blur sets to min
        
        // ==================== Test 7: Sample Rate select ====================
        logger.log('Test 7: Sample Rate select');
        
        const sampleRateSelect = window.getByTestId('rid-params-sample-rate-select');
        await sampleRateSelect.selectOption('5');
        await expect(sampleRateSelect).toHaveValue('5');
        
        // Try to select invalid option (should not be possible with select)
        // Select is limited to predefined options
        
        // ==================== Test 8: Polarity select ====================
        logger.log('Test 8: Polarity select');
        
        const polaritySelect = window.getByTestId('rid-params-polarity-select');
        await polaritySelect.selectOption('false');
        await expect(polaritySelect).toHaveValue('false');
        await polaritySelect.selectOption('true');
        await expect(polaritySelect).toHaveValue('true');
        
        // ==================== Test 9: Checkboxes ====================
        logger.log('Test 9: Checkboxes');
        
        const waitForTempCheckbox = window.getByTestId('rid-params-wait-for-temperature-checkbox');
        const autoZeroCheckbox = window.getByTestId('rid-params-auto-zero-checkbox');
        
        // Wait for temperature checkbox (inverse logic)
        await waitForTempCheckbox.check();
        // Should be unchecked in localParams because of inverse logic
        await waitForTempCheckbox.uncheck();
        
        // Auto zero checkbox
        await autoZeroCheckbox.uncheck();
        await autoZeroCheckbox.check();
        
        // ==================== Test 10: Cancel button - should not save ====================
        logger.log('Test 10: Cancel button');
        
        // Change some values
        await tempInput.fill('35');
        await tempInput.blur();
        await sampleRateSelect.selectOption('2');
        
        // Click cancel
        await window.getByTestId('rid-params-cancel-button').click();
        await expect(window.getByTestId('rid-params-modal')).not.toBeVisible();
        
        // Reopen modal - values should be restored to original (not the changed ones)
        await window.getByTestId('rid-params-open-button').click();
        await expect(window.getByTestId('rid-params-modal')).toBeVisible();
        
        await expect(window.getByTestId('rid-params-temperature-input')).toHaveValue('36');
        await expect(window.getByTestId('rid-params-sample-rate-select')).toHaveValue('10');
        
        logger.log('✅ All RID params behavior tests passed');
    });

});