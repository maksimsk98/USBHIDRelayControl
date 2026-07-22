const { contextBridge, ipcRenderer, webFrame } = require('electron');

// Request values synchronously during preload
// This blocks until main responds, but it's fine for startup flags
let devValue = false;
let testingValue = false;

try {
  devValue = ipcRenderer.sendSync('get-initial-dev-mode');
  testingValue = ipcRenderer.sendSync('get-initial-testing-mode');
  console.log(`[PRELOAD] Initial values - dev: ${devValue}, testing: ${testingValue}`);
} catch (error) {
  console.error('[PRELOAD] Failed to get initial values:', error);
}

// expose limited safe API to window.electronAPI in renderer
contextBridge.exposeInMainWorld('electronAPI', {
  onAttemptClose: (callback) => ipcRenderer.on('app:attempt-close', callback),
  offAttemptClose: (callback) => {
    ipcRenderer.removeListener('app:attempt-close', callback);
  },
  confirmClose: () => ipcRenderer.send('app:confirm-close'),

  // retry backend conenction
  retryStartup: () => ipcRenderer.send('app:retry-startup'),

  // new server status events
  getSessionId: () => ipcRenderer.invoke('session:get-id'),
  onServerAttempt: (callback) => ipcRenderer.on('server:attempt', callback),
  onServerSuccess: (callback) => ipcRenderer.on('server:success', callback),
  onServerFailed: (callback) => ipcRenderer.on('server:failed', callback),

  // pdf print
  printPDF: (data) => ipcRenderer.invoke("generate-pdf", data),
  
  // xlsx export
  generateXLSX: (rows) => ipcRenderer.invoke("xlsx:generate", rows),
  // docx export
  generateDOCX: (payload) =>
    ipcRenderer.invoke("docx:generate", payload),

  printHTML: (payload) => ipcRenderer.invoke('html:print', payload),

  // mode handling
  onDevMode: (callback) => {
    const handler = (_, value) => {
      devValue = value;
      callback(value);
    };

    ipcRenderer.on("env:isDev", handler);

    return () => {
      ipcRenderer.removeListener("env:isDev", handler);
    };
  },

  getDevMode: () => devValue,

  onTestingMode: (callback) => {
    const handler = (_, value) => {
      testingValue = value;
      console.log(`[ENV] passing env dev=${devValue} testing=${testingValue}`);
      callback(value);
    };

    ipcRenderer.on("env:isTesting", handler);

    return () => {
      ipcRenderer.removeListener("env:isTesting", handler);
    };
  },

  getTestingMode: () => testingValue,

  //fs
  openMdfx: () => ipcRenderer.invoke('open-mdfx'),
  prepareEntryFromPath: (fullPath) =>
    ipcRenderer.invoke('file:prepare-entry-from-path', fullPath),


  saveAs: (defaultName) =>
    ipcRenderer.invoke('file:save-as', { defaultName }),

  pickFolder: () => ipcRenderer.invoke('fs:pick-folder'),

  getRecentFiles: () => ipcRenderer.invoke('get-recent-files'),
  
  checkFile: (filePath) =>
    ipcRenderer.invoke('fs:check-file', filePath),
});

const electronFS = {
  pickRoot: () => ipcRenderer.invoke('fs:pick-root'),
  getFile: (filePath) => ipcRenderer.invoke('fs:read-file-blob', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('fs:write-file', filePath, content),
  getDirectoryHandle: async (dirPath) => {
  const entries = await ipcRenderer.invoke('fs:read-dir', dirPath);
    return {
      kind: 'directory',
      name: dirPath.split(/[\\/]/).pop(),
      path: dirPath,
      entries, // plain JSON array
    };
  },

};

contextBridge.exposeInMainWorld('electronFS', electronFS);

contextBridge.exposeInMainWorld('electronZoom', {
  getFactor: () => webFrame.getZoomFactor(),
  getLevel: () => webFrame.getZoomLevel(),
  setFactor: (factor) => webFrame.setZoomFactor(factor),
  setLevel: (level) => webFrame.setZoomLevel(level),

});
