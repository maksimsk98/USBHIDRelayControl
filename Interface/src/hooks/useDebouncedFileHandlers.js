import { useRef, useCallback } from 'react';

const FILE_EXPLORER_DEBUG = true; // toggle per file

function logDebug(...args) {
  if (FILE_EXPLORER_DEBUG) console.log(...args);
}

/**
 * Debounced handlers for tree actions, all tracked in-flight with queueing.
 */
export function useDebouncedFileHandlers(handlers, delay = 150) {
  const timeoutRef = useRef(null);
  const lastArgsRef = useRef(null);

  const inFlightRef = useRef(false);      // tracks if any handler is running
  const queuedRef = useRef(null);         // store the next action to run

  const clearPending = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      lastArgsRef.current = null;
    }
  };

  const runHandler = async (type, ...args) => {
    if (inFlightRef.current) {
      logDebug(`[Queue] ${type} queued for`, type === 'check' ? args[0]?.relPath : args[0]?.data?.relPath);
      queuedRef.current = { type, args };
      return;
    }

    inFlightRef.current = true;
    logDebug(`[Start] ${type} handler for`, type === 'check' ? args[0]?.relPath : args[0]?.data?.relPath);

    try {
      if (type === 'single') {
        await handlers.onClick?.(...args);
      } else if (type === 'double') {
        await handlers.onDoubleClick?.(...args);
      } else if (type === 'check' || type === 'primary') {
        await handlers.onCheckedChange?.(...args);
      }
      logDebug(`[Done] ${type} handler for`, type === 'check' ? args[0]?.relPath : args[0]?.data?.relPath);
    } catch (err) {
      logDebug(`[Error] ${type} handler`, err);
    } finally {
      inFlightRef.current = false;
      if (queuedRef.current) {
        const { type: qType, args: qArgs } = queuedRef.current;
        queuedRef.current = null;
        runHandler(qType, ...qArgs);
      }
    }
  };

  const schedule = useCallback((type, ...args) => {
    if (type === 'double' || type === 'check' || type === 'primary') {
      clearPending();
      runHandler(type, ...args);
      return;
    }

    // Single click debounce
    lastArgsRef.current = args;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      runHandler('single', ...lastArgsRef.current);
      timeoutRef.current = null;
      lastArgsRef.current = null;
    }, delay);
  }, [delay, handlers]);

  return {
    debouncedClick: (item) => schedule('single', item),
    debouncedDoubleClick: (item) => schedule('double', item),
    debouncedCheck: (delta, all, setCheckedKeys) => schedule('check', delta, all, setCheckedKeys),
    debouncedPrimary: (item, ...args) => schedule('primary', item, ...args),
    cancelPending: clearPending,
  };
}
