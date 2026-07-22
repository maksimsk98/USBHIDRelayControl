/**
 * Check that the measurement time displayed in a locator is >= each milestone.
 * @param {import('@playwright/test').Locator} locator - Locator for the measurement time input/field.
 * @param {Array<[number, number]>} milestones - Array of [minutes, seconds] milestones to check.
 * @returns {Promise<void>}
 */
export async function checkMeasurementTime(locator, milestones) {
  for (const [expectedMin, expectedSec] of milestones) {
    const value = await locator.inputValue(); // or .textContent() if it's not an input
    const match = value.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) {
      throw new Error(`Invalid time format: "${value}". Expected "MM:SS".`);
    }
    const actualMin = parseInt(match[1], 10);
    const actualSec = parseInt(match[2], 10);
    const actualTotal = actualMin * 60 + actualSec;
    const expectedTotal = expectedMin * 60 + expectedSec;

    // Use Playwright's expect for nice error messages
    await expect(actualTotal).toBeGreaterThanOrEqual(expectedTotal);
  }
}