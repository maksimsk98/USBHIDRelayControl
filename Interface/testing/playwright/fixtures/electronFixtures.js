import { test as base, expect, _electron as electron } from '@playwright/test';
import ApiMocks from './classes/ApiMocks';
import { Logger } from '../../../src/utils/classes/Logger';
import { setupInitialMocks } from './mocks/setup';
import { mockElectronAPI } from '../helpers/mockElectronAPI';
import { waitForAppReady } from '../helpers/appLifeCycle';
import { mockOpenChromaLumexFile } from './mocks/files';
import addSlowMo from '../helpers/addSlowMo';

const loggerConfig = {
    logSetup: false,
    logCleanup: false,
    logTest: true,
}

const setupLogger = new Logger("SETUP", loggerConfig.logSetup)
const cleanupLogger = new Logger("CLEANUP", loggerConfig.logCleanup)
const testLogger = new Logger("TEST", loggerConfig.logTest)

const loggers = new Proxy ({setupLogger, cleanupLogger, testLogger}, 
    {
        get(target, name) {
            const logger = target[name]
            return logger ?? console
        }
    }
)

const SESSION_ID = process.env.TEST_SESSION_ID || '';
const OFFLINE_MODE = process.env.OFFLINE_MODE === 'true';
const HEADLESS_MODE = process.env.HEADLESS === 'true';
const DISABLE_GPU = process.env.DISABLE_GPU !== 'false'; // Default to true unless explicitly set to 'false'
const SLOW_MO = process.env.SLOW_MO ? parseInt(process.env.SLOW_MO, 10) : 0;

// Define custom fixtures
const test = base.extend({
  // Electron app fixture
    electronApp: async ({}, use) => {
        setupLogger.log(`Launching Electron with session: ${SESSION_ID}, offline: ${OFFLINE_MODE}`);
        
        // Build args array dynamically
        const args = ['./main.js'];
        
        // Add headless flags if HEADLESS mode is enabled
        if (HEADLESS_MODE) {
            setupLogger.log('⚠️  WARNING: Electron headless mode is experimental - tests may behave unexpectedly');
            args.push('--headless=new');
            
            // Add GPU disable flag unless explicitly disabled
            if (DISABLE_GPU) {
                args.push('--disable-gpu');
            }
        }
        
        if (SESSION_ID) {
        args.push('--session-id', SESSION_ID);
        }
        
        if (OFFLINE_MODE) {
        args.push('--offline');
        }
        
        const electronApp = await electron.launch({
          args,
          env: {
              ...process.env,
              TESTING: 'true',
              TEST_SESSION_ID: SESSION_ID,
          },
          headless: true
        });
        
        await use(electronApp);
        cleanupLogger.log('Closing Electron...');
        await electronApp.close();
    },
  
  // Window fixture (depends on electronApp)
    window: async ({ electronApp }, use) => {
        // Get slowMo from environment variable
        const slowMo = SLOW_MO;

        // Wait for the first window to be created (before any network activity)
        const window = await electronApp.waitForEvent('window');
        await window.setViewportSize({ width: 1920, height: 1080 });

        // Apply slowMo plugin (only if delay > 0)
        if (slowMo > 0) {
            setupLogger.log(`Applying ${slowMo}ms slowMo to Electron window actions`);
            addSlowMo(window, slowMo);
        }
       
        // Now set up mocks before the page loads
        await setupInitialMocks(window);

        // Inject the mock API **before** the page starts loading
        await mockElectronAPI(window, {
          openMdfxReturn: mockOpenChromaLumexFile,
        });
        
        setupLogger.log('Waiting for app to be ready');
        await waitForAppReady(window, loggers);

        

        const hasMockNow = await window.evaluate(() => !!window.__TEST_ELECTRON_API);
        setupLogger.log(`[FIXTURE] After injection, __TEST_ELECTRON_API exists: ${hasMockNow}`);
        
        setupLogger.log('Window loaded with mocked API calls');
        await use(window);
    },
  
  // API mocks fixture (depends on window)
  apiMocks: async ({ window }, use) => {
    const mocks = new ApiMocks(window);
    await use(mocks);
    await mocks.clearAllMocks();
  },

  // EXPOSE loggers as a fixture for tests
  loggers: async ({}, use) => {
    await use(loggers);
  },
});

// Export the custom test and reexport logger class in case it will be extended here
export { test, expect, electron, Logger };