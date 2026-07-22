/**
 * Add manual slowMo to page actions
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {number} delayMs - Delay in milliseconds (0 or undefined to disable)
 * @returns {import('@playwright/test').Page} - Same page with wrapped methods
 */
export default function addSlowMo(page, delayMs) {
  // Don't wrap if delay is not positive
  if (!delayMs || delayMs <= 0) {
    return page;
  }

  console.log(`Adding manual ${delayMs}ms delay to all actions`);

  // List of methods to delay
  const methodsToDelay = [
    'click', 'fill', 'press', 'check', 'uncheck', 
    'selectOption', 'dblclick', 'hover', 'type', 'tap'
  ];

  // Wrap page methods
  methodsToDelay.forEach(method => {
    if (page[method] && typeof page[method] === 'function') {
      const original = page[method].bind(page);
      page[method] = async (...args) => {
        const result = await original(...args);
        await page.waitForTimeout(delayMs);
        return result;
      };
    }
  });

  // Wrap locator methods
  const originalLocator = page.locator.bind(page);
  page.locator = function(selector, options) {
    const locator = originalLocator(selector, options);
    
    methodsToDelay.forEach(method => {
      if (locator[method] && typeof locator[method] === 'function') {
        const original = locator[method].bind(locator);
        locator[method] = async (...args) => {
          const result = await original(...args);
          await page.waitForTimeout(delayMs);
          return result;
        };
      }
    });
    
    return locator;
  };

  // Wrap getBy* methods
  const getByMethods = [
    'getByRole', 'getByText', 'getByLabel', 
    'getByPlaceholder', 'getByAltText', 'getByTitle', 'getByTestId'
  ];
  
  getByMethods.forEach(getByMethod => {
    if (page[getByMethod] && typeof page[getByMethod] === 'function') {
      const original = page[getByMethod].bind(page);
      page[getByMethod] = (...args) => {
        const locator = original(...args);
        
        methodsToDelay.forEach(method => {
          if (locator[method] && typeof locator[method] === 'function') {
            const originalMethod = locator[method].bind(locator);
            locator[method] = async (...methodArgs) => {
              const result = await originalMethod(...methodArgs);
              await page.waitForTimeout(delayMs);
              return result;
            };
          }
        });
        
        return locator;
      };
    }
  });

  console.log(`✅ Manual ${delayMs}ms delay added to ${methodsToDelay.length} action types`);
  
  return page;
}

// Export for use in fixtures
export { addSlowMo };