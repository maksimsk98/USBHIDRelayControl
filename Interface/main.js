const { app, BrowserWindow, ipcMain, dialog  } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require("os");
const http = require('http');

const { fileIdGenerator } = require('./src/utils/shared/fileIdGenerator');
const { hashFile } = require('./src/server/services/utils');
const { exportDocxHandler, exportPdfHandler, exportXLSXHandler } = require('./electron/export');
const { ensureSingleExt, stripExt, createServiceWindow, killAllServiceWindows, loadBundledCss } = require('./electron/utils');
const Store = require('electron-store').default;
const RegistryClient = require('./src/utils/registryClient');

const isDev = !!process.env.ELECTRON_DEV;
const isTesting = isDev || !!process.env.TESTING;
const isOfflineMode = !!process.env.OFFLINE_MODE || process.argv.includes('--offline');

console.log(`ELECTRON_DEV= ${process.env.ELECTRON_DEV}, isTesting TESTING=${process.env.TESTING}`)

ipcMain.on('get-initial-dev-mode', (event) => {
  event.returnValue = isDev;
});

ipcMain.on('get-initial-testing-mode', (event) => {
  event.returnValue = isTesting;
});

if (isDev) {
  app.commandLine.appendSwitch('remote-debugging-port', '9222');
}

let mainWindow = null;
let isPrinting = false;
let isPdfExporting = false;
let isDocxExporting = false;
let isXlsxExporting = false;

const recentStore = new Store({ name: 'recent-files' });

// Registry IPC Client state
let registryClient = null;

// Parse session_id from CLI arguments (not environment variable)
// CRITICAL: CLI arguments ensure each Electron instance gets its own unique session_id
// Environment variables would be shared if multiple instances are launched 
// from the same parent process
// When launched via: npm run start_electron -- --session-id sess_abc123
// The arguments after '--' are passed to electron and available in process.argv
let sessionId = '';
const sessionIdArgIndex = process.argv.indexOf('--session-id');
if (sessionIdArgIndex !== -1 && sessionIdArgIndex + 1 < process.argv.length) {
  sessionId = process.argv[sessionIdArgIndex + 1];
  console.log(`[Registry] Parsed session_id from CLI argument: ${sessionId}`);
  console.log('[Registry] Full process.argv:', process.argv);
} else {
  console.warn('[Registry] No session_id provided via --session-id CLI argument. Registry features may not work correctly.');
  console.log('[Registry] Available process.argv:', process.argv);
}

// Function to setup temp directory for this instance
function setupTempUserData() { 
  // timestamp to make absolutely unique 
  const timestamp = Date.now();
  const uniqueId = `${sessionId}-${timestamp}`;
  
  // Create temp directory path in OS temp folder
  const tempDir = path.join(os.tmpdir(), 'electron-instances', uniqueId);
  
  // Ensure directory exists (clean slate)
  try {
    // Remove if exists from previous crashed run
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    // Create fresh directory
    fs.mkdirSync(tempDir, { recursive: true });
  } catch (error) {
    console.error('Failed to setup temp directory:', error);
  }
  
  // Set Electron to use this temp directory
  app.setPath('userData', tempDir);
  
  console.log(`[Electron PROD] Using temp user data: ${tempDir}`);
  
  // Clean up on app quit
  app.on('will-quit', () => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log(`[Electron PROD] Cleaned up temp directory: ${tempDir}`);
    } catch (error) {
      console.error('[Electron PROD] Failed to clean up temp directory:', error);
    }
  });
  
  return tempDir;
  
}

// Call it immediately
setupTempUserData();

const RECENT_MAX = 5;

function pad2(n) {
  return String(n).padStart(2, "0");
}

/**
 * Removes ALL trailing repetitions of given extension (case-insensitive).
 *
 * @param {string} pathOrName
 * @param {string} ext - extension WITH dot, e.g. ".mdfx", ".xlsx"
 *
 * examples:
 *  normalizeTrailingExt("foo.mdfx.mdfx", ".mdfx") -> "foo"
 *  normalizeTrailingExt("foo.txt.mdfx.mdfx", ".mdfx") -> "foo.txt"
 *  normalizeTrailingExt("foo.xlsx.xlsx.xlsx", ".xlsx") -> "foo"
 *  normalizeTrailingExt("foo.xlsx.bak.xlsx", ".xlsx") -> "foo.xlsx.bak"
 */
