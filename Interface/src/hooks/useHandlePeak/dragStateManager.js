const updateDragState = (moveEvent, state) => {
  const {
    convertersRef, leftBorder, rightBorder, hasSeparated, 
    separationStartX, stickyModeActive, stuckBorders
  } = state;
  
  if (processedEvents.has(moveEvent)) return null;
  
  let newSVGX = convertersRef.current.xPixelToSVG(moveEvent.clientX);
  newSVGX = Math.max(leftBorder, Math.min(rightBorder, newSVGX));
  
  const newCoordX = convertersRef.current.pixelToX(
    convertersRef.current.xSVGToPixel(newSVGX)
  );
  
  const isCtrlPressedNow = moveEvent.ctrlKey;
  if (!stickyModeActive && isCtrlPressedNow) {
    separationStartX = newCoordX;
  }
  
  return {
    newSVGX,
    newCoordX,
    isCtrlPressedNow,
    separationStartX: isCtrlPressedNow ? separationStartX : state.separationStartX,
    stickyModeActive: isCtrlPressedNow
  };
};

export {updateDragState}