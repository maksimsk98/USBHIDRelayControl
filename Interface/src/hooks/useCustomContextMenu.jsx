import {
  useState, useCallback, useRef, useMemo,
} from 'react';
import JsonMenu from '../components/custom/CustomContextMenu';
import { useClickOutside } from './useClickOutside';

/**
 * Declarative full-featured context menu hook.
 *
 * @param {{
 *   schema: Array,
 *   closeOnOutsideClick?: boolean
 * }} [options]
 */
export function useContextMenu({ schema = [], closeOnOutsideClick = true } = {}) {
  const [menuState, setMenuState] = useState({
    isOpen: false,
    anchorPoint: { x: 0, y: 0 },
  });

  const [context, setContext] = useState(null);

  const menuRef = useRef(null);
  const isOpenRef = useRef(false);

  const onContextMenu = useCallback((e, metadata = null) => {
    e.preventDefault();

    setContext(metadata);

    setMenuState({
      isOpen: true,
      anchorPoint: { x: e.clientX, y: e.clientY },
    });
    isOpenRef.current = true;
  }, []);

  const onClose = useCallback(() => {
    setMenuState((prev) => ({ ...prev, isOpen: false }));
    isOpenRef.current = false;
  }, []);

  useClickOutside({
    isActiveRef: isOpenRef,
    ignoreRefs: [menuRef],
    onOutsideClick: onClose,
    enabled: closeOnOutsideClick,
  });

  const ContextMenu = useMemo(() => (
    <JsonMenu
      ref={menuRef}
      menuSchema={schema}
      menuState={menuState}
      onClose={onClose}
      context={context}
    />
  ), [schema, menuState, onClose]);

  return {
    // Main interaction handlers
    onContextMenu,
    onClose,

    // Renderable menu component
    ContextMenu,

    // Internal state and ref for advanced use
    menuState,
    menuRef,
    isOpenRef,
  };
}
