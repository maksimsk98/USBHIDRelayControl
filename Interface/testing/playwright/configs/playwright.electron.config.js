const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
    
  // Use projects to control execution order
  projects: [
    // 1. SETUP PROJECT - runs first
    {
      name: 'setup',
      testDir: '../tests/setup',
      testMatch: '**/*.js',
      fullyParallel: false,
      retries: 0,  // Don't retry setup failures
    },
    {
      name: 'tests',
      testMatch: '**/*.js',
      testDir: '../tests/electron',
      dependencies: ['setup'],  // Wait for setup to complete
      fullyParallel: false,
      retries: 0, 
      use: {
        // Inherit storage state from setup if needed
        storageState: 'storage-state.json',
      }
    }
  ],
  // Use environment variable to control which tests run
  grep: process.env.TEST_PATTERN ? new RegExp(process.env.TEST_PATTERN) : undefined,
  grepInvert: process.env.SKIP_PATTERN ? new RegExp(process.env.SKIP_PATTERN) : undefined,

  fullyParallel: false,
  workers: 1,
  timeout: 8000,
  
  use: {
    launchOptions: {
      args: ['./main.js'],
      env: {
        TESTING: 'true',
      },
      headless: true
    },
    
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },
});