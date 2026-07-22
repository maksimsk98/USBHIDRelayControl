import { DETECTOR_TYPES } from "../../../../src/constants/constants";
import { expect as defaultExpect } from "../../configs/playwright.electron.config";

/**
 * Verify detector credentials
 */
export const verifyCredentials = async (window, expect, expectedLabel, logger) => {
  const credentials = window.locator('#method-menu-detector-credentials');
  
  try {
    await expect(credentials).toHaveText(expectedLabel);
    logger.log('✅ Detector credentials verified');
  } catch (error) {
    const actualText = await credentials.textContent();
    logger.log(`❌ Expected: "${expectedLabel}", Got: "${actualText}"`);
    throw error;
  }
};

/**
 * Get expected credentials label based on detector type
 */
export const getExpectedCredentialsLabel = (detectorType, detectorName) => {
  const labels = {
    [DETECTOR_TYPES.DAD]: `Диодоматричный Ex1800 ${detectorName || 'DAD'}`,
    [DETECTOR_TYPES.FLUORAT]: `Флюорат ${detectorName || 'Fluorat'}`,
    [DETECTOR_TYPES.PANORAMA]: `Панорама ${detectorName || 'Panorama'}`,
    [DETECTOR_TYPES.SPHDETECTOR]: `SPhDetector ${detectorName || 'SPh'}`,
    [DETECTOR_TYPES.SPHDETECTOR2]: `SPhDetector2 ${detectorName || 'SPh2'}`
  };
  
  return labels[detectorType] || `Detector ${detectorName || ''}`;
};

/**
 * Test body for CREDENTIALS test
 */
export const credentialsTestBody = async ({
  expect = defaultExpect,
  window,
  loggers,
  mockHelper,
  stepTableHelper,
  setupCallback,
  expectedLabel = null
}) => {
  const logger = loggers.testLogger;
  
  // Run setup callback
  const { detectorType, detectorName } = await setupCallback();
  
  // Get expected label if not provided
  const finalExpectedLabel = expectedLabel || getExpectedCredentialsLabel(detectorType, detectorName);
  
  // Verify credentials
  await verifyCredentials(window, expect, finalExpectedLabel, logger);
  
  logger.log('✅ Credentials test completed successfully');
};