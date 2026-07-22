import { DETECTOR_TYPES } from '../../../../src/constants/constants.js';
import { test, expect } from '../../fixtures/electronFixtures.js'
import { DetectorMockHelper , TestController} from '../../fixtures/classes/index.js';
import { reloadApplication } from '../../helpers/appLifeCycle.js';
import StepTableHelper from '../../fixtures/classes/StepTableValidator.js';
import { createCustomSubmitMethodTest, createDADForceMethodTest, createDADSetMethodTest, createDADSubmitMethodTest, fillDADParams, nullMethodTestBody, openMeasurementsAndSetSeconds, } from '../../helpers/factories/methodFactories.js';
import { createDADFileData, getDADParamsFromFileData, } from '../../fixtures/mocks/files.js';
import { createScreenshotHelper } from '../../helpers/screenshots.js';
import { openFileTestBody } from '../../helpers/factories/fileFactories.js';
import { credentialsTestBody } from '../../helpers/factories/nodeFactories.js';
import { verifyDADParams } from '../../helpers/validators/DADParamsValidator.js';
import { createDADExploreTest } from '../../helpers/factories/exploreFactories.js';

const TEST_NAMES = {
  CREDENTIALS_FACTORY: 'DAD detector - basic credentials FACTORY',
  NULL_METHOD_FACTORY: 'null DAD values FACTORY',
  SET_METHOD_FACTORY: 'set DAD method snapped FACTORY',
  FORCE_METHOD_FACTORY: 'nullMethod to DAD method snapped FACTORY',
  SUBMIT_METHOD_FACTORY: 'submit filled DAD method FACTOYRY',
  OPEN_FILE_FACTORY: 'open DAD file from mocked electron api FACTORY',
  PARAMS_RANGES: 'DAD params behavior test',

  EXPLORE_FACTORY: 'DAD explore mode FACTORY',
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

test.describe('DAD Detector Tests', () => {
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
        await mockHelper.setupDAD('DADName');
        await reloadApplication(window);
        return {
          detectorType: DETECTOR_TYPES.DAD,
          detectorName: 'DADName'
        };
      },
      expectedLabel: 'Диодоматричный Ex1800 DAD' // Optional, will use default if not provided
    });
  });

  testController.createTest(TEST_NAMES.NULL_METHOD_FACTORY, async ({ window, loggers }) => {
    await nullMethodTestBody({
      window,
      loggers,
      mockHelper,
      stepTableHelper,
      setupCallback: async () => {
        const detectorType = await mockHelper.setupDAD('DADName');
        await reloadApplication(window);
        // No method selected - null method case
        return {detectorType};
      }
    });
  });

