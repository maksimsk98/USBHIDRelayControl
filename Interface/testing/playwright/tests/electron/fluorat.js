import { expect, test } from "../../fixtures/electronFixtures";
import { TestController, DetectorMockHelper } from '../../fixtures/classes/index.js';
import { DETECTOR_TYPES } from "../../../../src/constants/constants.js";
import { getScreenshotPath } from "../../helpers/screenshots.js";
import { methodsNameMap } from "../../fixtures/mocks/methods.js";
import { reloadApplication } from "../../helpers/appLifeCycle.js";

const TEST_NAMES = {
  CREDENTIALS: 'Fluorat detector - basic credentials',
  NULL_METHOD: 'null Fluorat values snapped',
  FORCE_METHOD: 'force Fluorat method snapped',
  SET_METHOD: 'set Fluorat method snapped',
  OPEN_FILE: 'open Fluorat file from mocked electron api',
  MEASUREMENT: 'run chroma measurement on Fluorat',
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

test.describe('Fluorat Detector Tests', () => {
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
      
      await mockHelper.setupFluorat('10134');
      await reloadApplication(window)
      
      const credentials = window.locator('#method-menu-detector-credentials');
          
      const expectedLabel = 'ФЛД 2420 Флюорат-02-4М N 10134';
      try {
      await expect(credentials).toHaveText(expectedLabel);
      logger.log('✅ Fluorat detector credentials verified');
      } catch (error) {
      const actualText = await credentials.textContent();
      logger.log(`❌ Expected: "${expectedLabel}", Got: "${actualText}"`);
      throw error;
      }
  });

  testController.createTest(TEST_NAMES.NULL_METHOD, async ({ window, loggers }) => {
    const logger = loggers.testLogger;
    
    await mockHelper.setupFluorat('10134');
    await reloadApplication(window)
    
    await window.getByRole('button', { name: 'Измерения' }).click();
    await window.getByRole('menuitem', { name: 'Хроматографические' }).click();
    
    await expect(window.locator('input[name="stepId"]')).toHaveValue('1');
    await expect(window.locator('input[name="from"]')).toHaveValue('0');
    await expect(window.locator('input[name="to"]')).toHaveValue('10');
    await expect(window.locator('input[name="component"]')).toBeEmpty();
    await expect(window.locator('input[name="regFilter"]')).toBeEmpty();
    await expect(window.getByRole('cell', { name: 'Сверхнизкая' })).toBeVisible();
    
    logger.log('✅ Fluorat null method values verified');
  });

  testController.createTest(TEST_NAMES.FORCE_METHOD, async ({ window, loggers }) => {
    const logger = loggers.testLogger;
    
    await mockHelper.setupFluorat('10134');
    await mockHelper.setupMethod({ detectorType: DETECTOR_TYPES.FLUORAT, clearAllMocks: false });
    await reloadApplication(window)

    await window.getByRole('button', { name: 'Измерения' }).click();
    await window.getByRole('menuitem', { name: 'Хроматографические' }).click();
    
    // Get the combobox
    const combobox = window.locator('#methods-global-menu').getByRole('combobox');

    // Get all options
    const rawOptions = await combobox.locator('option').allTextContents();
    const options = rawOptions.map(method => method === '' ? 'null' : method).map(method => !method ? `falsy(${method})` : method);

    if (options.length < 2) {
      await window.pause()

      throw new Error('Missing option')
    }

    logger.log(`Combobox options: [${options.join(', ')}]`);

    // Then select
    await window.locator('#methods-global-menu').getByRole('combobox').selectOption(methodsNameMap.FLUORAT1);
    await expect(window.locator('#methods-global-menu').getByRole('combobox')).toHaveValue(methodsNameMap.FLUORAT1);
    
    logger.log('checking Fluorat method values');

    await expect(window.locator('input[name="to"]')).toHaveValue('3');
    await expect(window.locator('input[name="component"]')).toHaveValue('change');
    await expect(window.locator('input[name="maxDuration"]')).toHaveValue('1');
    await expect(window.locator('input[name="window"]')).toHaveValue('2');
    await expect(window.locator('input[name="threshold"]')).toHaveValue('3');
    
    logger.log('✅ Fluorat force method values verified');
  });

  testController.createTest(TEST_NAMES.SET_METHOD, async ({ window, loggers }) => {
    const logger = loggers.testLogger;
    
    await mockHelper.setupFluorat('10134');
    await mockHelper.setupMethod({ detectorType: DETECTOR_TYPES.FLUORAT, clearAllMocks: false });
    await reloadApplication(window)

    // Get the combobox
    const combobox = window.locator('#methods-global-menu').getByRole('combobox');

    // Get all options
    const rawOptions = await combobox.locator('option').allTextContents();
    const options = rawOptions.map(method => method === '' ? 'null' : method);

    logger.log(`Combobox options: ${options.join(', ')}`);

    // Then select
    await window.locator('#methods-global-menu').getByRole('combobox').selectOption(methodsNameMap.FLUORAT1);
    await expect(window.locator('#methods-global-menu').getByRole('combobox')).toHaveValue(methodsNameMap.FLUORAT1);
    
    logger.log('checking Fluorat method values');

    await window.getByRole('button', { name: 'Измерения' }).click();
    await window.getByRole('menuitem', { name: 'Хроматографические' }).click();

    await expect(window.locator('input[name="to"]')).toHaveValue('3');
    await expect(window.locator('input[name="component"]')).toHaveValue('change');
    await expect(window.locator('input[name="maxDuration"]')).toHaveValue('1');
    await expect(window.locator('input[name="window"]')).toHaveValue('2');
    await expect(window.locator('input[name="threshold"]')).toHaveValue('3');
    
    logger.log('✅ Fluorat set method values verified');
  });

  testController.createTest(TEST_NAMES.OPEN_FILE, async ({ window, loggers }) => {
    await window.getByRole('button', { name: 'Файл' }).click();
    await window.getByRole('menuitem', { name: 'Открыть' }).click();


    if (await window.getByText('Детектор использованный в файле/завершенном измерении отличается от выбранного, ')) {
      await window.getByRole('button', { name: 'OK' }).click();
    }
    
    await window.getByText('Измерение').click();
    await window.getByRole('row', { name: '0 12.6 275 350 Средняя' }).locator('input[name="to"]').click();
    await expect(window.getByRole('row', { name: '0 12.6 275 350 Средняя' }).locator('input[name="to"]')).toHaveValue('12.6');
    await expect(window.getByRole('cell', { name: '275' }).getByRole('textbox')).toHaveValue('275');
    await expect(window.getByRole('cell', { name: '350' }).getByRole('textbox')).toHaveValue('350');
    await expect(window.getByRole('cell', { name: 'Средняя' }).first()).toBeVisible();
    await expect(window.getByRole('row', { name: '12.6 13.5 260 420 Средняя' }).locator('input[name="to"]')).toHaveValue('13.5');
    await expect(window.getByRole('row', { name: '12.6 13.5 260 420 Средняя' }).locator('input[name="to"]')).toHaveValue('13.5');
    await expect(window.getByRole('row', { name: '13.5 15.5 270 440 Средняя' }).locator('input[name="to"]')).toHaveValue('15.5');
    await expect(window.getByRole('row', { name: '15.5 18.5 260 420 Средняя' }).locator('input[name="to"]')).toHaveValue('18.5');
    await expect(window.getByRole('row', { name: '12.6 13.5 260 420 Средняя' }).locator('input[name="lambdaEx"]')).toHaveValue('260');
    await expect(window.getByRole('row', { name: '12.6 13.5 260 420 Средняя' }).locator('input[name="lambdaReg"]')).toHaveValue('420');
    await expect(window.getByRole('cell', { name: '270' }).locator('input[name="lambdaEx"]')).toHaveValue('270');
    await expect(window.getByRole('cell', { name: '440' }).locator('input[name="lambdaReg"]')).toHaveValue('440');
    await expect(window.getByRole('row', { name: '15.5 18.5 260 420 Средняя' }).locator('input[name="lambdaEx"]')).toHaveValue('260');
    await expect(window.getByRole('row', { name: '15.5 18.5 260 420 Средняя' }).locator('input[name="lambdaReg"]')).toHaveValue('420');
    await expect(window.locator('.form-control').first()).toHaveValue('25');

    await window.screenshot({ 
      path: getScreenshotPath('Fluorat-file-meas-tab.png')
    });
    
    await window.getByText('Паспорт').click();
    await expect(window.locator('input[name="sampleName"]')).toHaveValue('EPA_дегазация');
    await expect(window.locator('input[name="method"]')).toHaveValue('ПАУ_300');
    await window.screenshot({ 
      path: getScreenshotPath('Fluorat-file-pass-tab.png')
    });
  });

  testController.createTest(TEST_NAMES.MEASUREMENT, async ({ window, loggers }) => {
    const logger = loggers.testLogger;

    await mockHelper.setupFluorat('10134');
    await mockHelper.setupMethod({ detectorType: DETECTOR_TYPES.FLUORAT, clearAllMocks: false });
    await reloadApplication(window)

    // Get the combobox
    const combobox = window.locator('#methods-global-menu').getByRole('combobox');

    // Get all options
    const rawOptions = await combobox.locator('option').allTextContents();
    const options = rawOptions.map(method => method === '' ? 'null' : method);

    logger.log(`Combobox options: ${options.join(', ')}`);

    // Then select
    await window.locator('#methods-global-menu').getByRole('combobox').selectOption(methodsNameMap.FLUORAT1);
    await expect(window.locator('#methods-global-menu').getByRole('combobox')).toHaveValue(methodsNameMap.FLUORAT1);

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

