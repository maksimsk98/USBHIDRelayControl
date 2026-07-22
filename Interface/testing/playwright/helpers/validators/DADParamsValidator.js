/**
 * Verify DAD parameters against expected values
 * @param {Object} window - Playwright window/page object
 * @param {Object} expectedParams - Expected DAD parameters from file data
 * @param {Object} options - Options
 * @param {boolean} options.closeModal - Close modal after verification (default: true)
 * @param {Object} options.logger - Logger object (optional, if omitted no logs)
 * @returns {Promise<void>}
 */
export const verifyDADParams = async (window, expect, expectedParams, options = {}) => {
  const { closeModal = true, logger = null } = options;
  
  const log = (message, data = null) => {
    if (logger) {
      if (data) {
        logger.log(`[DADParams] ${message}`, data);
      } else {
        logger.log(`[DADParams] ${message}`);
      }
    }
  };
  
  if (!expectedParams) {
    log('No expectedParams provided, skipping DAD params verification');
    return;
  }
  
  log('Starting DAD params verification', expectedParams);

  // Verify auto zero (checkbox is in main component, not in modal)
  if (expectedParams.autoZero !== undefined) {
    const checkbox = window.getByTestId('dad-params-auto-zero-checkbox');
    log(`Verifying auto zero: expected checked = ${expectedParams.autoZero}`);
    if (expectedParams.autoZero) {
      await expect(checkbox).toBeChecked();
      log(`✅ Auto zero checkbox is checked`);
    } else {
      await expect(checkbox).not.toBeChecked();
      log(`✅ Auto zero checkbox is not checked`);
    }
  }
  
  // Open DAD params modal
  log('Opening DAD params modal');
  await window.getByTestId('dad-params-open-button').click();
  
  // Wait for modal to be visible
  log('Waiting for modal to be visible');
  await expect(window.getByTestId('dad-params-modal')).toBeVisible();
  log('Modal is visible');
  

  
  // Verify channels if present (these are inside the modal)
  if (expectedParams.channels) {
    const channels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    for (const channel of channels) {
      const channelParams = expectedParams.channels[channel];
      if (channelParams) {
        log(`Verifying channel ${channel}`);
        
        if (channelParams.sample_wl !== undefined) {
          log(`  Verifying sample_wl: expected "${channelParams.sample_wl}"`);
          await expect(window.getByTestId(`dad-params-channel-${channel}-sample-wl-input`))
            .toHaveValue(String(channelParams.sample_wl));
          log(`  ✅ sample_wl verified: ${channelParams.sample_wl}`);
        }
        
        if (channelParams.sample_bw !== undefined) {
          log(`  Verifying sample_bw: expected "${channelParams.sample_bw}"`);
          await expect(window.getByTestId(`dad-params-channel-${channel}-sample-bw-input`))
            .toHaveValue(String(channelParams.sample_bw));
          log(`  ✅ sample_bw verified: ${channelParams.sample_bw}`);
        }
        
        if (channelParams.reference_wl !== undefined) {
          log(`  Verifying reference_wl: expected "${channelParams.reference_wl}"`);
          await expect(window.getByTestId(`dad-params-channel-${channel}-reference-wl-input`))
            .toHaveValue(String(channelParams.reference_wl));
          log(`  ✅ reference_wl verified: ${channelParams.reference_wl}`);
        }
        
        if (channelParams.reference_bw !== undefined) {
          log(`  Verifying reference_bw: expected "${channelParams.reference_bw}"`);
          await expect(window.getByTestId(`dad-params-channel-${channel}-reference-bw-input`))
            .toHaveValue(String(channelParams.reference_bw));
          log(`  ✅ reference_bw verified: ${channelParams.reference_bw}`);
        }
        
        if (channelParams.reference_use !== undefined) {
          const checkbox = window.getByTestId(`dad-params-channel-${channel}-reference-use-checkbox`);
          log(`  Verifying reference_use: expected checked = ${channelParams.reference_use}`);
          if (channelParams.reference_use) {
            await expect(checkbox).toBeChecked();
            log(`  ✅ reference_use checkbox is checked`);
          } else {
            await expect(checkbox).not.toBeChecked();
            log(`  ✅ reference_use checkbox is not checked`);
          }
        }
      }
    }
  }
  
  // Close modal if requested
  if (closeModal) {
    log('Closing modal');
    await window.getByTestId('dad-params-cancel-button').click();
    await expect(window.getByTestId('dad-params-modal')).not.toBeVisible();
    log('Modal closed');
  }
  
  log('✅ DAD params verification completed successfully');
};