function normalizeTrailingExt(pathOrName, ext) {
  if (!ext.startsWith('.')) {
    throw new Error(`Extension must start with dot: "${ext}"`);
  }

  // escape dot and other regex chars just in case
  const escaped = ext.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})+$`, 'i');

  return pathOrName.replace(regex, '');
}

function addRecentEntry(entry) {
  // entry = { path, fileName, hash, id }

  let list = recentStore.get('files', []);

  // IMPORTANT: remove duplicates by ID, not hash
  list = list.filter(item => item.id !== entry.id);

  // prepend new
  list.unshift(entry);

  // cap length
  if (list.length > RECENT_MAX) {
    list = list.slice(0, RECENT_MAX);
  }

  recentStore.set('files', list);
}

function getRecentEntries() {
  return recentStore.get('files', []);
}

function safeStatSync(p) {
  try {
    return fs.statSync(p);
  } catch {
    return null;
  }
}

function checkFileAccess(p) {
  // existence + readability (Windows/NTFS can “exist” but be unreadable)
  if (!p || typeof p !== 'string') {
    return { exists: false, readable: false, stat: null };
  }

  const stat = safeStatSync(p);
  if (!stat || !stat.isFile()) {
    return { exists: false, readable: false, stat: null };
  }

  let readable = true;
  try {
    fs.accessSync(p, fs.constants.R_OK);
  } catch {
    readable = false;
  }

  return { exists: true, readable, stat };
}

function validateRecentEntries({ pruneMissing = false } = {}) {
  const list = getRecentEntries();

  const validated = list.map((entry) => {
    const { exists, readable, stat } = checkFileAccess(entry?.path);
    return {
      ...entry,
      exists,
      readable,
      meta: stat
        ? { size: stat.size, mtimeMs: stat.mtimeMs }
        : null,
    };
  });

  if (pruneMissing) {
    const removed = validated.filter(e => !e.exists || !e.readable);

    if (removed.length) {
      console.warn('[RECENT FILES] Pruned missing/unreadable entries:');
      for (const e of removed) {
        console.warn(' -', {
          id: e.id,
          fileName: e.fileName,
          path: e.path,
          exists: e.exists,
          readable: e.readable,
        });
      }
    }
    const pruned = validated.filter(e => e.exists && e.readable);

    recentStore.set(
      'files',
      pruned.map(({ exists, readable, meta, ...rest }) => rest)
    );

    return pruned;
  }

  return validated;
}



// Global safety: kill unresponsive orphan windows (PDF workers, hot reload leftovers) */
app.on('browser-window-created', (_, win) => {
  win.on('unresponsive', () => {
    console.warn("Killing unresponsive window:", win.id);
    try { win.destroy(); } catch {}
  });
});

const SERVER_URL = 'http://localhost:5000';
const RETRY_INTERVAL = 1500; // ms
const MAX_RETRIES = 20;      // optional safety cap

async function waitForServer(
  win,
  url = SERVER_URL,
  interval = RETRY_INTERVAL,
  maxRetries = MAX_RETRIES,
  silentAttempts = 3
) {
  // Clamp silentAttempts so it never exceeds total retries
  silentAttempts = Math.min(silentAttempts, maxRetries);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const isSilent = attempt <= silentAttempts;

    if (!isSilent) {
      // Notify renderer only after silent attempts are done
      win.webContents.send('server:attempt', { attempt: attempt - silentAttempts, maxRetries: maxRetries - silentAttempts });
    }

    const ok = await new Promise(resolve => {
      const req = http.get(url, res => {
        res.resume(); // discard body
        resolve(res.statusCode >= 200 && res.statusCode < 500);
      });
      req.on('error', () => resolve(false));
      req.setTimeout(1000, () => {
        req.destroy();
        resolve(false);
      });
    });

    if (ok) {
      if (!isSilent) {
        win.webContents.send('server:success', { attempt: attempt - silentAttempts });
      }
      console.log(`Server ready after ${attempt} total attempt(s)`);
      return true;
    }

    console.log(
      isSilent
        ? `Silent wait ${attempt}/${silentAttempts}...`
        : `Visible wait ${attempt - silentAttempts}/${maxRetries - silentAttempts}...`
    );

    await new Promise(r => setTimeout(r, interval));
  }

  // If we reach here — all failed
  win.webContents.send('server:failed', { maxRetries: maxRetries - silentAttempts });
  console.error(`Server never responded after ${maxRetries} attempts`);
  return false;
}

/**
 * Safely log to console, ignoring EPIPE errors.
 * EPIPE occurs when stdout/stderr is closed (e.g., parent process exited).
 * This is safe to ignore in offline mode where parent process exits immediately.
 *
 * @param {Function} logFn - Console function to call (console.log, console.error, etc.)
 * @param {...any} args    - Arguments to pass to log function
 */
function safeConsoleLog(logFn, ...args) {
  try {
    logFn(...args);
  } catch (logError) {
    // Ignore EPIPE errors when writing to closed stdout/stderr (parent process exited)
    // This is expected behavior in offline mode and safe to ignore
    if (logError.code !== 'EPIPE' && logError.code !== 'ENOTCONN') {
      // Re-throw non-EPIPE/ENOTCONN errors (unexpected errors)
      throw logError;
    }
    // EPIPE/ENOTCONN errors are silently ignored (expected in offline mode)
  }
}

/**
 * Safely read image file and convert to base64.
 * Includes validation for file existence, type, and size.
 *
 * @param {string} filePath - Path to image file
 * @param {number} maxSizeBytes - Maximum file size in bytes (default: 10MB)
 * @returns {Promise<string|null>} Base64 encoded image or null on error
 */
async function readImageFileSafe(filePath, maxSizeBytes = 10 * 1024 * 1024) {
  try {
    // Normalize path for cross-platform compatibility (Windows/Linux)
    const normalizedPath = path.normalize(filePath);

    // Check if file exists and get stats (atomic operation)
    let stats;
    try {
      stats = await fs.promises.stat(normalizedPath);
    } catch (statError) {
      if (statError.code === 'ENOENT') {
        safeConsoleLog(console.log, `Image file not found: ${normalizedPath}`);
        return null;
      }
      throw statError; // Re-throw other errors (permissions, etc.)
    }

    // Validate that it's a file, not a directory
    if (!stats.isFile()) {
      safeConsoleLog(console.error, `Path is not a file: ${normalizedPath}`);
      return null;
    }

    // Check file size to prevent memory issues
    if (stats.size > maxSizeBytes) {
      safeConsoleLog(
        console.error,
        `Image file too large: ${normalizedPath} (${stats.size} bytes, max: ${maxSizeBytes})`,
      );
      return null;
    }

    // Check file is not empty
    if (stats.size === 0) {
      safeConsoleLog(console.error, `Image file is empty: ${normalizedPath}`);
      return null;
    }

    // Read file asynchronously (non-blocking)
    const fileBuffer = await fs.promises.readFile(normalizedPath);

    // Validate buffer is not empty
    if (!fileBuffer || fileBuffer.length === 0) {
      safeConsoleLog(console.error, `Failed to read image file: ${normalizedPath}`);
      return null;
    }

    // Convert to base64
    const base64 = fileBuffer.toString('base64');

    // Basic validation: base64 should not be empty
    if (!base64 || base64.length === 0) {
      safeConsoleLog(console.error, `Base64 encoding failed for: ${normalizedPath}`);
      return null;
    }

    return base64;
  } catch (error) {
    safeConsoleLog(console.error, `Error reading image file ${filePath}:`, error);
    return null;
  }
}

/**
 * Load offline page with Lumex 2026 wallpaper.
 * This page is shown when Electron is launched in offline mode
 * (for multiple chromatograph support).
 *
 * @param {BrowserWindow} win - Electron BrowserWindow instance
 */
async function loadOfflinePage(win) {
  // Define public directory path (normalized for cross-platform compatibility)
  const publicDir = path.normalize(path.join(__dirname, 'public'));

  // Try to load lumex_2026.png, fallback to lumex_2025.png if not available
  const imageCandidates = [
    path.join(publicDir, 'lumex_2026.png'),
    path.join(publicDir, 'lumex_2025.png'),
  ];

  // Try each candidate image sequentially until one succeeds
  // Use recursive function instead of loops (ESLint compliance)
  const tryImageCandidate = async (candidates, index = 0) => {
    if (index >= candidates.length) {
      return { base64: null, path: null };
    }

    const imagePath = candidates[index];
    const base64 = await readImageFileSafe(imagePath);

    if (base64 !== null) {
      return { base64, path: imagePath };
    }

    // Try next candidate recursively
    return tryImageCandidate(candidates, index + 1);
  };

  const { base64, path: loadedImagePath } = await tryImageCandidate(imageCandidates);

  // Build HTML content - avoid duplication by using template function
  const createOfflineHtml = (bodyContent, bodyOverflow = 'hidden') => `
    <html>
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>PeakExpert Web - Offline</title>
      </head>
      <body style="background:white;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;padding:0;overflow:${bodyOverflow};">
        ${bodyContent}
      </body>
    </html>
  `;

  let offlineHtml;
  if (base64 !== null) {
    // Successfully loaded image - create page with wallpaper
    offlineHtml = createOfflineHtml(
      `<img src="data:image/png;base64,${base64}" 
             alt="Lumex Wallpaper" 
             style="max-width:100%;max-height:100%;object-fit:contain;">`,
      'hidden',
    );
    safeConsoleLog(console.log, `Offline page loaded with Lumex wallpaper: ${loadedImagePath}`);
  } else {
    // Fallback to simple white page if images are unavailable
    offlineHtml = createOfflineHtml(
      '<h1 style="color:#333;font-family:sans-serif;text-align:center;">PeakExpert Web - Offline Mode</h1>',
      'visible',
    );
    safeConsoleLog(console.warn, 'Offline page loaded without wallpaper (images not available)');
  }

  try {
    // Encode HTML and load into window
    const encodedHtml = encodeURIComponent(offlineHtml);
    await win.loadURL(`data:text/html;charset=utf-8,${encodedHtml}`);
    win.maximize();
  } catch (error) {
    safeConsoleLog(console.error, 'Failed to load offline page HTML into window:', error);
    // Last resort: try to load empty page
    try {
      const emptyHtml = '<html><body style="background:white;"><h1>PeakExpert Web - Offline</h1></body></html>';
      await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(emptyHtml)}`);
      win.maximize();
    } catch (fallbackError) {
      safeConsoleLog(console.error, 'Critical: Failed to load even fallback page:', fallbackError);
      // Window will remain blank, but at least app won't crash
    }
  }
}

