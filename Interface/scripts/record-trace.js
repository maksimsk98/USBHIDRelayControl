// scripts/record-trace.js
const { _electron: electron } = require('playwright');
const path = require('path');
const fs = require('fs');

async function recordTrace() {
  console.log('🎬 Starting trace recording...');
  
  // Launch your Electron app
  const electronApp = await electron.launch({
    args: [path.join(__dirname, '../main.js')],
    env: {
      ...process.env,
      TESTING: 'true',
    },
  });
  
  const window = await electronApp.firstWindow();
  
  // Wait for app to be ready
  await window.waitForLoadState('domcontentloaded');
  await window.waitForSelector('#root', { timeout: 10000 });
  
  console.log('✅ App ready!');
  console.log('\n📝 RECORDING MODE ACTIVE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('1. Start interacting with your app NOW');
  console.log('2. Perform all the actions you want to record');
  console.log('3. Each action will be captured as a snapshot');
  console.log('4. When done, press ENTER in this terminal');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Start tracing with maximum detail
  await window.context().tracing.start({
    screenshots: true,      // Capture screenshots
    snapshots: true,        // Capture DOM snapshots  
    sources: true,          // Include source code
  });
  
  console.log('🔴 RECORDING... (interact with your app now)\n');
  
  // Give user time to interact
  await new Promise(resolve => {
    const timeout = setTimeout(() => {
      resolve();
    }, 30000); // Record for 30 seconds by default
    
    process.stdin.once('data', () => {
      clearTimeout(timeout);
      resolve();
    });
  });
  
  // Stop tracing and save
  const tracesDir = path.join(__dirname, '../traces');
  if (!fs.existsSync(tracesDir)) fs.mkdirSync(tracesDir);
  
  const tracePath = path.join(tracesDir, `trace-${Date.now()}.zip`);
  await window.context().tracing.stop({ path: tracePath });
  
  console.log(`\n✅ Trace saved to: ${tracePath}`);
  console.log(`📊 File size: ${(fs.statSync(tracePath).size / 1024).toFixed(2)} KB\n`);
  
  await electronApp.close();
  
  // Open trace viewer
  console.log('🚀 Opening trace viewer...');
  const { exec } = require('child_process');
  exec(`npx playwright show-trace "${tracePath}"`, (error) => {
    if (error) {
      console.log('Failed to auto-open. Run manually:');
      console.log(`npx playwright show-trace "${tracePath}"`);
    }
  });
}

recordTrace().catch(console.error);