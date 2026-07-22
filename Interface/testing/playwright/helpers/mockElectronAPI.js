export async function mockElectronAPI(page, mockData = {}) {
  // If no mockData provided, do nothing (real API will be used)
  if (Object.keys(mockData).length === 0) {
    console.log('[TEST] No mock data provided, real API will be used');
    return;
  }

  await page.addInitScript((data) => {
    // Build the mock object only with the methods that have overrides
    const mockApi = {};

    if (data.openMdfxReturn !== undefined) {
      mockApi.openMdfx = async () => {
        console.log('[MOCK] openMdfx called');
        return data.openMdfxReturn;
      };
    }

    if (data.getRecentFilesReturn !== undefined) {
      mockApi.getRecentFiles = async () => {
        console.log('[MOCK] getRecentFiles called');
        return data.getRecentFilesReturn;
      };
    }

    if (data.checkFileReturn !== undefined) {
      mockApi.checkFile = async () => {
        console.log('[MOCK] checkFile called');
        return data.checkFileReturn;
      };
    }

    if (data.saveAsReturn !== undefined) {
      mockApi.saveAs = async () => {
        console.log('[MOCK] saveAs called');
        return data.saveAsReturn;
      };
    }

    if (Object.keys(mockApi).length > 0) {
      window.__TEST_ELECTRON_API = mockApi;
      console.log('[TEST] Mock Electron API injected (partial)');
    } else {
      // Should not happen because we already checked length, but safe fallback
      console.log('[TEST] No mock methods to inject');
    }
  }, mockData);
}