async function loadMainApp(win) {
  // Check if offline mode is requested (for multiple chromatograph support)
/*   if (isOfflineMode) {
    await loadOfflinePage(win);
    return;
  } */

  // Load a neutral placeholder first — white screen with project PNG
  const watermarkPath = path.join(__dirname, 'public', 'lumex_2026.png');

  const base64 = fs.readFileSync(watermarkPath).toString('base64');
  const placeholderHtml = `
  <html><body style="background:white;display:flex;justify-content:center;align-items:center;height:100vh;">
  <img src="data:image/png;base64,${base64}" style="max-width:100%;max-height:100%;">
  </body></html>
  `;
  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(placeholderHtml));
  win.maximize(); // placeholder fills the screen

  //  Try the full wait (with built-in silentAttempts)
  const ok = await waitForServer(win);

  //  If backend ready → go straight to main app
  if (ok) {
    await win.loadURL(SERVER_URL);
    win.maximize();
    return;
  }

  //  If silent attempts failed  show interactive fallback
  const fallbackHtml = `
    <html>
      <body style="font-family:sans-serif;display:flex;flex-direction:column;
                   align-items:center;justify-content:center;height:100vh;background:#fafafa;">
        <h2 id="status">Connecting to backend...</h2>
        <p id="counter">Attempt 0 / ${MAX_RETRIES - 3}</p>
        <button id="retryBtn" style="display:none;padding:8px 16px;font-size:15px;">Retry</button>
        <script>
          const counter = document.getElementById('counter');
          const status = document.getElementById('status');
          const retryBtn = document.getElementById('retryBtn');

          window.electronAPI.onServerAttempt((_, data) => {
            status.textContent = 'Connecting to backend...';
            counter.textContent = 'Attempt ' + data.attempt + ' / ' + data.maxRetries;
          });
          window.electronAPI.onServerFailed((_, data) => {
            status.textContent = 'Failed after ' + data.maxRetries + ' attempts.';
            retryBtn.style.display = 'block';
          });
          window.electronAPI.onServerSuccess((_, data) => {
            status.textContent = 'Connected after ' + data.attempt + ' attempt(s)!';
          });

          retryBtn.addEventListener('click', () => {
            status.textContent = 'Retrying...';
            counter.textContent = '';
            retryBtn.style.display = 'none';
            window.electronAPI.retryStartup();
          });
        </script>
      </body>
    </html>
  `;
  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(fallbackHtml));

  // 5️⃣ Start visible polling (no silent attempts this time)
  const okVisible = await waitForServer(win, SERVER_URL, RETRY_INTERVAL, MAX_RETRIES, 0);
  if (okVisible) {
    await win.loadURL(SERVER_URL);
    win.maximize();
  }
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'public', 'icon_251x251.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      partition: 'persist:pew', // for root handler storage
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'), // connect bridge
      zoomFactor: 1.0,
      zoomingEnabled: true,
    },
  });

  mainWindow.webContents.setVisualZoomLevelLimits(1, 5);

  mainWindow.webContents.on("did-finish-load", () => {
    console.log(`starting ${isDev ? 'development' : 'production'} mode ${isTesting ? 'TESTING' : ''}`);
    mainWindow.webContents.send("env:isDev", isDev);
    mainWindow.webContents.send("env:isTesting", isTesting);

    // Connect to registry IPC server
    // Disconnect existing client before creating new one
    // This prevents multiple connections when did-finish-load fires multiple times
    if (registryClient) {
      console.log('[Registry] Disconnecting existing registry client before reconnecting');
      registryClient.disconnect();
      registryClient = null;
    }

    if (sessionId != null && !isOfflineMode) {
      registryClient = new RegistryClient(sessionId, mainWindow, isOfflineMode);
      registryClient.connect();
    }
  });

  if (isDev) {
    // Open React dev server
    mainWindow.loadURL("http://localhost:3000");

    // Send testing mode immediately for dev mode
    mainWindow.webContents.once("did-finish-load", () => {
      mainWindow.webContents.send("env:isTesting", isTesting);
    });

    // Optional: open Chromium DevTools
    mainWindow.webContents.openDevTools();

    // Enable VS Code debugging of renderer
    mainWindow.webContents.on("did-fail-load", () => {
      // CRA may start slower → retry
      setTimeout(() => {
        mainWindow.loadURL("http://localhost:3000");
      }, 1000);
    });

  } else {
    await loadMainApp(mainWindow);
  }

  mainWindow.on('close', (event) => {
    console.log('[Main] Window close event received');

    // Send window_closing event to registry BEFORE closing
    // This ensures backend is terminated before Electron window closes
    if (registryClient) {
      console.log('[Main] Sending window_closing event to registry');
      registryClient.sendWindowClosing();

      // Give registry server time to process window_closing and terminate backend
      // Small delay to ensure message is sent before disconnect
      setTimeout(() => {
        if (registryClient) {
          registryClient.disconnect();
          registryClient = null;
        }
      }, 100); // 100ms should be enough for message to be sent
    }

    // In offline mode, allow immediate close without confirmation
    if (isOfflineMode) {
      console.log('[Main] Offline mode: allowing immediate close');
      killAllServiceWindows(); // clean up any service windows
      return; // Allow close without preventing default
    }
    event.preventDefault(); // stop closing
    mainWindow.webContents.send('app:attempt-close');
  });

  // cleanup reference when closed
  mainWindow.on('closed', () => {
    console.log('closed')
    // Cleanup registry connection
    if (registryClient) {
      registryClient.disconnect();
      registryClient = null;
    }
    mainWindow = null;
  });
}

