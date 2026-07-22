import { useCallback, useEffect, useMemo, useRef } from 'react';
import ElectronAPIManager from '../utils/classes/ElectronAPIManager';

export default function useElectronAPI() {
  // Get the singleton instance (stable across renders)
  const manager = useMemo(() => ElectronAPIManager.getInstance(), []);
  
  // Memoize the isElectron value
  const isElectron = useMemo(
    () => typeof window !== 'undefined' && !!window.electronAPI,
    []
  );
  
  // Memoize the hasMock value
  const hasMock = useMemo(
    () => typeof window !== 'undefined' && window.__TEST_ELECTRON_API,
    []
  );
  
  // Stable getElectronAPI function
  const getElectronAPI = useCallback(() => {
    return manager.getAPI();
  }, [manager]);
  
  // Optional: Initialize API on mount if needed
  useEffect(() => {
    // Optional: Pre-initialize API if you want it ready immediately
    manager.initialize();
  }, [manager]);
  
  return {
    isElectron,
    getElectronAPI,
    hasMock,
    // Optional: expose additional utilities
    isAPIInitialized: manager.isInitialized(),
    initializeAPI: () => manager.initialize()
  };
}