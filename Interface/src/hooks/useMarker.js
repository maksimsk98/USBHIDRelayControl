import { useEffect, useRef } from 'react';

function replaceShapesByType(prevShapes, type, newShapes) {
  return [
    ...(prevShapes ?? []).filter((shape) => shape?.customData?.type !== type),
    ...newShapes,
  ];
}

export function useMarker({
  plotlyObj,
  setLayout,
  plotData,
  shapeDefs = [],
  shapeTypes = ['marker'],
  moveMarkerHandler,
  config = {
    mode: 'slidingWindow', // "borders" | "slidingWindow" | "capture"
    minGap: 0.01,
    slidingWindowWidth: 60,
    squishableInterval: false,
  },
  isActive = false,
  layout,
  convertersRef,
}) {
  const configRef = useRef(config); // so attached handler have fresh data without reattaching

  useEffect(() => { // turn of plotly drag to use ours
    const isCapture = config.mode === 'capture';
    setLayout((prev) => ({
      ...prev,
      dragmode: isCapture ? false : 'zoom',
    }));
  }, [config.mode, setLayout]);

  useEffect(() => {
    if (!isActive || !plotlyObj?.el || config.mode !== 'capture') return; // we use straight config because this and config setting effect run together and ref is stale, puls it is only needed for event listeners

    const dragLayer = plotlyObj.el.querySelector('.nsewdrag');
    if (!dragLayer) return console.warn('no dragLayer');

    const svgLayer = dragLayer.closest('svg');

    let draglayerBox = null;
    let svgLayerBox = null;

    let isDragging = false;
    let dragStartX = null;
    let dragRect = null;

    const handleMouseDown = (e) => {
      isDragging = true;
      draglayerBox = dragLayer.getBoundingClientRect();
      svgLayerBox = svgLayer.getBoundingClientRect();

      dragStartX = e.clientX - svgLayerBox.left;

      dragRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      dragRect.setAttribute('y', 0 + (draglayerBox.top - svgLayerBox.top));
      dragRect.setAttribute('height', draglayerBox.height);
      dragRect.setAttribute('fill', 'rgba(0, 123, 255, 0.3)');
      dragRect.setAttribute('stroke', 'blue');
      dragRect.setAttribute('stroke-width', '1');

      svgLayer.appendChild(dragRect);
    };

    const handleMouseMove = (e) => {
      if (!isDragging || !dragRect) return;
      const currentX = e.clientX - svgLayerBox.left;
      const x = Math.min(dragStartX, currentX);
      const width = Math.abs(currentX - dragStartX);

      dragRect.setAttribute('x', x);
      dragRect.setAttribute('width', width);
    };

    const handleMouseUp = (e) => {
      if (!isDragging) return;
      isDragging = false;

      const endX = e.clientX - svgLayerBox.left;
      const left = Math.min(dragStartX, endX);
      const right = Math.max(dragStartX, endX);

      const converters = convertersRef.current;
      if (!converters) return;

      const leftCoord = converters.pixelToX(converters.xSVGToPixel(left));
      let rightCoord = converters.pixelToX(converters.xSVGToPixel(right));

      if (Math.abs(rightCoord - leftCoord) < 1) rightCoord = leftCoord + config.minGap;

      const clampRange = getClampRange(plotData);
      const leftClamped = Math.max(leftCoord, clampRange.left);
      const rightClamped = Math.min(rightCoord, clampRange.right);

      moveMarkerHandler({
        shapeIndex: 0,
        newX: leftClamped,
        pairedIndex: 1,
        pairedX: rightClamped,
      });

      svgLayer.removeChild(dragRect);
      dragRect = null;
    };

    svgLayer.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp); // so user can mouseUp everywhere
    return () => {
      svgLayer.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [plotlyObj, isActive, config.mode]);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const pathElems = useRef([]);
  const clampRange = getClampRange(plotData);
  const hasClamp = clampRange.left !== null && clampRange.right !== null;

  useEffect(() => {
    if (!isActive) return;

    const shouldRender = plotData?.x?.length && shapeDefs.length;
    if (!shouldRender) return;

    const markerShapes = shapeDefs.map((def, index) => ({
      type: 'line',
      x0: def.x,
      x1: def.x,
      yref: 'paper',
      y0: 1,
      y1: 0,
      line: {
        color: def.color ?? 'red',
        width: def.width ?? 2,
      },
      layer: 'above',
      customData: {
        ...def.customData,
        marker: index === 0 ? 'left' : 'right',
      },
    }));

    setLayout((prev) => ({
      ...prev,
      shapes: replaceShapesByType(prev.shapes, 'marker', markerShapes),
    }));
  }, [isActive, shapeDefs, plotData?.x?.length]);

  useEffect(() => {
    if (!isActive || !plotlyObj || !hasClamp
      || config.mode === 'capture') return;

    const observer = new MutationObserver((mutations) => {
      pathElems.current = []; // Reset before processing
      let pathIndex = 0;

      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          const pathElem = node.tagName === 'path'
            ? node
            : node.querySelector('path');

          if (pathElem) {
            processPath(pathElem, plotlyObj, pathIndex);
            pathIndex += 1;
          }
        }
      }
    });

    const layers = plotlyObj.el.querySelectorAll('.layer-below > g, .layer-above > g, .layer-subplot > g');
    if (!layers.length) return;

    layers.forEach((layer) => observer.observe(layer, { childList: true }));

    return () => {
      observer.disconnect();
      pathElems.current = []; // Reset on cleanup too
    };
  }, [isActive, layout.shapes, plotlyObj, shapeDefs, shapeTypes.join(','), clampRange.left, clampRange.right, config.mode]);

  const removePath = (target) => {
    pathElems.current = pathElems.current.filter(([elem]) => elem !== target);
  };

  function processPath(pathElem, plotlyObj, layoutIndex) {
    const shape = layout?.shapes?.[layoutIndex];
    if (!shape) return;
    const type = shape.customData?.type;

    if (!shapeTypes.includes(type)) return;
    const markerIndex = pathElems.current.length;

    pathElem.classList.add('marker-path');
    pathElem.style.cursor = 'ew-resize';
    pathElem.setAttribute('pointer-events', 'stroke');

    attachDragHandler(pathElem, markerIndex);

    pathElems.current.push([pathElem, markerIndex]);
  }

  function attachDragHandler(pathElem, shapeIndex) {
    const converters = convertersRef.current;
    if (!converters) return;

    pathElem.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const originalX = shapeDefs[shapeIndex].x;
      const x0 = shapeDefs[0].x;
      const x1 = shapeDefs[1].x;

      const markerType = shapeIndex === 0
        ? (x0 <= x1 ? 'left' : 'right')
        : (x1 < x0 ? 'left' : 'right');
      const pairedIndex = shapeIndex === 0 ? 1 : 0;
      const pairedX = shapeDefs[pairedIndex]?.x;
      let latestX = originalX;
      let latestPairedX = pairedX;

      const pairedElem = pathElems.current[pairedIndex]?.[0];

      const onMouseMove = (moveEvt) => {
        const newSVGX = converters.xPixelToSVG(moveEvt.clientX);
        const newX = converters.pixelToX(converters.xSVGToPixel(newSVGX));

        const currentConfig = configRef.current;

        if (currentConfig.mode === 'slidingWindow') {
          const windowWidth = currentConfig.slidingWindowWidth ?? 0.5;
          const minSquish = currentConfig.minGap;

          let clampedX;
          let paired;
          if (markerType === 'left') {
            clampedX = currentConfig.squishableInterval
              ? Math.min(newX, clampRange.right - minSquish)
              : Math.min(newX, clampRange.right - windowWidth); // don't let left go too far right

            clampedX = Math.max(clampedX, clampRange.left); // don't let left go past start
            paired = Math.min(clampedX + windowWidth, clampRange.right); // clamp right to plot max
          } else {
            clampedX = currentConfig.squishableInterval
              ? Math.max(newX, clampRange.left + minSquish)
              : Math.max(newX, clampRange.left + windowWidth); // don't let right go too far left
            clampedX = Math.min(clampedX, clampRange.right); // don't let right go past end
            paired = Math.max(clampedX - windowWidth, clampRange.left); // clamp left to plot min
          }

          if (paired < clampRange.left || paired > clampRange.right) return;

          latestX = clampedX;
          latestPairedX = paired;

          updatePath(pathElem, latestX, converters);

          if (pairedElem) updatePath(pairedElem, latestPairedX, converters);
        } else {
          const { clampedX, clampedPairedX } = applyCollisionRules(newX, latestPairedX, shapeIndex, currentConfig.minGap, clampRange);
          latestX = clampedX;
          latestPairedX = clampedPairedX;
          updatePath(pathElem, latestX, converters);
          if (clampedPairedX) updatePath(pairedElem, latestPairedX, converters);
        }
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        const updatedDefs = shapeDefs.map((def, i) => {
          if (i === shapeIndex) return { ...def, x: latestX };
          if (i === pairedIndex && latestPairedX != null) return { ...def, x: latestPairedX };
          return def;
        });

        const newMarkers = updatedDefs.map((def, i) => ({
          type: 'line',
          x0: def.x,
          x1: def.x,
          yref: 'paper',
          y0: 1,
          y1: 0,
          line: {
            color: def.color ?? 'red',
            width: def.width ?? 2,
          },
          layer: 'above',
          customData: {
            ...def.customData,
            marker: i === 0 ? 'left' : 'right',
          },
        }));

        setLayout((prev) => ({
          ...prev,
          shapes: replaceShapesByType(prev.shapes, 'marker', newMarkers),
        }));

        moveMarkerHandler?.({
          shapeIndex,
          newX: latestX,
          pairedIndex,
          pairedX: latestPairedX,
        });
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  function applyCollisionRules(latestX, latestPairedX, shapeIndex, minGap, clampRange) {
    let preRight; let newRightBorderX; let preLeft; let
      newLeftBorderX;
    if (shapeIndex === 0) {
      if (latestX < latestPairedX) return { clampedX: latestX, clampedPairedX: latestPairedX };
      preRight = latestX + minGap;
      newRightBorderX = preRight < clampRange.right ? preRight : clampRange.right;
      preLeft = newRightBorderX - minGap;
      newLeftBorderX = preLeft < clampRange.left ? clampRange.left : preLeft;
    } else {
      if (latestX > latestPairedX) return { clampedX: latestX, clampedPairedX: latestPairedX };
      preLeft = latestX - minGap;
      newLeftBorderX = preLeft < clampRange.left ? clampRange.left : preLeft;
      preRight = newLeftBorderX + minGap;
      newRightBorderX = preRight < clampRange.right ? preRight : clampRange.right;
    }
    return { clampedX: newLeftBorderX, clampedPairedX: newRightBorderX };
  }

  function updatePath(elem, newX, converters) {
    const svgX = converters.xPixelToSVG(converters.xToPixel(newX));
    const d = elem.getAttribute('d');
    const y0 = d.match(/M[\d.]+,([\d.]+)L/)[1];
    const y1 = d.match(/L[\d.]+,([\d.]+)/)[1];
    elem.setAttribute('d', `M${svgX},${y0}L${svgX},${y1}`);
  }

  function getClampRange(plotData) {
    if (!plotData?.x?.length) return { left: null, right: null };
    return {
      left: plotData.x[0],
      right: plotData.x.at(-1),
    };
  }
}