// Cleanup on app quit
app.on('before-quit', () => {
  if (registryClient) {
    registryClient.disconnect();
    registryClient = null;
  }
});

ipcMain.on('app:retry-startup', async () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    await loadMainApp(mainWindow);
  }
});

ipcMain.on('app:confirm-close', () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    console.warn('confirm-close called but window already gone', mainWindow, mainWindow?.isDestroyed());
    return;
  }
  // Kill all ephemeral windows before closing main
  killAllServiceWindows();
  
  mainWindow.removeAllListeners('close');
  mainWindow.close();
});

ipcMain.handle('fs:pick-root', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  return canceled ? null : filePaths[0];
});

ipcMain.handle('fs:read-dir', async (_, dirPath) => {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  return entries.map(entry => ({
    name: entry.name,
    kind: entry.isDirectory() ? 'directory' : 'file',
    path: path.join(dirPath, entry.name),
  }));
});

ipcMain.handle('fs:read-file', async (_, filePath) => {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error('Error reading file:', error);
    throw error;
  }
});

ipcMain.handle('fs:read-file-blob', async (_, filePath) => {
  const fs = require('fs');
  const buffer = fs.readFileSync(filePath);
  const stats = fs.statSync(filePath);
  const arrayBuffer = Uint8Array.from(buffer).buffer;
  return {
    arrayBuffer,       // Node Buffer -> structured clone as ArrayBuffer
    meta: {
      name: require('path').basename(filePath),
      type: 'application/octet-stream',
      size: stats.size,
      lastModified: stats.mtimeMs,
    },
  };
});

