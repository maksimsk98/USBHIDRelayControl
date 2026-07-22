const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '../tests/chrome',
  testMatch: '**/*.js',
  fullyParallel: false,
  workers: 1,
  timeout: 10000,
  
  use: {
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },
});