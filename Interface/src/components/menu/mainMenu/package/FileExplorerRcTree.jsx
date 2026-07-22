import {
  useMemo, useCallback,
} from 'react';
import Tree from 'rc-tree';
import 'rc-tree/assets/index.css';

import useClickDisambiguator from '../../../../hooks/useClickDisambiguator';

import styles from './FileTree.module.css';

function Title({
  name, kind, relPath, selectKey, onNameClick, onNameDoubleClick,
}) {
  const { onSingle, onDouble } = useClickDisambiguator(200);
  const handleSingle = () => {
    selectKey(relPath);
    onNameClick?.(relPath, kind);
  };
  const handleDouble = () => {
    if (kind !== 'file') return;

    selectKey(relPath);
    onNameDoubleClick?.(relPath, kind);
  };
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation(); // stop background clearing
        onSingle(handleSingle)(e);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation(); // prevent double click from bubbling
        onDouble(handleDouble, { stop: kind === 'file' })(e);
      }}
      style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}
    >
      <span>{name || 'root'}</span>
    </span>
  );
}

function toTreeNode(node, handlers) {
  const key = node.relPath || node.name || '/';
  const isLeaf = node.kind === 'file';
  return {
    key,
    isLeaf,
    checkable: isLeaf,
    disableCheckbox: !isLeaf, // only files checkable;
    selectable: false, // we manage selection ourselves for clean single/double behavior
    title: (
      <Title
        name={node.name}
        kind={node.kind}
        relPath={key}
        selectKey={handlers.selectKey}
        onNameClick={handlers.onNameClick} // handler B
        onNameDoubleClick={handlers.onNameDoubleClick} // handler C
      />
    ),
    children: node.children?.map((c) => toTreeNode(c, handlers)),
  };
}

function buildTreeData(tree, handlers, { rootless, rootLabel }) {
  if (!tree) return [];
  const root = toTreeNode(tree, handlers);

  if (rootless) {
    // show only children as top-level
    return root.children || [];
  }

  if (rootLabel) {
    // synthetic collapsible root (like VS Code “+ project”)
    const syntheticKey = `__root__:${rootLabel}`;
    return [{
      key: syntheticKey,
      isLeaf: false,
      selectable: false,
      disableCheckbox: true,
      title: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ opacity: 0.8 }}>📁</span>
          <span>{rootLabel}</span>
        </span>
      ),
      children: root.children || [],
    }];
  }

  // default: show actual root node
  return [root];
}

export default function FileExplorerRcTree({
  checkedKeys,
  setCheckedKeys,
  selectedKeys,
  setSelectedKeys,
  tree,
  handleMap,
  onCheckedChange,
  onNameClick,
  onNameDoubleClick,
  onBackgroundClick,
  height = 420,
  rootless = true, // hide root by default
  rootLabel, // label instead of root
  getHandle,
}) {
  const selectKey = useCallback((k) => {
    setSelectedKeys([k]);
  }, []);

  const handlers = useMemo(() => ({
    selectKey,
    onNameClick: (rel, kind) => {
      const fileData = { relPath: rel, kind, handle: getHandle(rel) };
      onNameClick?.(fileData);
    },
    onNameDoubleClick: (rel, kind) => onNameDoubleClick?.(rel, kind, getHandle(rel)),
  }), [selectKey, onNameClick, onNameDoubleClick, handleMap]);

  const data = useMemo(
    () => buildTreeData(tree, handlers, { rootless, rootLabel }),
    [tree, handlers, rootless, rootLabel],
  );

  const handleCheck = (keysArg, info) => {
    // in checkStrictly mode keysArg is { checked, halfChecked }
    const nextKeys = Array.isArray(keysArg) ? keysArg : keysArg.checked;

    // delta (the one just toggled)
    const relPath = info?.node?.key;
    const checkedNow = !!info?.checked;
    const delta = { relPath, handle: handleMap?.get?.(relPath) || null, checked: checkedNow };

    // full list
    const all = nextKeys.map((k) => ({ relPath: k, handle: handleMap?.get?.(k) || null }));

    setCheckedKeys(nextKeys);

    onCheckedChange?.(delta, all, setCheckedKeys);
  };

  return (
    <div
      style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 6 }}
      onClick={onBackgroundClick}
    >
      <Tree
        className={styles.fileTree}
        treeData={data}
        height={height}

        // Virtualization:
        /* height={height}
        itemHeight={itemHeight}
        virtual */
        // Checkboxes:
        checkable
        checkStrictly
        checkedKeys={checkedKeys}
        onCheck={handleCheck}
        // Selection highlight (we control it so dblclick doesn't trigger single):
        selectable
        selectedKeys={selectedKeys}
        onSelect={(keys) => setSelectedKeys(keys)} // still allow row-bg highlight via keyboard, etc.
        // Expand behavior:
        expandAction="doubleClick" // dbl-click folders to expand
      />
    </div>
  );
}
