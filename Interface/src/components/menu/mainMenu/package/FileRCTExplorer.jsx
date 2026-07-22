import { useEffect, useMemo, useRef, useState } from "react";
import useClickDisambiguator from "../../../../hooks/useClickDisambiguator";
import {
  ControlledTreeEnvironment,
  InteractionMode,
  Tree,
} from 'react-complex-tree';
import { useEffLog } from "../../../../utils/debug";
import { useDebouncedFileHandlers } from "../../../../hooks/useDebouncedFileHandlers";


const FILE_EXPLORER_DEBUG = false; // toggle true/false

function withDebug(fn, label) {
  return (...args) => {
    if (FILE_EXPLORER_DEBUG) {
      console.log(`[FileExplorerRct] ${label}:`, ...args);
    }
    fn?.(...args);
  };
}

function buildRctItems(node, parentId = null, items = {}) {
  const id = node.relPath || node.name || '/';
  const isLeaf = node.kind === 'file';

  // Add this node
  items[id] = {
    index: id,
    isFolder: !isLeaf,
    children: [], // we will fill below
    data: {
      name: node.name || 'root',
      kind: node.kind,
      relPath: id,
    },
  };

  // Recurse children
  node.children?.forEach((child) => {
    const childId = child.relPath || child.name;
    items[id].children.push(childId);
    buildRctItems(child, id, items);
  });

  return items;
}

function TreeItemTitle({
  item,
  debouncedHandlers,
  checkedKeys,
  setCheckedKeys,
  handleMap,
  ...rest
}) {
  const { data } = item;
  const { relPath, kind, name } = data;
  const checked = checkedKeys.includes(relPath);

  return (
    <div
      style={{
        display: 'inline-flex',
        gap: 6,
        alignItems: 'center',
        whiteSpace: 'nowrap',       // prevent wrap
      }}
    >
      {kind === 'file' && (
        <input
          type="checkbox"
          checked={checked}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => {
            const next = checked ? checkedKeys.filter(k => k !== relPath) : [...checkedKeys, relPath];
            const delta = { relPath, handle: handleMap?.get?.(relPath) ?? null, checked: !checked };
            debouncedHandlers.debouncedCheck(
              delta,
              next.map(k => ({ relPath: k, handle: handleMap?.get?.(k) ?? null })),
              setCheckedKeys
            );
          }}
        />
      )}
      <span 
        onClick={(e) => {
          console.log('item clicked', item);
          if (kind === 'file') {
            debouncedHandlers.debouncedClick(item);
            e.stopPropagation()
          }
          // folders: do nothing, RCT handles expand/collapse
        }}
        onDoubleClick={(e) => {
          console.log('item double clicked', item);
          if (kind === 'file') {
            debouncedHandlers.debouncedDoubleClick(item);
            e.stopPropagation()
          }
          // folders: do nothing, RCT handles expand/collapse
        }}
        className="rct-tree-custom-title"
      >
        {name}
      </span>
    </div>
  );
}

