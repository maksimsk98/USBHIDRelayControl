import { useEffect } from 'react';

export function logMiddleware(fn, label) {
  const name = label || fn.name || '[anonymous func]';
  console.groupCollapsed(`[logMiddleware] Calling: ${name}`);
  const result = fn();
  console.log('[logMiddleware] Result:', result);
  console.groupEnd();
  return result;
}

export const useEffLog = (obj) => {
  useEffect(() => {
    const [label, value] = Object.entries(obj)[0];
    console.log(`[${label}]`, value);
  }, [Object.values(obj)[0]]);
};

export function envAwareNotify(message, options = {}) {
  const {
    asWarning = false, // console.warn в проде вместо error
    includeStack = true, // печатать стек в проде
  } = options;

  const isDev = window.electronAPI?.getDevMode?.() === true;
  const isTesting = window.electronAPI?.getTestingMode?.() === true;

  // DEV / TEST → fail fast
  if (isDev || isTesting) {
    throw new Error(message);
  }

  // PROD → только лог
  if (asWarning) {
    console.warn(`[envAwareNotify WARNING]: ${message}`);
  } else {
    console.error(`[envAwareNotify ERROR]: ${message}`);
  }

  if (includeStack) {
    try {
      throw new Error(message);
    } catch (e) {
      console.error(e.stack);
    }
  }
}
