import { switchToMeasurementsSubTabAndSetSeconds } from "./methodFactories";

/**
 * Handle detector mismatch dialog
 * @param {Object} window - Playwright window/page object
 * @param {number} timeout - Timeout in ms (default: 2000)
 * @returns {Promise<boolean>} True if dialog was handled
 */
export const handleDetectorMismatchDialog = async (window, timeout = 2000) => {
  try {
    const mismatchDialog = window.getByTestId('detector-mismatch-warning-modal');
    // Wait for modal to appear (don't throw if it doesn't)
    await mismatchDialog.waitFor({ state: 'visible', timeout }).catch(() => {});
    
    if (await mismatchDialog.isVisible()) {
      await window.getByTestId('detector-mismatch-warning-modal-ok-button').click();
      return true;
    }
  } catch (error) {
    // Dialog not found - safe to ignore
  }
  return false;
};

/**
 * Open file test body factory
 * @param {Object} params - Test parameters
 */
export const openFileTestBody = async ({
    test,
  window,
  loggers,
  mockHelper,
  stepTableHelper,
  screenshotHelper,
  setupCallback,
  options = {}
}) => {
  const logger = loggers?.testLogger || console;
  
  // Safe defaults for options
  const {
    enableScreenshots = false,
    screenshotPath = 'open_file',
    timeout = null,
    waitForReady = true,
    verifySteps = true,
    handleMismatchDialog = true,
    switchToMeasurements = true 
  } = options;
  
  if (timeout) {
    test.setTimeout(timeout);
  }
  
  // Run setup callback
  const { fileData } = await setupCallback();
  
  // Create screenshot helper if enabled
  const testScreenshots = enableScreenshots && screenshotHelper 
    ? screenshotHelper.forTest(screenshotPath)
    : null;
  
  const safeScreenshot = async (name) => {
    if (testScreenshots && window) {
      try {
        await testScreenshots.takeFullPage(window, name);
      } catch (error) {
        logger.log(`⚠️ Screenshot failed for ${name}:`, error.message);
      }
    }
  };
    
  // Open file dialog
  await window.getByRole('button', { name: 'Файл' }).click();
  await window.getByRole('menuitem', { name: 'Открыть' }).click();
  await window.waitForLoadState('domcontentloaded');
  
  // Handle detector mismatch dialog if enabled
    if (handleMismatchDialog) {
        await handleDetectorMismatchDialog(window);
    }

    await safeScreenshot('init_open');
  
  // Open measurements tab and set seconds using existing helper
  if (switchToMeasurements) {
    await switchToMeasurementsSubTabAndSetSeconds(window);
  }
  
  await safeScreenshot('after_open_measurements');
  
  // Wait for table to be ready if enabled
  if (waitForReady && stepTableHelper) {
    await stepTableHelper.waitForReady();
  }
  
  // Verify steps if enabled
  if (verifySteps && fileData) {
    const stepsData = fileData.responseData?.[0]?.data?.stepsData;
    if (stepsData) {
      await stepTableHelper.verifyStepsData(stepsData);
    } else {
      logger.log('⚠️ No stepsData found in fileData');
    }
  }
  
  logger.log('✅ File opened and stepTable verified successfully');

};