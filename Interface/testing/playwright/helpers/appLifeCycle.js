export async function waitForAppReady(page, loggers) {
  const logger = loggers?.setupLogger;
    
  // Don't wait for network idle - pollers will keep it busy!
  // Just wait for DOM content loaded
  await page.waitForLoadState('domcontentloaded');
  
  // Wait for React root element
  await page.waitForSelector('#root', { timeout: 10000 });
  
  // Wait for your app's main element (working-area)
  await page.waitForSelector('#working-area', { timeout: 10000 });
    
  // Small buffer for React to settle after initial render
  await page.waitForTimeout(500);
  
  logger.log('App is ready for testing');
}

export async function reloadApplication(window) {
  await window.reload();
  await window.waitForLoadState('domcontentloaded');
  await window.waitForSelector('#working-area', { timeout: 10000 });
}