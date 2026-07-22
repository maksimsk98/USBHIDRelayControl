import { test as base, expect } from '@playwright/test';
import { waitForAppReady } from '../helpers/appLifeCycle';
import { Logger } from '../../../src/utils/classes/Logger';
import ApiMocks from './classes/ApiMocks';
import { mockOpenChromaLumexFile } from './mocks/files';
import addSlowMo from '../helpers/addSlowMo';

const loggerConfig = { logSetup: true, logCleanup: false, logTest: true };
const setupLogger = new Logger("SETUP", loggerConfig.logSetup);
const cleanupLogger = new Logger("CLEANUP", loggerConfig.logCleanup);
const testLogger = new Logger("TEST", loggerConfig.logTest);

const loggers = new Proxy({ setupLogger, cleanupLogger, testLogger }, {
  get(target, name) {
    const logger = target[name];
    return logger ?? console;
  }
});

const test = base.extend({
  // Your existing page fixture...
  page: async ({ page }, use) => {
    await page.addInitScript((mockFile) => {
      window.__TEST_ELECTRON_API = {
        openMdfx: async () => {
          console.log('[MOCK] openMdfx called');
          return mockFile;
        },
        getRecentFiles: async () => {
          console.log('[MOCK] getRecentFiles called');
          return [];
        },
        checkFile: async () => {
          console.log('[MOCK] checkFile called');
          return { isFullAccess: true, exists: true, readable: true };
        },
        saveAs: async () => {
          console.log('[MOCK] saveAs called');
          return { canceled: false, filePath: 'saved.mdfx' };
        },
        generateXLSX: () => console.log('[MOCK] generateXLSX called'),
        confirmClose: () => console.log('[MOCK] confirmClose called'),
        onAttemptClose: () => console.log('[MOCK] onAttemptClose called'),
        offAttemptClose: () => console.log('[MOCK] offAttemptClose called'),
      };
      console.log('[SETUP] Mock Electron API injected');
    }, mockOpenChromaLumexFile);
    await use(page);
  },

  // Provide a `window` alias (the page) that automatically navigates and waits
  window: async ({ page }, use) => {
    const slowMo = process.env.SLOW_MO ? parseInt(process.env.SLOW_MO, 10) : 0;
    
    // Apply slowMo plugin (only if delay > 0)
    addSlowMo(page, slowMo);

    setupLogger.log('Navigating to dev server...');
    await page.goto('http://localhost:5000');

    // Verify the mock was injected
    const hasMock = await page.evaluate(() => !!window.__TEST_ELECTRON_API);
    setupLogger.log(`Mock present after navigation: ${hasMock}`);

    if (!hasMock) {
      await page.evaluate(() => {
        window.__TEST_ELECTRON_API = {
          openMdfx: async () => [{
            path: 'custom.mdfx',
            fileName: 'custom.mdfx',
            hash: 'custom-hash',
            id: 'custom.mdfx_custom-hash'
          }],
          getRecentFiles: async () => [],
          checkFile: async () => ({ isFullAccess: true, exists: true, readable: true }),
          saveAs: async () => ({ canceled: false, filePath: 'saved.mdfx' }),
          generateXLSX: () => {},
          confirmClose: () => {},
          onAttemptClose: () => {},
          offAttemptClose: () => {},
        };
        console.log('[SETUP] Mock re-injected after navigation');
      });
    }

    setupLogger.log('Waiting for app to be ready...');
    await page.setViewportSize({ width: 1920, height: 1080 });
    await waitForAppReady(page, loggers);
    
    await use(page);
  },

  // Keep your other fixtures as they are...
  electronApp: async ({}, use) => {
    await use(null);
  },

  apiMocks: async ({ window }, use) => {
    const mocks = new ApiMocks(window);
    await use(mocks);
    await mocks.clearAllMocks();
  },

  loggers: async ({}, use) => {
    await use(loggers);
  },
});

export { test, expect };