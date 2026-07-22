const setupDragEventHandlers = (onMouseMove, onMouseUp) => {
  window.addEventListener('mousemove', onMouseMove, { capture: true });
  window.addEventListener('mouseup', onMouseUp);
};

const cleanupDragEventHandlers = (onMouseMove, onMouseUp) => {
  window.removeEventListener('mousemove', onMouseMove, { capture: true });
  window.removeEventListener('mouseup', onMouseUp);
};

export {setupDragEventHandlers, cleanupDragEventHandlers}