import { test } from "../../fixtures/chromiumFixtures";

// Only run this test if EXPLORE=true is set
const shouldExplore = process.env.EXPLORE === 'true';

test('Explore app in Chrome with mock API', async ({ window }) => {
  // Skip if not in explore mode
  test.skip(!shouldExplore, 'This test is only for manual exploration. Run with EXPLORE=true');
  
  console.log('🔍 Manual exploration mode activated');
  console.log('🎬 Playwright Inspector will open');
  console.log('📝 You can now manually interact with the app');
  console.log('▶️  Press "Resume" in the inspector when done');
  
  // The `window` fixture has already navigated and waited for the app.
  // Now we open the Playwright Inspector.
  await window.pause();

  // Keep the test alive until you close the Inspector.
  await new Promise(() => {});
});