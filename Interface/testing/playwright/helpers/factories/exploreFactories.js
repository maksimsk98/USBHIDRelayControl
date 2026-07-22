import { reloadApplication } from '../appLifeCycle.js';

/**
 * Open DevTools automatically
 * @param {Object} page - Playwright page object
 */
export const openDevTools = async (page) => {
  await page.keyboard.press('Control+Shift+I');
  await page.waitForTimeout(1000);
};

/**
 * Create explore test
 * @param {Object} config - Test configuration
 * @param {string} config.detectorType - Type of detector (DAD, RID, etc.)
 * @param {Function} config.setupDetector - Function to setup detector
 * @param {Function} config.extraSetup - Optional extra setup before reload
 * @param {Object} config.options - Additional options
 * @returns {Function} Test function
 */
export const createExploreTest = ({
  detectorType,
  setupDetector,
  extraSetup = null,
  options = {}
}) => {
  const {
    openDevTools: shouldOpenDevTools = true,
    reloadPage = true,
    timeout = 300000
  } = options;

  return async ({ window, loggers, mockHelper, stepTableHelper, expect, test }) => {
    const logger = loggers.testLogger;
    
    test.setTimeout(timeout);
    
    logger.log(`🚀 Starting explore mode for ${detectorType} detector`);
    
    await setupDetector(mockHelper);
    logger.log(`✅ ${detectorType} detector setup complete`);
    
    if (extraSetup) {
      await extraSetup({ window, logger, mockHelper, stepTableHelper, expect });
      logger.log('✅ Extra setup complete');
    }
    
    if (reloadPage) {
      await reloadApplication(window);
      logger.log('✅ Page reloaded');
    }
    
    if (shouldOpenDevTools) {
      await openDevTools(window);
      logger.log('🔧 DevTools opened');
    }
    
    logger.log('⏸️ Test paused for manual exploration. Press "Resume" in the inspector to continue...');
    
    await window.pause();
    
    logger.log('✅ Exploration complete');
  };
};

/**
 * Create DAD explore test
 */
export const createDADExploreTest = (options = {}) => {
  return createExploreTest({
    detectorType: 'DAD',
    setupDetector: async (mockHelper) => {
      await mockHelper.setupDAD('DADName');
    },
    options
  });
};

/**
 * Create RID explore test
 */
export const createRIDExploreTest = (options = {}) => {
  return createExploreTest({
    detectorType: 'RID',
    setupDetector: async (mockHelper) => {
      await mockHelper.setupRID('RIDName');
    },
    options
  });
};