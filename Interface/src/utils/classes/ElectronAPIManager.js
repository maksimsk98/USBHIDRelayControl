import { testTagger } from "./TestTagger";

export default class ElectronAPIManager {
  constructor() {
    // If instance already exists, return it
    if (ElectronAPIManager.instance) {
      return ElectronAPIManager.instance;
    }
    
    this.api = null;
    this.initialized = false;
    
    // Store the instance
    ElectronAPIManager.instance = this;
  }
  
  static getInstance() {
    if (!ElectronAPIManager.instance) {
      ElectronAPIManager.instance = new ElectronAPIManager();
    }
    return ElectronAPIManager.instance;
  }
  
  initialize() {
    if (this.initialized) {
      return this.api;
    }
    
    const realAPI = typeof window !== 'undefined' && window.electronAPI ? window.electronAPI : null;
    const testMock = typeof window !== 'undefined' && window.__TEST_ELECTRON_API ? window.__TEST_ELECTRON_API : null;

    if (testMock) {
      testTagger.setFlag('useElectronAPI.usingMock', true);
      testTagger.addLog('[TEST] useElectronAPI – using test mock API (with fallback to real API for unmocked methods)');

      const combined = {};
      const realMethods = realAPI ? Object.keys(realAPI).filter(k => typeof realAPI[k] === 'function') : [];
      const mockMethods = Object.keys(testMock).filter(k => typeof testMock[k] === 'function');
      const allMethods = [...new Set([...realMethods, ...mockMethods])];

      for (const method of allMethods) {
        if (testMock[method] && typeof testMock[method] === 'function') {
          combined[method] = testMock[method];
          testTagger.setFlag(`useElectronAPI.method.${method}.usingMock`, true);
          testTagger.addLog(`[TEST]   - ${method}: using mock`);
        } else if (realAPI && realAPI[method]) {
          combined[method] = realAPI[method].bind(realAPI);
          testTagger.setFlag(`useElectronAPI.method.${method}.usingReal`, true);
          testTagger.addLog(`[TEST]   - ${method}: using real API`);
        } else {
          combined[method] = async () => null;
          testTagger.setFlag(`useElectronAPI.method.${method}.usingFallback`, true);
          testTagger.addLog(`[TEST]   - ${method}: no implementation, using fallback`, 'warn');
        }
      }
      
      this.api = combined;
    } else if (realAPI) {
      testTagger.setFlag('useElectronAPI.usingReal', true);
      testTagger.addLog('[APP] useElectronAPI – using real Electron API');
      this.api = realAPI;
    } else {
      testTagger.setFlag('useElectronAPI.usingFallback', true);
      testTagger.addLog('[APP] useElectronAPI – no API available, using fallback', 'warn');
      this.api = {
        openMdfx: async () => null,
        getRecentFiles: async () => [],
        checkFile: async () => ({ isFullAccess: false, exists: false, readable: false }),
        generateXLSX: () => {},
        saveAs: async () => null,
        confirmClose: () => {},
        onAttemptClose: () => {},
        offAttemptClose: () => {},
      };
    }
    
    this.initialized = true;
    testTagger.addLog('[API] Initialization complete');
    
    return this.api;
  }
  
  getAPI() {
    return this.api;
  }
  
  isInitialized() {
    return this.initialized;
  }
}