ipcMain.handle('fs:write-file', async (_, filePath, content) => {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    return fs.writeFileSync(filePath, content);
  } catch (error) {
    console.error('Error writing file:', error);
    throw error;
  }
});

ipcMain.handle("generate-pdf", async (_, options) => {
  if (isPdfExporting) return { ok: false, reason: "pdf-export-in-progress" };
  isPdfExporting = true;

  try {
    return await exportPdfHandler(options);
  } finally {
    isPdfExporting = false;
  }
});

ipcMain.handle('open-mdfx', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'MDFX', extensions: ['mdfx'] }]
  });

  if (result.canceled) return null;

  const entries = await Promise.all(result.filePaths.map(async fullPath => {
    const hash = await hashFile(fullPath);
    const fileName = path.basename(fullPath);
    const id = fileIdGenerator.getId(fileName, hash);

    const entry = { path: fullPath, fileName, hash, id };

    addRecentEntry(entry);

    return entry;
  }));

  return entries;
});

ipcMain.handle('file:prepare-entry-from-path', async (_, fullPath) => {
  try {
    if (!fullPath || typeof fullPath !== 'string') {
      return { ok: false, reason: 'invalid-path' };
    }

    const stat = fs.statSync(fullPath);
    if (!stat.isFile()) {
      return { ok: false, reason: 'not-a-file' };
    }

    fs.accessSync(fullPath, fs.constants.R_OK);

    const hash = await hashFile(fullPath);
    const fileName = path.basename(fullPath);
    const id = fileIdGenerator.getId(fileName, hash);

    const entry = { path: fullPath, fileName, hash, id };

    addRecentEntry(entry);

    return { ok: true, entry };
  } catch (err) {
    console.error('[file:prepare-entry-from-path] failed', err);
    return { ok: false, reason: err.message };
  }
});

