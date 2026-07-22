import { useEffect, useState } from 'react';
import { VALID_EXTENSIONS } from '../constants/constants';
import { collectMatchingFiles } from '../utils/fsAccess';

function insertFileIntoTree(root, relPath) {
  const parts = relPath.split(/[\\/]/);
  let node = root;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const isLast = i === parts.length - 1;
    if (isLast) {
      node.children.push({ name: part, kind: 'file', relPath });
    } else {
      const dirRel = parts.slice(0, i + 1).join('/');
      let next = node.children.find((c) => c.kind === 'directory' && c.name === part);
      if (!next) {
        next = {
          name: part, kind: 'directory', relPath: dirRel, children: [],
        };
        node.children.push(next);
      }
      node = next;
    }
  }
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
function sortTreeInPlace(node) {
  if (!node.children) return;
  node.children.sort((a, b) => (a.kind !== b.kind
    ? (a.kind === 'directory' ? -1 : 1)
    : collator.compare(a.name, b.name)));
  for (const child of node.children) sortTreeInPlace(child);
}

export function useTreeFromHandle(rootHandle, extensions = VALID_EXTENSIONS) {
  const [tree, setTree] = useState(null);
  const [handleMap, setHandleMap] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | building | ready | error
  const [error, setError] = useState(null);

  const getHandle = (rel) => handleMap?.get?.(rel) ?? null;

  useEffect(() => {
    let cancelled = false;

    if (!rootHandle) {
      setTree(null);
      setHandleMap(null);
      setStatus('idle');
      setError(null);
      return () => { cancelled = true; };
    }

    (async () => {
      try {
        setStatus('building');
        const t = {
          name: '', kind: 'directory', relPath: '', children: [],
        };
        const map = new Map(); // built locally, set once at the end

        const files = await collectMatchingFiles(rootHandle, extensions, '');
        for (const { relPath, handle } of files) {
          insertFileIntoTree(t, relPath);
          map.set(relPath, handle);
        }
        sortTreeInPlace(t);
        if (!cancelled) { setTree(t); setStatus('ready'); setHandleMap(map); }
      } catch (e) {
        console.error('Error building tree from handle:', e);
        if (!cancelled) { setError(e); setStatus('error'); }
      }
    })();

    return () => { cancelled = true; };
  }, [rootHandle, extensions]);

  return {
    tree, handleMap, status, error, getHandle,
  };
}
