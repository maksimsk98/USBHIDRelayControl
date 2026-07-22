import { useEffect, useCallback } from 'react';

export const useDragRectangleX = ({
  isActive,
  svgLayer,
  dragLayer,
  converters,
  minGap = 1,
  onDragEnd, // ({ left, right }) => void
}) => {
  const getCoords = useCallback((svgX1, svgX2) => {
    const pixelX1 = converters.xSVGToPixel(svgX1);
    const pixelX2 = converters.xSVGToPixel(svgX2);
    return {
      left: converters.pixelToX(Math.min(pixelX1, pixelX2)),
      right: converters.pixelToX(Math.max(pixelX1, pixelX2)),
    };
  }, [converters]);

  useEffect(() => {
    if (!isActive || !svgLayer || !dragLayer || !converters) return;

    let isDragging = false;
    let dragStartX = null;
    let dragRect = null;

    const draglayerBox = dragLayer.getBoundingClientRect();
    const svgLayerBox = svgLayer.getBoundingClientRect();

    const onMouseDown = (e) => {
      isDragging = true;
      dragStartX = e.clientX - svgLayerBox.left;

      dragRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      dragRect.setAttribute('y', `${draglayerBox.top - svgLayerBox.top}`);
      dragRect.setAttribute('height', draglayerBox.height);
      dragRect.setAttribute('fill', 'rgba(0, 123, 255, 0.3)');
      dragRect.setAttribute('stroke', 'blue');
      dragRect.setAttribute('stroke-width', '1');
      svgLayer.appendChild(dragRect);
    };

    const onMouseMove = (e) => {
      if (!isDragging || !dragRect) return;
      const currentX = e.clientX - svgLayerBox.left;
      const x = Math.min(dragStartX, currentX);
      const width = Math.abs(currentX - dragStartX);

      dragRect.setAttribute('x', x);
      dragRect.setAttribute('width', width);
    };

    const onMouseUp = (e) => {
      if (!isDragging) return;
      isDragging = false;

      const endX = e.clientX - svgLayerBox.left;
      const leftSVG = Math.min(dragStartX, endX);
      const rightSVG = Math.max(dragStartX, endX);

      const { left, right } = getCoords(leftSVG, rightSVG);
      const interval = right - left;

      if (interval < minGap) {
        svgLayer.removeChild(dragRect);
        dragRect = null;
        return;
      }

      onDragEnd?.({ left, right });

      svgLayer.removeChild(dragRect);
      dragRect = null;
    };

    svgLayer.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      svgLayer.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isActive, svgLayer, dragLayer, converters, minGap, onDragEnd, getCoords]);
};