export default function FileExplorerRct({
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
  rootless = true,
  rootLabel,
  getHandle,
}) {
  const [expandedItems, setExpandedItems] = useState([]);
  const [focusedItem, setFocusedItem] = useState(selectedKeys[0] || null);

  const items = useMemo(() => (tree ? buildRctItems(tree) : {}), [tree]);

  const rootId = rootless
    ? Object.values(items).find(i => i.isFolder)?.index
    : Object.keys(items)[0];

  const onItemClick = async (item) => {
    const { relPath, kind } = item.data;
    setFocusedItem(relPath);
    setSelectedKeys([relPath]);
    if (kind === 'file'){ 
        await onNameClick(relPath);
    } 
  };

  const onItemDoubleClick = async (item) => {
    const { relPath, kind } = item.data;
    setFocusedItem(relPath);
    setSelectedKeys([relPath]);
    if (kind === 'file') {
      await onNameDoubleClick(relPath, kind);
    } else {
      // toggle folder expand/collapse
      setExpandedItems(prev =>
        prev.includes(relPath)
          ? prev.filter(k => k !== relPath)
          : [...prev, relPath]
      );
    }
  };

  const debouncedHandlers = useDebouncedFileHandlers({
    onClick: onItemClick,
    onDoubleClick: onItemDoubleClick,
    onCheckedChange: async (delta, all, setKeys) => {
      setCheckedKeys(prev => {
        const relPath = delta.relPath;
        const checked = delta.checked;
        if (checked) {
          if (!prev.includes(relPath)) {
            return [...prev, relPath];
          } else {
            return prev;
          }
        } else {
          return prev.filter(k => k !== relPath);
        }
      }); 
      await onCheckedChange?.(delta, all, setKeys);
    }
  }, 200);

  const handleFocusItem = (item) => {
    setFocusedItem(item.index);
    if (item?.data?.kind === 'file') {
      debouncedHandlers.debouncedClick(item);
    }
  };

  const checkedKeysRef = useRef(checkedKeys);
  useEffect(() => {
      checkedKeysRef.current = checkedKeys; // keep ref updated
  }, [checkedKeys]);

  const handlePrimaryAction = async (item, ...args) => {
    const { relPath, kind } = item.data;

    if (kind !== 'file') {
        // folders just expand/collapse
        setExpandedItems(prev =>
        prev.includes(relPath)
            ? prev.filter(k => k !== relPath)
            : [...prev, relPath]
        );
        return;
    }

    const prevChecked = checkedKeysRef.current;
    const checked = !prevChecked.includes(relPath);

    const delta = {
        relPath,
        handle: handleMap?.get?.(relPath) ?? null,
        checked,
    };

    // call your async handler safely
    const all = checked
        ? [...prevChecked, relPath]
        : prevChecked.filter(k => k !== relPath);
    
    debouncedHandlers.debouncedCheck(
      delta,
      all.map(k => ({ relPath: k, handle: handleMap?.get?.(k) ?? null })),
      setCheckedKeys
    );
  };

  const treeRef = useRef(null);

  useEffect(() => {
    console.log(treeRef.current.focusTree());
  }, []);

  return (
    <div
      style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 6,
        overflowY: 'auto', overflowX: 'auto', width: '100%', height: '100%'
       }}
      onClick={(e) => {onBackgroundClick(e); treeRef.current.focusTree();} }
    >
      <ControlledTreeEnvironment
        interactionMode={InteractionMode.ClickItemToExpand}
        items={items}
        getItemTitle={item => {
            return item.data.name
        }}
        viewState={{
          tree: {
            focusedItem,
            expandedItems,
          }
        }}
        onFocusItem={withDebug(handleFocusItem, 'onFocusItem')}
        onPrimaryAction={withDebug(handlePrimaryAction, 'onPrimaryAction')}
        onExpandItem={({ index }) => setExpandedItems(prev => [...prev, index])}
        onCollapseItem={({ index }) =>
          setExpandedItems(prev => prev.filter(i => i !== index))
        }

        canSearchByStartingTyping={false}
        keyboardBindings={{
          startSearch: ['Control+f', 'Control+а'],
        }}
        
        canRename={false}
      >
        <Tree
          ref={treeRef}
          treeId="tree"
          rootItem={rootId}
          treeLabel="Files"
          
          renderItemTitle={(props) => (
            <TreeItemTitle
              {...props}
              checkedKeys={checkedKeys}
              setCheckedKeys={setCheckedKeys}
              handleMap={handleMap}
              debouncedHandlers={debouncedHandlers}
              toggleExpand={(relPath) =>
                setExpandedItems(prev =>
                  prev.includes(relPath)
                    ? prev.filter(k => k !== relPath)
                    : [...prev, relPath]
                )
              }
            />
          )}
        />
      </ControlledTreeEnvironment>
    </div>
  );
}

