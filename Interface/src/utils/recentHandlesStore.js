import { openDB } from 'idb';
import { makeDirHandle } from './fsAccess';

// kv = key value

const databasePromise = openDB('fs-demo', 1, {
  upgrade(database) {
    if (!database.objectStoreNames.contains('kv')) {
      database.createObjectStore('kv');
    }
  },
});

const logDB = async (message) => {
  const db = await databasePromise;
  if (message) {
    console.log(message);
  }
  const allKeys = await db.getAllKeys('kv');
  const allValues = await db.getAll('kv');
  console.log('Current keys in IndexedDB:', allKeys);
  console.log('Current values in IndexedDB:', allValues);
};

export async function saveRootHandle(rootDirectoryHandle) {
  const db = await databasePromise;
  let storedObject;
  if (window.electronFS) {
    // Only persist the absolute path in Electron
    storedObject = { path: rootDirectoryHandle.path };
  } else {
    // Browser handle is serializable
    storedObject = rootDirectoryHandle;
  }
  await db.put('kv', storedObject, 'root');
  console.log('Root directory handle saved to IndexedDB', storedObject);
}

export async function restoreRootHandle() {
  const db = await databasePromise;
  const entry = await db.get('kv', 'root');

  if (!entry) {
    console.log('No root directory handle found in IndexedDB');
    return null;
  }

  if (window.electronFS) {
    // Reconstruct a working handle from the stored path
    const dirData = await window.electronFS.getDirectoryHandle(entry.path);
    return makeDirHandle(dirData);
  }

  const perm = await entry.queryPermission?.({ mode: 'read' });
  return perm === 'granted' ? entry : null;
}

export async function requestHandlePermission(handle, mode = 'read') {
  const perm = await handle.queryPermission?.({ mode });
  if (perm === 'granted') return true;
  const res = await handle.requestPermission?.({ mode });
  return res === 'granted';
}
