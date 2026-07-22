/**
 * Verify RID parameters against expected values
 * @param {Object} window - Playwright window/page object
 * @param {Object} expectedParams - Expected RID parameters from file data
 * @param {Object} options - Options
 * @param {boolean} options.closeModal - Close modal after verification (default: true)
 * @param {Object} options.logger - Logger object (optional, if omitted no logs)
 * @returns {Promise<void>}
 */
export const verifyRIDParams = async (window, expect, expectedParams, options = {}) => {
  const { closeModal = true, logger = null } = options;
  
  const log = (message, data = null) => {
    if (logger) {
      if (data) {
        logger.log(`[RIDParams] ${message}`, data);
      } else {
        logger.log(`[RIDParams] ${message}`);
      }
    }
  };
  
  if (!expectedParams) {
    log('No expectedParams provided, skipping RID params verification');
    return;
  }
  
  log('Starting RID params verification', expectedParams);
  
  // Open RID params modal
  log('Opening RID params modal');
  await window.getByTestId('rid-params-open-button').click();
  
  // Wait for modal to be visible
  log('Waiting for modal to be visible');
  await expect(window.getByTestId('rid-params-modal')).toBeVisible();
  log('Modal is visible');
  
  // Verify sample rate
  if (expectedParams.sampleRate !== undefined) {
    log(`Verifying sample rate: expected "${expectedParams.sampleRate}"`);
    await expect(window.getByTestId('rid-params-sample-rate-select'))
      .toHaveValue(String(expectedParams.sampleRate));
    log(`✅ Sample rate verified: ${expectedParams.sampleRate}`);
  }
  
  // Verify polarity
  if (expectedParams.polarity !== undefined) {
    const expectedPolarity = expectedParams.polarity ? 'true' : 'false';
    log(`Verifying polarity: expected "${expectedPolarity}" (${expectedParams.polarity ? 'Положительная' : 'Отрицательная'})`);
    await expect(window.getByTestId('rid-params-polarity-select'))
      .toHaveValue(expectedPolarity);
    log(`✅ Polarity verified: ${expectedParams.polarity ? 'Положительная' : 'Отрицательная'}`);
  }
  
  // Verify temperature
  if (expectedParams.temperature !== undefined) {
    log(`Verifying temperature: expected "${expectedParams.temperature}"°C`);
    await expect(window.getByTestId('rid-params-temperature-input'))
      .toHaveValue(String(expectedParams.temperature));
    log(`✅ Temperature verified: ${expectedParams.temperature}°C`);
  }
  
  // Verify temperature tolerance
  if (expectedParams.temperatureTolerance !== undefined) {
    log(`Verifying temperature tolerance: expected "${expectedParams.temperatureTolerance}"°C`);
    await expect(window.getByTestId('rid-params-temperature-tolerance-input'))
      .toHaveValue(String(expectedParams.temperatureTolerance));
    log(`✅ Temperature tolerance verified: ${expectedParams.temperatureTolerance}°C`);
  }
  
  // Verify wait for temperature checkbox (inverse logic)
  if (expectedParams.waitForTemperature !== undefined) {
    const checkbox = window.getByTestId('rid-params-wait-for-temperature-checkbox');
    const expectedChecked = !expectedParams.waitForTemperature;
    log(`Verifying wait for temperature: expected checked = ${expectedChecked} (inverse of ${expectedParams.waitForTemperature})`);
    if (expectedChecked) {
      await expect(checkbox).toBeChecked();
      log(`✅ Wait for temperature checkbox is checked`);
    } else {
      await expect(checkbox).not.toBeChecked();
      log(`✅ Wait for temperature checkbox is not checked`);
    }
  }
  
  // Verify auto zero checkbox
  if (expectedParams.autoZero !== undefined) {
    const checkbox = window.getByTestId('rid-params-auto-zero-checkbox');
    log(`Verifying auto zero: expected checked = ${expectedParams.autoZero}`);
    if (expectedParams.autoZero) {
      await expect(checkbox).toBeChecked();
      log(`✅ Auto zero checkbox is checked`);
    } else {
      await expect(checkbox).not.toBeChecked();
      log(`✅ Auto zero checkbox is not checked`);
    }
  }
  
  // Close modal if requested
  if (closeModal) {
    log('Closing modal');
    await window.getByTestId('rid-params-cancel-button').click();
    await expect(window.getByTestId('rid-params-modal')).not.toBeVisible();
    log('Modal closed');
  }
  
  log('✅ RID params verification completed successfully');
};