import { saveRootHandle } from './recentHandlesStore';

const isElectron = !!window.electronFS;

function attachElectronMethods(entry) {
  if (entry.kind !== 'file') return entry;

  return {
    ...entry,
    async getFile() {
      const { arrayBuffer, meta } = await window.electronFS.getFile(entry.path);
      return new File([arrayBuffer], meta.name, {
        type: meta.type,
        lastModified: meta.lastModified,
      });
    },
    async write(content) {
      await window.electronFS.writeFile(entry.path, content);
    },
  };
}

export function makeDirHandle(dirData) {
  return {
    ...dirData,
    async* entries() {
      for (const entry of dirData.entries) {
        if (entry.kind === 'directory') {
          const subDir = await window.electronFS.getDirectoryHandle(entry.path);
          yield [entry.name, makeDirHandle(subDir)];
        } else {
          yield [entry.name, attachElectronMethods(entry)];
        }
      }
    },
  };
}

export async function pickRoot() {
  if (isElectron) {
    // Electron path-based bridge
    const dirPath = await window.electronFS.pickRoot();
    if (!dirPath) return null;

    // Persist the raw path to IndexedDB for restore
    await saveRootHandle({ path: dirPath });
    // Build the virtual directory handle
    const raw = await window.electronFS.getDirectoryHandle(dirPath);
    return makeDirHandle(raw);
  }

  // Must be called from a user gesture (e.g., click handler)
  const directoryHandle = await window.showDirectoryPicker();
  await saveRootHandle(directoryHandle);
  return directoryHandle;
}

function hasAllowedExtension(fileName, allowedExts) {
  const lower = fileName.toLowerCase();
  return allowedExts.some((ext) => lower.endsWith(ext.startsWith('.') ? ext : `.${ext}`));
}

export async function collectMatchingFiles(directoryHandle, allowedExts, baseRelPath = '') {
  const results = [];
  async function walk(dirHandle, relBase) {
    for await (const [entryName, entryHandle] of dirHandle.entries()) {
      const relPath = relBase ? `${relBase}/${entryName}` : entryName;
      if (entryHandle.kind === 'directory') {
        await walk(entryHandle, relPath);
      } else if (hasAllowedExtension(entryName, allowedExts)) {
        const handle = entryHandle;
        results.push({ name: entryName, relPath, handle });
      }
    }
  }
  await walk(directoryHandle, baseRelPath);
  return results;
}

export async function listDir(directoryHandle, baseRelativePath = '') {
  const entries = [];
  for await (const [entryName, entryHandle] of directoryHandle.entries()) {
    const relativePath = baseRelativePath ? `${baseRelativePath}/${entryName}` : entryName;
    entries.push({
      name: entryName, relPath: relativePath, kind: entryHandle.kind, handle: entryHandle,
    });
  }
  return entries.sort(
    (left, right) => Number(left.kind === 'directory') - Number(right.kind === 'directory')
      || left.name.localeCompare(right.name),
  );
}

export async function getRelPath(rootDirHandle, fileHandle) {
  if (typeof rootDirHandle.resolve === 'function') {
    const parts = await rootDirHandle.resolve(fileHandle);
    return parts ? parts.join('/') : fileHandle.name;
  }

  // Electron fallback: compute manually if .path fields exist
  if (rootDirHandle.path && fileHandle.path) {
    const rootPath = rootDirHandle.path.replace(/\\/g, '/');
    const filePath = fileHandle.path.replace(/\\/g, '/');
    return filePath.startsWith(rootPath)
      ? filePath.slice(rootPath.length + 1)
      : fileHandle.name;
  }

  return fileHandle.name;
}

export function trimSuffix(name, suffix = '.mdfx') {
  if (name == null) return name;
  return name.endsWith(suffix)
    ? name.slice(0, -suffix.length)
    : name;
}
