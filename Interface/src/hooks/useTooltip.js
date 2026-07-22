import {
  useRef, useState, useCallback,
} from 'react';
import { Overlay, Tooltip } from 'react-bootstrap';

export const useCellTooltip = ({ timeout = 3000, placement = 'top' } = {}) => {
  const refs = useRef({}); // { [row]: { [field]: DOMElement } }
  const [visibleMap, setVisibleMap] = useState({}); // { [row]: { [field]: message } }

  const handleRefChange = useCallback((el, row, field) => {
    if (!refs.current[row]) refs.current[row] = {};
    if (el) {
      refs.current[row][field] = el;
    } else {
      delete refs.current[row][field];
      if (Object.keys(refs.current[row]).length === 0) {
        delete refs.current[row];
      }
    }
  }, []);

  const showTooltip = useCallback((row, field, message) => {
    setVisibleMap((prev) => ({
      ...prev,
      [row]: {
        ...(prev[row] || {}),
        [field]: message,
      },
    }));

    setTimeout(() => {
      setVisibleMap((prev) => {
        const updated = { ...prev };
        if (updated[row]) {
          delete updated[row][field];
          if (Object.keys(updated[row]).length === 0) {
            delete updated[row];
          }
        }
        return updated;
      });
    }, timeout);
  }, [timeout]);

  const TooltipRenderer = Object.entries(visibleMap).flatMap(([row, fields]) => Object.entries(fields).map(([field, message]) => {
    const target = refs.current[row]?.[field];
    if (!target) return null;
    return (
      <Overlay key={`${row}-${field}`} target={target} show placement={placement}>
        <Tooltip>{message}</Tooltip>
      </Overlay>
    );
  }));

  return {
    handleRefChange,
    showTooltip,
    TooltipRenderer,
  };
};
