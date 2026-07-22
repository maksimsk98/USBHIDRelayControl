import { useEffect, useRef, useState } from 'react';

const useContextMenus = ({
  plotElem,
  convertersRef,
  getNewSelectedPeak,
  selectedPeakNum,
  enablePeakContext = false,
}) => {
  const [menuAnchorPoint, setMenuAnchorPoint] = useState({ x: 0, y: 0 });
  const [openMenu, setOpenMenu] = useState(null);

  const peakContextRef = useRef(null);
  const plotContextRef = useRef(null);

  useEffect(() => {
    if (!plotElem) return;

    const observer = new MutationObserver(() => {
      const dragLayer = plotElem.querySelector('.nsewdrag');
      if (!dragLayer) return;

      const handleMouseDown = (event) => {
        if (event.button === 2) {
          event.preventDefault();
          event.stopPropagation();
        }
      };

      const handleMouseUp = (event) => {
        if (event.button === 2) {
          event.preventDefault();
          event.stopPropagation();

          const x = event.clientX;
          const y = event.clientY;

          let clickedXCoord; let clickedYCoord; let
            clickedPeak;

          if (enablePeakContext) {
            const { pixelToX, pixelToY } = convertersRef.current;

            clickedXCoord = pixelToX(x);
            clickedYCoord = pixelToY(y);
            clickedPeak = getNewSelectedPeak(clickedXCoord);
          }

          setMenuAnchorPoint({
            x: event.pageX,
            y: event.pageY,
            ...(clickedXCoord != null && { xCoord: clickedXCoord }),
            ...(clickedYCoord != null && { yCoord: clickedYCoord }),
          });

          if (enablePeakContext && typeof clickedPeak === 'number' && clickedPeak === selectedPeakNum) {
            setOpenMenu('peak');
            return;
          }

          setOpenMenu('plot');
        }
      };

      dragLayer.addEventListener('mousedown', handleMouseDown, true);
      dragLayer.addEventListener('mouseup', handleMouseUp, true);

      observer.disconnect(); // stop once attached

      return () => {
        dragLayer.removeEventListener('mousedown', handleMouseDown, true);
        dragLayer.removeEventListener('mouseup', handleMouseUp, true);
      };
    });

    observer.observe(plotElem, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [plotElem, getNewSelectedPeak, selectedPeakNum, enablePeakContext]);

  // this will allow to attach listener below once
  const openMenuRef = useRef(null);
  useEffect(() => { openMenuRef.current = openMenu; }, [openMenu]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const currentMenu = openMenuRef.current;
      if (
        currentMenu === 'peak'
        && peakContextRef.current
        && !peakContextRef.current.contains(event.target)
      ) {
        setOpenMenu(null);
      }
      if (
        currentMenu === 'plot'
        && plotContextRef.current
        && !plotContextRef.current.contains(event.target)
      ) {
        setOpenMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, []); // empty deps, attaches once

  return {
    setOpenMenu,
    openMenu,
    menuAnchorPoint,
    peakContextRef,
    plotContextRef,
  };
};

export default useContextMenus;
