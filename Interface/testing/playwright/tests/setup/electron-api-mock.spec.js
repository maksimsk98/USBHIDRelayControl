import { expect, test } from "../../fixtures/electronFixtures";

test.describe.configure({ mode: 'serial' });

test.skip()

test('should use test mock API and not real API', async ({ window, loggers }) => {
  const logger = loggers.testLogger;
  test.setTimeout(15000);

  // Wait for TestTagger to be available and flags to be set
  await window.waitForFunction(
    () => {
      if (!window.__TEST_TAGS) return false;
      
      // Check if all required flags are set
      const hasMockFlag = window.__TEST_TAGS.flags.get('useElectronAPI.usingMock') === true;
      const hasOpenMdfxMockFlag = window.__TEST_TAGS.flags.get('useElectronAPI.method.openMdfx.usingMock') === true;
      
      return hasMockFlag && hasOpenMdfxMockFlag;
    },
    { timeout: 10000, polling: 100 }
  );

  // Optional: Verify logs as well
  const logs = await window.evaluate(() => window.__TEST_TAGS?.logs || []);
  logger.log(`Captured ${logs.length} test logs`);
  
  // Log all captured test tags for debugging
  const flags = await window.evaluate(() => {
    const flagsObj = {};
    if (window.__TEST_TAGS?.flags) {
      for (const [key, value] of window.__TEST_TAGS.flags.entries()) {
        flagsObj[key] = value;
      }
    }
    return flagsObj;
  });
  logger.log('Test flags:', flags);

  // Verify specific flags exist
  const hasRequiredFlags = await window.evaluate(() => {
    const flags = window.__TEST_TAGS?.flags;
    return flags?.get('useElectronAPI.usingMock') === true && 
           flags?.get('useElectronAPI.method.openMdfx.usingMock') === true;
  });
  
  expect(hasRequiredFlags).toBe(true);
});
