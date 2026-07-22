import { test } from '../../fixtures/chromiumFixtures';

const getSlowMoValue = () => {
  if (process.env.SLOW_MO) return parseInt(process.env.SLOW_MO, 10);
  if (process.env.EXPLORE === 'true') return 500;
  return 0;
};

const slowMo = getSlowMoValue();

test('Check slowMo status', async ({ window }) => {
  test.skip(slowMo <= 0, `Skipped - run with SLOW_MO=xxx to test slowMo (current: ${slowMo}ms)`);
  
  console.log(`🔍 Testing slowMo with ${slowMo}ms delay...`);
  
  const start = Date.now();
  await window.getByRole('button', { name: 'Измерения' }).click();
  await window.getByRole('menuitem', { name: 'Хроматографические' }).click();
  const duration = Date.now() - start;
  
  const expectedMin = slowMo * 2;
  const isWorking = duration > expectedMin - 100;
  
  console.log(`2 actions took ${duration}ms (expected > ${expectedMin}ms)`);
  
  if (isWorking) {
    console.log(`✅ slowMo is working!`);
  } else {
    console.log(`❌ slowMo is NOT working!`);
    throw new Error(`slowMo test failed: ${duration}ms < ${expectedMin}ms`);
  }
});