ipcMain.handle('get-recent-files', () => {
  return validateRecentEntries({ pruneMissing: true });
});

ipcMain.handle("xlsx:generate", async (_, options) => {
  if (isXlsxExporting) return { ok: false, reason: "xlsx-export-in-progress" };
  isXlsxExporting = true;

  try {
    return await exportXLSXHandler(options);
  } finally {
    isXlsxExporting = false;
  }
});

ipcMain.handle("docx:generate", async (_, options) => {
  if (isDocxExporting) return { ok: false, reason: "docx-export-in-progress" };
  isDocxExporting = true;

  try {
    return await exportDocxHandler(options);
  } finally {
    isDocxExporting = false;
  }
});

ipcMain.handle('file:save-as', async (_, { defaultName } = {}) => {
  const defaultDir =
    (app && typeof app.getPath === 'function')
      ? app.getPath('documents')
      : os.homedir();

  // UI может прислать "foo" или "foo.mdfx"
  const cleanName = stripExt(defaultName ?? 'untitled', '.mdfx');
  const suggestedPath = path.join(defaultDir, `${cleanName}.mdfx`);

  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Сохранить как',
    defaultPath: suggestedPath,
    filters: [
      { name: 'PeakExpert Files', extensions: ['mdfx'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    properties: ['showOverwriteConfirmation'],
  });

  if (canceled || !filePath) {
    return { canceled: true };
  }

  // финальная нормализация (пользователь мог изменить имя)
  const basePath = stripExt(filePath, '.mdfx');
  const finalPath = ensureSingleExt(filePath, '.mdfx');

  console.log('filePath',filePath)
  console.log('basePath',basePath)
  console.log('finalPath', finalPath)

  return {
    canceled: false,
    filePath: finalPath, // всегда .mdfx
  };
});


ipcMain.handle('fs:pick-folder', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
  });

  if (canceled || !filePaths?.[0]) {
    return { canceled: true };
  }

  const folderPath = filePaths[0];

  let writable = true;
  try {
    fs.accessSync(folderPath, fs.constants.W_OK);
  } catch {
    writable = false;
  }

  return {
    canceled: false,
    path: folderPath,                // абсолютный путь
    name: path.basename(folderPath), // имя папки
    writable,
  };
});

