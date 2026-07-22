import { expect, test } from "../../fixtures/electronFixtures";
import { TestController, DetectorMockHelper } from '../../fixtures/classes/index.js';
import { DETECTOR_TYPES } from "../../../../src/constants/constants.js";
import { getScreenshotPath } from "../../helpers/screenshots.js";
import { methodsNameMap } from "../../fixtures/mocks/methods.js";
import { reloadApplication } from "../../helpers/appLifeCycle.js";

const TEST_NAMES = {
  CREDENTIALS: 'Panorama detector - basic credentials',
  NULL_METHOD: 'null Panorama values snapped',
  FORCE_METHOD: 'force Panorama method snapped',
  SET_METHOD: 'set Panorama method snapped',
  OPEN_FILE: 'open Panorama file from mocked electron api',
  MEASUREMENT: 'run chroma measurement on Panorama',
}

// true - run, false - skip
const testController = new TestController(test, {
  [TEST_NAMES.CREDENTIALS]: false,
  [TEST_NAMES.NULL_METHOD]: false,     
  [TEST_NAMES.FORCE_METHOD]: false,
  [TEST_NAMES.SET_METHOD]: false,     
  [TEST_NAMES.OPEN_FILE]: false,    
  [TEST_NAMES.MEASUREMENT]: false, 
});

test.describe.configure({ mode: 'serial' });

test.describe('Panorama Detector Tests', () => {
  /** @type {DetectorMockHelper} */
  let mockHelper;

  test.beforeEach(async ({ apiMocks }) => {
    mockHelper = new DetectorMockHelper(apiMocks);
    await mockHelper.saveInitial();
  });

  test.afterEach(async () => {
    await mockHelper.restoreInitial();
  });

    testController.createTest(TEST_NAMES.CREDENTIALS, async ({ window, loggers }) => {
        const logger = loggers.testLogger;
        
        await mockHelper.setupPanorama('PanoramaName');
        await reloadApplication(window)
        
        const credentials = window.locator('#method-menu-detector-credentials');
            
        const expectedLabel = 'СФЛД 2310 Панорама P 54321';
        try {
            await expect(credentials).toHaveText(expectedLabel);
            logger.log('✅ Panorama detector credentials verified');
        } catch (error) {
            const actualText = await credentials.textContent();
            logger.log(`❌ Expected: "${expectedLabel}", Got: "${actualText}"`);
            throw error;
        }
    });

  testController.createTest(TEST_NAMES.MEASUREMENT, async ({ window, loggers }) => {
    const logger = loggers.testLogger;

    await mockHelper.setupPanorama('PanoramaName');
    await mockHelper.setupMethod({ detectorType: DETECTOR_TYPES.PANORAMA, clearAllMocks: false });
    await reloadApplication(window)
    
    // Get the combobox
    const combobox = window.locator('#methods-global-menu').getByRole('combobox');

    // Get all options
    const rawOptions = await combobox.locator('option').allTextContents();
    const options = rawOptions.map(method => method === '' ? 'null' : method);

    logger.log(`Combobox options: ${options.join(', ')}`);

    // Then select
    await window.locator('#methods-global-menu').getByRole('combobox').selectOption(methodsNameMap.PANORAMA1);
    await expect(window.locator('#methods-global-menu').getByRole('combobox')).toHaveValue(methodsNameMap.PANORAMA1);

    await window.getByRole('button', { name: 'Измерения' }).click();
    await window.getByRole('menuitem', { name: 'Хроматографические' }).click();
    await window.getByRole('button').nth(5).click();
    await expect(window.getByText('Запуск измерения')).toBeVisible();
    await expect(window.getByRole('button', { name: 'Начать измерение' })).toBeVisible();
    await checkMeasurementTime(window.locator('input[name="measurementTime"]'), [
      [1, 1],
      [2, 9],
      [3, 13],
    ]);
    await expect(window.locator('div').filter({ hasText: /^ПикВремя \(мин\.\)ВысотаПолуширинаПлощадьКомпонентРеф\. конц\.Выч\. конц\.$/ })).toBeVisible();
    await expect(window.locator('input[name="calculatedChromatogram"]')).toBeChecked();
    await window.getByRole('button', { name: '✕' }).click();
    await expect(window.getByText('Подтверждение сохранения изменений')).toBeVisible();
    await window.getByRole('button', { name: 'Да' }).click();
  });

});

