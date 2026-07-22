// scripts/record-electron-working.js
const { exec, spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

// Launch Electron with debugging
function launchElectron() {
  return new Promise((resolve, reject) => {
    console.log('🚀 Launching Electron with debugging...');
    
    const electron = spawn('npx', [
      'electron',
      path.join(__dirname, '../main.js'),
      '--remote-debugging-port=9222',
      '--session-id', `record-${Date.now()}`
    ], {
      shell: true,
      detached: true,
      stdio: 'ignore'
    });
    
    electron.unref();
    
    // Wait for Electron to start
    setTimeout(resolve, 3000);
  });
}

// Get the WebSocket URL for the app
function getWebSocketUrl() {
  return new Promise((resolve, reject) => {
    console.log('🔍 Finding app WebSocket URL...');
    
    http.get('http://localhost:9222/json/list', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const pages = JSON.parse(data);
          console.log(`\n📋 Found ${pages.length} inspectable pages:\n`);
          
          pages.forEach((page, i) => {
            console.log(`  ${i + 1}. ${page.title}`);
            console.log(`     URL: ${page.url}`);
            console.log(`     WS: ${page.webSocketDebuggerUrl}\n`);
          });
          
          // Find the main app page (not devtools)
          const appPage = pages.find(page => 
            page.type === 'page' && 
            page.title !== 'Developer Tools' &&
            (page.url.includes('file://') || page.url.includes('http'))
          );
          
          if (appPage && appPage.webSocketDebuggerUrl) {
            console.log(`✅ Selected: ${appPage.title}`);
            resolve(appPage.webSocketDebuggerUrl);
          } else {
            reject(new Error('No valid app page found. Make sure your Electron app is running.'));
          }
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

// Main function
async function recordTest() {
  console.log('\n🎬 PLAYWRIGHT ELECTRON RECORDER\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Check if Electron is already running with debugging
  let electronRunning = false;
  try {
    await new Promise((resolve, reject) => {
      http.get('http://localhost:9222/json/version', (res) => {
        electronRunning = true;
        resolve();
      }).on('error', reject);
    });
  } catch (err) {
    electronRunning = false;
  }
  
  if (!electronRunning) {
    console.log('No Electron instance found with debugging enabled.');
    console.log('Starting Electron with debugging...\n');
    await launchElectron();
    console.log('✅ Electron started!\n');
    // Wait a bit more for Electron to fully initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
  } else {
    console.log('✅ Found existing Electron instance with debugging\n');
  }
  
  // Get the WebSocket URL
  let wsUrl;
  try {
    wsUrl = await getWebSocketUrl();
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.log('\n💡 Manual workaround:');
    console.log('   1. Open http://localhost:9222 in Chrome');
    console.log('   2. Click on your app link');
    console.log('   3. In the new window, copy the WebSocket URL');
    console.log('   4. Run: npx playwright codegen <websocket-url>\n');
    process.exit(1);
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📝 STARTING PLAYWRIGHT INSPECTOR');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`🔌 Connecting to: ${wsUrl}\n`);
  console.log('🎯 INSTRUCTIONS:');
  console.log('   1. Playwright Inspector will open');
  console.log('   2. Click and interact with your Electron app');
  console.log('   3. Each action will appear in the inspector');
  console.log('   4. Click "Copy" to copy the generated code');
  console.log('   5. Close the inspector when done\n');
  console.log('⏰ Press Ctrl+C in THIS terminal to stop recording\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║        PLAYWRIGHT INSPECTOR - COMPLETE HOTKEYS GUIDE         ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│                      GENERAL HOTKEYS                        │');
console.log('├─────────────────────────────────────────────────────────────┤');
console.log('│  ?               │  Show/hide this help panel              │');
console.log('│  Esc             │  Close modal/dialog                     │');
console.log('│  Ctrl + C        │  Stop recording and exit                │');
console.log('│  Ctrl + S        │  Save test to file                      │');
console.log('│  Ctrl + Shift + P│  Open command palette                   │');
console.log('│  Ctrl + F        │  Search in generated code               │');
console.log('└─────────────────────────────────────────────────────────────┘\n');

console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│                    RECORDING HOTKEYS                        │');
console.log('├─────────────────────────────────────────────────────────────┤');
console.log('│  Ctrl + R        │  Start/stop recording                   │');
console.log('│  Click Element   │  Record click action                    │');
console.log('│  Type in field   │  Record fill action                     │');
console.log('│  Select dropdown │  Record select option                   │');
console.log('│  Check checkbox  │  Record check action                    │');
console.log('│  Press Enter     │  Record form submit                     │');
console.log('│  Right-click     │  Record right-click action              │');
console.log('│  Double-click    │  Record double-click action             │');
console.log('│  Hover element   │  Record hover action                    │');
console.log('│  Drag & drop     │  Record drag/drop action                │');
console.log('└─────────────────────────────────────────────────────────────┘\n');

console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│                    SELECTOR HOTKEYS                         │');
console.log('├─────────────────────────────────────────────────────────────┤');
console.log('│  Hover element   │  Highlight element & show selector      │');
console.log('│  Shift + Click   │  Pick element and record action         │');
console.log('│  Alt + Click     │  Copy selector to clipboard              │');
console.log('│  Ctrl + Click    │  Record with priority selector           │');
console.log('│  Shift + Hover   │  Show all possible selectors             │');
console.log('│  Right-click     │  Open selector context menu              │');
console.log('└─────────────────────────────────────────────────────────────┘\n');

console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│                    ASSERTION HOTKEYS                        │');
console.log('├─────────────────────────────────────────────────────────────┤');
console.log('│  Ctrl + A        │  Add assertion for selected element     │');
console.log('│  Ctrl + Shift + V│  Add "toBeVisible()" assertion          │');
console.log('│  Ctrl + Shift + T│  Add "toHaveText()" assertion           │');
console.log('│  Ctrl + Shift + V│  Add "toHaveValue()" assertion          │');
console.log('│  Ctrl + Shift + C│  Add "toHaveClass()" assertion          │');
console.log('│  Ctrl + Shift + A│  Add "toHaveAttribute()" assertion      │');
console.log('│  Ctrl + Shift + D│  Add "toBeDisabled()" assertion         │');
console.log('│  Ctrl + Shift + E│  Add "toBeEnabled()" assertion          │');
console.log('│  Ctrl + Shift + F│  Add "toBeFocused()" assertion          │');
console.log('│  Ctrl + Shift + H│  Add "toBeHidden()" assertion           │');
console.log('│  Ctrl + Shift + C│  Add "toContainText()" assertion        │');
console.log('└─────────────────────────────────────────────────────────────┘\n');

console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│                    CODE GENERATION HOTKEYS                  │');
console.log('├─────────────────────────────────────────────────────────────┤');
console.log('│  Ctrl + C        │  Copy generated code                    │');
console.log('│  Ctrl + Shift + C│  Copy as different language             │');
console.log('│  Ctrl + S        │  Save to file                           │');
console.log('│  Ctrl + Z        │  Undo last action                       │');
console.log('│  Ctrl + Y        │  Redo action                            │');
console.log('│  Ctrl + X        │  Cut selected code                      │');
console.log('│  Ctrl + V        │  Paste code                             │');
console.log('└─────────────────────────────────────────────────────────────┘\n');

console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│                    NAVIGATION HOTKEYS                       │');
console.log('├─────────────────────────────────────────────────────────────┤');
console.log('│  Ctrl + Tab      │  Switch between tabs                    │');
console.log('│  Ctrl + [        │  Previous action                        │');
console.log('│  Ctrl + ]        │  Next action                            │');
console.log('│  Home            │  Go to first action                     │');
console.log('│  End             │  Go to last action                      │');
console.log('│  Page Up         │  Scroll up in actions list              │');
console.log('│  Page Down       │  Scroll down in actions list            │');
console.log('└─────────────────────────────────────────────────────────────┘\n');

console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│                    DEBUG HOTKEYS                            │');
console.log('├─────────────────────────────────────────────────────────────┤');
console.log('│  Ctrl + D        │  Toggle debug mode                      │');
console.log('│  Ctrl + Shift + D│  Open DevTools for page                 │');
console.log('│  F8              │  Pause execution                        │');
console.log('│  F10             │  Step over                              │');
console.log('│  F11             │  Step into                              │');
console.log('│  Shift + F11     │  Step out                               │');
console.log('└─────────────────────────────────────────────────────────────┘\n');
  
  // Launch Playwright codegen with the WebSocket URL
  const codegen = spawn('npx', [
    'playwright',
    'codegen',
    '--target=javascript',
    wsUrl
  ], {
    shell: true,
    stdio: 'inherit'
  });
  
  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Stopping recording...');
    codegen.kill();
    setTimeout(() => process.exit(0), 1000);
  });
  
  // Wait for codegen to finish
  codegen.on('exit', () => {
    console.log('\n✅ Recording session ended');
    process.exit(0);
  });
}

// Run the recorder
recordTest().catch(console.error);