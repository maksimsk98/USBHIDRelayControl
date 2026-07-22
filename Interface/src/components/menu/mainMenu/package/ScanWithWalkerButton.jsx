import { Button } from 'react-bootstrap';
import { pickRoot, walkMatchingFiles } from '../../../../utils/fsAccess';
import { VALID_EXTENSIONS } from '../../../../constants/constants';

// Insert a file path into a tree { name, kind, relPath, children[] }
function insertFileIntoTree(root, relPath) {
  const parts = relPath.split(/[\\/]/);
  let node = root;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const isLast = i === parts.length - 1;

    if (isLast) {
      node.children.push({
        name: part,
        kind: 'file',
        relPath,
      });
    } else {
      const dirRel = parts.slice(0, i + 1).join('/');
      let next = node.children.find(
        (c) => c.kind === 'directory' && c.name === part,
      );
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

function sortTreeInPlace(node) {
  if (!node.children) return;
  node.children.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1; // dirs first
    return a.name.localeCompare(b.name, undefined, {
      numeric: true, // "file2" < "file10"
      sensitivity: 'base', // case/accents insensitive
    });
  });
  for (const child of node.children) sortTreeInPlace(child);
}

export default function ScanWithWalkerButton({
  label = 'Select folder and log tree',
  extensions = VALID_EXTENSIONS, // pass [] or null to include all
  variant = 'primary',
}) {
  const handleClick = async () => {
    try {
      // pick root via user gesture
      const rootHandle = await pickRoot();

      // build tree from async generator (only matching files)
      const tree = {
        name: '', kind: 'directory', relPath: '', children: [],
      };

      for await (const { relPath /* , name, handle */ } of walkMatchingFiles(
        rootHandle,
        extensions,
        '',
      )) {
        insertFileIntoTree(tree, relPath);
      }

      // 3) sort and log a serializable version
      sortTreeInPlace(tree);
      console.log('Tree object:', tree);
      console.log('Tree JSON:\n', JSON.stringify(tree, null, 2));
    } catch (e) {
      if (e && e.name === 'AbortError') return; // user canceled
      console.error('Scan failed:', e);
    }
  };

  return (
    <Button variant={variant} onClick={handleClick}>
      {label}
    </Button>
  );
}
