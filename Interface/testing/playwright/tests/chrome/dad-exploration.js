import { test } from "../../fixtures/mockedChromiumFixtures";
import { DetectorMockHelper } from "../../fixtures/classes";
import { DETECTOR_TYPES } from "../../../../src/constants/constants";
import { reloadApplication } from "../../helpers/appLifeCycle";

// Only run this test if EXPLORE=true is set
const shouldExplore = process.env.EXPLORE === 'true';

test.describe('DAD Detector Tests', () => {
  /** @type {DetectorMockHelper} */
  let mockHelper;

  test.beforeEach(async ({ apiMocks }) => {
    apiMocks.enableEndpointLogging('POST', '/api/methods/chooseMethod', { verbose: true });
    mockHelper = new DetectorMockHelper(apiMocks);
    await mockHelper.saveInitial();
  });

  test.afterEach(async () => {
    await mockHelper.restoreInitial();
  });

  test('Explore app in Chrome with mock API', async ({ window }) => {
    // Skip if not in explore mode
    test.skip(!shouldExplore, 'This test is only for manual exploration. Run with EXPLORE=true');
    
    await mockHelper.setupDAD('DADName');
    const effectiveMock = await mockHelper.setupMethod({ 
        detectorType: DETECTOR_TYPES.DAD, 
        clearAllMocks: false,
    });
    await reloadApplication(window)

    // Keep the test alive until you close the Inspector.
    await new Promise(() => {});
  });

});

