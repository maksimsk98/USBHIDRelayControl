const path = require('path');
const fs = require('fs');
const os = require('os');
const { BrowserWindow } = require('electron');

const serviceWindows = new Set();

function pad2(n) {
  return String(n).padStart(2, "0");
}

function normalizeTrailingExt(pathOrName, ext) {
  if (!ext.startsWith('.')) {
    throw new Error(`Extension must start with dot: "${ext}"`);
  }

  // escape dot and other regex chars just in case
  const escaped = ext.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})+$`, 'i');

  return pathOrName.replace(regex, '');
}

function ensureSingleExt(pathOrName, ext) {
  return `${normalizeTrailingExt(pathOrName, ext)}${ext}`;
}

function stripExt(pathOrName, ext) {
  return normalizeTrailingExt(pathOrName, ext);
}

/**
 * YYYY-MM-DD_HH-mm-ss  (локальное время машины)
 * Пример: 2025-12-15_11-03-27
 */
function getTimeSuffix(date = new Date()) {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());

  const hh = pad2(date.getHours());
  const mm = pad2(date.getMinutes());
  const ss = pad2(date.getSeconds());

  return `${y}-${m}-${d}_${hh}-${mm}-${ss}`;
}

/**
 * (опционально) чтобы корректно добавлять суффикс перед расширением
 */
function withTimeSuffix(filePath, suffix = getTimeSuffix()) {
  const ext = path.extname(filePath);
  const base = filePath.slice(0, -ext.length);
  return `${base}_${suffix}${ext}`;
}

/**
 * Create a BrowserWindow for ephemeral/service tasks (print, preview, etc.)
 * Automatically registers it in serviceWindows and cleans up on close.
 *
 * @param {Electron.BrowserWindowConstructorOptions} options - BrowserWindow options
 * @param {(win: BrowserWindow) => void} [onReady] - Optional callback when window is ready
 * @returns {BrowserWindow}
 */
function createServiceWindow(options) {
  const win = new BrowserWindow({
    show: false,
    autoHideMenuBar: true,
    ...options,
  });

  // Track in global set
  serviceWindows.add(win);

  // Clean up on close
  win.on('closed', () => {
    serviceWindows.delete(win);
  });

  return win;
}

/**
 * Kill all ephemeral/service windows.
 */
function killAllServiceWindows() {
  for (const win of serviceWindows) {
    try {
      win.destroy();
    } catch (err) {
      console.warn('Error destroying service window:', err);
    }
  }
  serviceWindows.clear();
}

function loadBundledCss() {
  try {
    const cssDir = path.join(__dirname, "..", "build", "static", "css");

    console.log(`Loading css from css dir ${cssDir}`)
    const cssFiles = fs.readdirSync(cssDir).filter(f => f.endsWith(".css"));

    if (!cssFiles.length) {
      console.warn("No CSS files found in", cssDir);
      return "";
    }

    let collected = "";
    for (const file of cssFiles) {
      const filePath = path.join(cssDir, file);
      const content = fs.readFileSync(filePath, "utf8");
      collected += content;
    }

    return `<style>${collected}</style>`;
  } catch (err) {
    console.error("Bootstrap load failed:", err);
    return "";
  }
}

function waitForWindowClosed(win) {
  return new Promise((resolve) => {
    if (win.isDestroyed()) {
      resolve();
      return;
    }

    win.once("closed", () => {
      resolve();
    });
  });
}


module.exports = {
    getTimeSuffix,
    withTimeSuffix,
    ensureSingleExt,
    stripExt,
    createServiceWindow,
    killAllServiceWindows,
    loadBundledCss,
    waitForWindowClosed,
};