/*   testController.createTest(TEST_NAMES.SET_METHOD_FACTORY, async ({ window, loggers, apiMocks }) => {
    apiMocks.enableCapture(true);

    let methodMock = null;
    // Create setup callback closed over everything
    const setupCallback = async () => {
      await mockHelper.setupDAD('DADName');
      methodMock = await mockHelper.setupMethod({ 
        detectorType: DETECTOR_TYPES.DAD, 
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
      methodToSelect: methodsNameMap.DAD1
    });

    const logger = loggers.testLogger;

    // Verify what was sent in the POST request
    const capturedRequest = apiMocks.getLastCapturedRequest('/api/methods/chooseMethod', 'POST');

    expect(capturedRequest).toBeDefined();
    expect(capturedRequest.data.name).toBe(methodsNameMap.DAD1);

    logger.log('Captured request data:', JSON.stringify(capturedRequest.data));

    const expectedParams = getDADParamsFromMethodMock(methodMock);
    await verifyDADParams(window, expectedParams, { logger });


    apiMocks.enableCapture(false);
  });

  testController.createTest(TEST_NAMES.FORCE_METHOD_FACTORY, async ({ window, loggers }) => {
    let methodMock = null;

    const setupCallback = async () => {
      await mockHelper.setupDAD('DADName');
      methodMock = await mockHelper.setupMethod({ 
        detectorType: DETECTOR_TYPES.DAD, 
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
      methodToSelect: methodsNameMap.DAD1
    });

    const logger = loggers.testLogger;
    const expectedParams = getDADParamsFromMethodMock(methodMock);
    await verifyDADParams(window, expectedParams, { logger });
  }); */

   // Create test functions (capture helpers from closure)
  const dadSetMethodTest = createDADSetMethodTest({ enableCapture: true });
  const dadForceMethodTest = createDADForceMethodTest({ enableCapture: false });

  testController.createTest(TEST_NAMES.SET_METHOD_FACTORY, async ({ window, loggers, apiMocks }) => {
    return dadSetMethodTest({
      window,
      loggers,
      apiMocks,
      expect,
      mockHelper,
      stepTableHelper
    });
  });

  testController.createTest(TEST_NAMES.FORCE_METHOD_FACTORY, async ({ window, loggers, apiMocks }) => {
    return dadForceMethodTest({
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
      /* await mockHelper.setupDAD('DADName'); */
      fileData = await mockHelper.setupFile({
        fileData: createDADFileData(),
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
        screenshotPath: 'open_file_DAD',
        timeout: 30000,
        openMeasurements: true 
      }
    });

    // After file is opened, verify DAD params match file data
    const logger = loggers.testLogger;
    
    // Get DAD params from file data
    const expectedParams = getDADParamsFromFileData(fileData);
    logger.log('Expected DAD params from file', JSON.stringify(expectedParams));
    
    await verifyDADParams(window, expect, expectedParams, { logger });
    
    logger.log('✅ DAD params verified against file data');
    apiMocks.enableCapture(false);
  });

  const stepsConfig = [
    { stepIndex: 0, field: 'to', value: 20, type: 'input' },
    { stepIndex: 0, field: 'component', value: 'AFill', type: 'input' },
    { stepIndex: 0, field: 'sample_wl', value: 256, type: 'input' },
    { stepIndex: 0, field: 'sample_bw', value: 10, type: 'input' },
    { stepIndex: 0, field: 'sample_rate', value: 10, type: 'select' },
    { stepIndex: 0, field: 'time_constant', value: 50, type: 'select' }
  ];

  const paramsConfig = {
    autoZero: true,
    A: { 
      sample_wl: 255, 
      sample_bw: 8, 
      reference_wl: 440, 
      reference_bw: 50, 
      reference_use: false 
    },
    B: { 
      sample_wl: 256, 
      sample_bw: 9, 
      reference_wl: 441, 
      reference_bw: 51, 
      reference_use: true 
    },
    C: { 
      sample_wl: 257, 
      sample_bw: 10, 
      reference_wl: 442, 
      reference_bw: 52, 
      reference_use: true 
    },
    D: { 
      sample_wl: 258, 
      sample_bw: 11, 
      reference_wl: 443, 
      reference_bw: 53, 
      reference_use: false 
    },
    E: { 
      sample_wl: 259, 
      sample_bw: 12, 
      reference_wl: 444, 
      reference_bw: 54, 
      reference_use: true 
    },
    F: { 
      sample_wl: 260, 
      sample_bw: 13, 
      reference_wl: 445, 
      reference_bw: 55, 
      reference_use: false 
    },
    G: { 
      sample_wl: 261, 
      sample_bw: 14, 
      reference_wl: 446, 
      reference_bw: 56, 
      reference_use: true 
    },
    H: { 
      sample_wl: 262, 
      sample_bw: 15, 
      reference_wl: 447, 
      reference_bw: 57, 
      reference_use: false 
    }
  };

  // Normal test
  const dadSubmitMethodTest = createDADSubmitMethodTest(
    stepsConfig,
    paramsConfig,
    'TestSave',
    { enableCapture: true, verifyRequest: true }
  );

  testController.createTest(TEST_NAMES.SUBMIT_METHOD_FACTORY, async ({ window, loggers, apiMocks }) => {
    return dadSubmitMethodTest({
      window,
      loggers,
      apiMocks,
      expect,
      mockHelper,
      stepTableHelper
    });
  });

  const dadExploreTest = createDADExploreTest({ 
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

      await mockHelper.setupDAD('DADName');
      await reloadApplication(window);

      await openMeasurementsAndSetSeconds(window)

      // ==================== Test 0: Auto zero checkbox ====================
      logger.log('Test 0: Auto zero checkbox');
      
      const autoZeroCheckbox = window.getByTestId('dad-params-auto-zero-checkbox');
      await autoZeroCheckbox.uncheck();
      await expect(autoZeroCheckbox).not.toBeChecked();
      await autoZeroCheckbox.check();
      await expect(autoZeroCheckbox).toBeChecked();
      
      // Open DAD params modal
      await window.getByTestId('dad-params-open-button').click();
      await expect(window.getByTestId('dad-params-modal')).toBeVisible();
      
      // Select channel A for testing
      const channel = 'A';
      
      // ==================== Test 1: Valid values ====================
      logger.log('Test 1: Valid values');
      
      // Sample WL - valid values
      const sampleWlInput = window.getByTestId(`dad-params-channel-${channel}-sample-wl-input`);
      await sampleWlInput.fill('254');
      await sampleWlInput.blur();
      await expect(sampleWlInput).toHaveValue('254');
      
      // Sample BW - valid values
      const sampleBwInput = window.getByTestId(`dad-params-channel-${channel}-sample-bw-input`);
      await sampleBwInput.fill('8');
      await sampleBwInput.blur();
      await expect(sampleBwInput).toHaveValue('8');
      
      // Reference WL - valid values
      const referenceWlInput = window.getByTestId(`dad-params-channel-${channel}-reference-wl-input`);
      await referenceWlInput.fill('440');
      await referenceWlInput.blur();
      await expect(referenceWlInput).toHaveValue('440');
      
      // Reference BW - valid values
      const referenceBwInput = window.getByTestId(`dad-params-channel-${channel}-reference-bw-input`);
      await referenceBwInput.fill('50');
      await referenceBwInput.blur();
      await expect(referenceBwInput).toHaveValue('50');
      
      // ==================== Test 2: Delete to empty ====================
      logger.log('Test 2: Delete to empty');
      
      await sampleWlInput.fill('');
      await sampleWlInput.blur();
      await expect(sampleWlInput).toHaveValue('190');
      
      await sampleBwInput.fill('');
      await sampleBwInput.blur();
      await expect(sampleBwInput).toHaveValue('4');
      
      await referenceWlInput.fill('');
      await referenceWlInput.blur();
      await expect(referenceWlInput).toHaveValue('230');
      
      await referenceBwInput.fill('');
      await referenceBwInput.blur();
      await expect(referenceBwInput).toHaveValue('4');
      
      // Reset to valid values for next tests
      await sampleWlInput.fill('254');
      await sampleWlInput.blur();
      await sampleBwInput.fill('8');
      await sampleBwInput.blur();
      await referenceWlInput.fill('440');
      await referenceWlInput.blur();
      await referenceBwInput.fill('50');
      await referenceBwInput.blur();
      
      // ==================== Test 3: Below minimum ====================
      logger.log('Test 3: Below minimum');
      
      // Sample WL min = 190
      await sampleWlInput.fill('100');
      await sampleWlInput.blur();
      await expect(sampleWlInput).toHaveValue('190');
      
      // Sample BW min = 4
      await sampleBwInput.fill('2');
      await sampleBwInput.blur();
      await expect(sampleBwInput).toHaveValue('4');
      
      // Reference WL min = 230
      await referenceWlInput.fill('200');
      await referenceWlInput.blur();
      await expect(referenceWlInput).toHaveValue('230');
      
      // Reference BW min = 4
      await referenceBwInput.fill('2');
      await referenceBwInput.blur();
      await expect(referenceBwInput).toHaveValue('4');
      
      // ==================== Test 4: Above maximum ====================
      logger.log('Test 4: Above maximum');
      
      // Sample WL max = 820
      await sampleWlInput.fill('900');
      await sampleWlInput.blur();
      await expect(sampleWlInput).toHaveValue('820');
      
      // Sample BW max = 20
      await sampleBwInput.fill('30');
      await sampleBwInput.blur();
      await expect(sampleBwInput).toHaveValue('20');
      
      // Reference WL max = 800
      await referenceWlInput.fill('850');
      await referenceWlInput.blur();
      await expect(referenceWlInput).toHaveValue('800');
      
      // Reference BW max = 80
      await referenceBwInput.fill('90');
      await referenceBwInput.blur();
      await expect(referenceBwInput).toHaveValue('80');
      
      // Reset to valid values
      await sampleWlInput.fill('254');
      await sampleWlInput.blur();
      await sampleBwInput.fill('8');
      await sampleBwInput.blur();
      await referenceWlInput.fill('440');
      await referenceWlInput.blur();
      await referenceBwInput.fill('50');
      await referenceBwInput.blur();
      
      // ==================== Test 5: Partial input (during typing) ====================
      logger.log('Test 5: Partial input');
      
      // Type partial number - should allow during typing
      await sampleWlInput.fill('2');
      await expect(sampleWlInput).toHaveValue('2'); // Allows partial during typing
      await sampleWlInput.fill('25');
      await sampleWlInput.blur();
      await expect(sampleWlInput).toHaveValue('190'); // Clamps to valid range (min 190)
      
/*       // Type invalid characters - should keep previous value
      await sampleWlInput.fill('abc');
      await expect(sampleWlInput).toHaveValue(''); // Should keep previous value
      await sampleWlInput.blur();
      await expect(sampleWlInput).toHaveValue('190'); // Stays at previous value */
      
      // ==================== Test 6: Reference use checkbox ====================
      logger.log('Test 6: Reference use checkbox');
      
      const referenceUseCheckbox = window.getByTestId(`dad-params-channel-${channel}-reference-use-checkbox`);
      
      // Toggle reference use
      await referenceUseCheckbox.uncheck();
      await expect(referenceUseCheckbox).not.toBeChecked();
      await referenceUseCheckbox.check();
      await expect(referenceUseCheckbox).toBeChecked();
      
      // ==================== Test 7: Multiple channels ====================
      logger.log('Test 7: Multiple channels');
      
      const channels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      for (const ch of channels) {
          const input = window.getByTestId(`dad-params-channel-${ch}-sample-wl-input`);
          await input.fill('300');
          await input.blur();
          await expect(input).toHaveValue('300');
      }
      
      // Reset channel A back
      await sampleWlInput.fill('254');
      await sampleWlInput.blur();
      
      
      // ==================== Test 8: Apply button - should save changes ====================
      logger.log('Test 8: Apply button');
      
      // Change some values
      await sampleWlInput.fill('500');
      await sampleWlInput.blur();
      await referenceUseCheckbox.uncheck();
      
      // Click apply
      await window.getByTestId('dad-params-apply-button').click();
      await expect(window.getByTestId('dad-params-modal')).not.toBeVisible();
      
      // Reopen modal - values should persist
      await window.getByTestId('dad-params-open-button').click();
      await expect(window.getByTestId('dad-params-modal')).toBeVisible();
      
      await expect(window.getByTestId(`dad-params-channel-${channel}-sample-wl-input`)).toHaveValue('500');
      await expect(window.getByTestId(`dad-params-channel-${channel}-reference-use-checkbox`)).not.toBeChecked();
      
      // ==================== Test 10: Cancel button - should discard changes ====================
      logger.log('Test 10: Cancel button');
      
      // Change some values
      await sampleWlInput.fill('600');
      await sampleWlInput.blur();
      await referenceUseCheckbox.check();
      
      // Click cancel
      await window.getByTestId('dad-params-cancel-button').click();
      await expect(window.getByTestId('dad-params-modal')).not.toBeVisible();
      
      // Reopen modal - values should be restored to last saved (500, not 600)
      await window.getByTestId('dad-params-open-button').click();
      await expect(window.getByTestId('dad-params-modal')).toBeVisible();
      
      await expect(window.getByTestId(`dad-params-channel-${channel}-sample-wl-input`)).toHaveValue('500');
      await expect(window.getByTestId(`dad-params-channel-${channel}-reference-use-checkbox`)).not.toBeChecked();
      
      // ==================== Test 11: Edge values at boundaries ====================
      logger.log('Test 11: Edge values at boundaries');
      
      // Test exact min values
      await sampleWlInput.fill('190');
      await sampleWlInput.blur();
      await expect(sampleWlInput).toHaveValue('190');
      
      // Test exact max values
      await sampleWlInput.fill('820');
      await sampleWlInput.blur();
      await expect(sampleWlInput).toHaveValue('820');
      
      // Test exact min for bandwidth
      await sampleBwInput.fill('4');
      await sampleBwInput.blur();
      await expect(sampleBwInput).toHaveValue('4');
      
      // Test exact max for bandwidth
      await sampleBwInput.fill('20');
      await sampleBwInput.blur();
      await expect(sampleBwInput).toHaveValue('20');
      
      logger.log('✅ All DAD params behavior tests passed');
  
    });

});