ipcMain.handle('fs:check-file', async (_, filePath) => {
  if (!filePath || typeof filePath !== 'string') {
    return {
      exists: false,
      readable: false,
      isFullAccess: false,
    };
  }

  try {
    const stat = fs.statSync(filePath);

    if (!stat.isFile()) {
      return {
        exists: false,
        readable: false,
        isFullAccess: false,
      };
    }

    try {
      fs.accessSync(filePath, fs.constants.R_OK);
      return {
        exists: true,
        readable: true,
        isFullAccess: true,
        size: stat.size,
        mtimeMs: stat.mtimeMs,
      };
    } catch {
      return {
        exists: true,
        readable: false,
        isFullAccess: false,
      };
    }
  } catch {
    return {
      exists: false,
      readable: false,
      isFullAccess: false,
    };
  }
});

ipcMain.handle('session:get-id', () => {
  if (sessionId == null) {
    console.warn('[Registry] session_id requested but not set');
  }
  return sessionId;
});

ipcMain.handle('html:print', async (_, { html, styles }) => {
  if (isPrinting) {
    return { ok: false, reason: 'print-in-progress' };
  }

  isPrinting = true;
  let win;
  let tempHtmlPath;

  try {
    const bundledCss = loadBundledCss();

    const fullHtml = `
      <html>
        <head>
          <meta charset="UTF-8" />
          ${bundledCss ?? ""}
          ${styles ?? ""}
          <style>
            @page { size: A4; margin: 12mm; }
            body { margin: 0; }
          </style>
        </head>
        <body>${html}</body>
      </html>
    `;

    tempHtmlPath = path.join(os.tmpdir(), `print_${Date.now()}.html`);
    fs.writeFileSync(tempHtmlPath, fullHtml, 'utf8');

    win = createServiceWindow({
      width: 794,          // A4 @ 96 DPI
      height: 1123,
      show: false,
      autoHideMenuBar: true,
      webPreferences: {
        sandbox: false,
      },
    })

    await win.loadFile(tempHtmlPath);

    // стабилизация layout
    await win.webContents.executeJavaScript(`
      new Promise(resolve => {
        if (document.readyState === "complete") resolve();
        else window.addEventListener("load", () => resolve(), { once: true });
      })
    `);

    await win.webContents.executeJavaScript("document.fonts.ready");

    await win.webContents.executeJavaScript(`
      new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
    `);

    await new Promise((resolve) => {
      win.webContents.print(
        {
          silent: false,
          printBackground: true,
          margins: {
            marginType: 'custom',
            top: 0.5,
            bottom: 0.5,
            left: 0.5,
            right: 0.5,
          },
        },
        (success, errorType) => {
          if (!success) {
            console.error('[PRINT] failed:', errorType);
          }
          resolve();
        }
      );
    });
    
    return { ok: true };
  } catch (err) {
    console.error('[PRINT] FAILED:', err);
    if (win && !win.isDestroyed()) win.destroy();
    return { ok: false, error: err.message };
  } finally {
    isPrinting = false;

    try { if (tempHtmlPath) fs.unlinkSync(tempHtmlPath); } catch {}
    try { if (win && !win.isDestroyed()) win.destroy(); } catch {}
  }
});


app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
