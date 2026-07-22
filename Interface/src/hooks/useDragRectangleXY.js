import { useEffect, useCallback } from 'react';

export const useDragRectangleXY = ({
  isActive,
  layout,
  setLayout,
  svgLayer,
  convertersRef,
  minWidth = 1,
  minHeight = 1,
  onDragEnd, // ({ left, right, top, bottom }) => void
  onClick,
}) => {
  const getCoords = useCallback((svgX1, svgY1, svgX2, svgY2) => {
    const converters = convertersRef.current;
    const pixelX1 = converters.xSVGToPixel(svgX1);
    const pixelX2 = converters.xSVGToPixel(svgX2);
    const pixelY1 = converters.ySVGToPixel(svgY1);
    const pixelY2 = converters.ySVGToPixel(svgY2);

    return {
      left: converters.pixelToX(Math.min(pixelX1, pixelX2)),
      right: converters.pixelToX(Math.max(pixelX1, pixelX2)),
      top: converters.pixelToY(Math.min(pixelY1, pixelY2)),
      bottom: converters.pixelToY(Math.max(pixelY1, pixelY2)),
    };
  }, [convertersRef]);

  useEffect(() => { // turn of plotly drag to use ours
    setLayout((prev) => ({
      ...prev,
      dragmode: isActive ? false : 'zoom',
    }));
  }, [isActive, setLayout]);

  useEffect(() => {
    if (!isActive || !svgLayer || !convertersRef.current) return;

    let isDragging = false;
    let dragStartX = null;
    let dragStartY = null;
    let dragRect = null;

    const svgBox = svgLayer.getBoundingClientRect();

    const onMouseDown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      isDragging = true;
      dragStartX = e.clientX - svgBox.left;
      dragStartY = e.clientY - svgBox.top;

      dragRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      dragRect.setAttribute('fill', 'rgba(0, 123, 255, 0.3)');
      dragRect.setAttribute('stroke', 'blue');
      dragRect.setAttribute('stroke-width', '1');
      svgLayer.appendChild(dragRect);
    };

    const onMouseMove = (e) => {
      if (!isDragging || !dragRect) return;

      const currentX = e.clientX - svgBox.left;
      const currentY = e.clientY - svgBox.top;

      const x = Math.min(dragStartX, currentX);
      const y = Math.min(dragStartY, currentY);
      const width = Math.abs(currentX - dragStartX);
      const height = Math.abs(currentY - dragStartY);

      dragRect.setAttribute('x', x);
      dragRect.setAttribute('y', y);
      dragRect.setAttribute('width', width);
      dragRect.setAttribute('height', height);
    };

    const onMouseUp = (e) => {
      e.stopImmediatePropagation();
      if (!isDragging) return;
      isDragging = false;

      const endX = e.clientX - svgBox.left;
      const endY = e.clientY - svgBox.top;

      const svgWidth = Math.abs(endX - dragStartX); // SVG‐pixel units
      const svgHeight = Math.abs(endY - dragStartY);

      const {
        left, right, top, bottom,
      } = getCoords(dragStartX, dragStartY, endX, endY);

      svgLayer.removeChild(dragRect);
      dragRect = null;

      if (svgWidth < minWidth || svgHeight < minHeight) {
        // interpret small movement as a click
        onClick?.({ x: left, y: bottom });
        return;
      }

      onDragEnd?.({
        left,
        right,
        top,
        bottom,
      });
    };

    svgLayer.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      svgLayer.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isActive, svgLayer, minWidth, minHeight, onDragEnd, onClick, getCoords, convertersRef]);
};
