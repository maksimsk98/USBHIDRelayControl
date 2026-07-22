import { useEffect, useRef, useState } from 'react';

// Avoid using initial === min to avoid jitters
const adjustClientPosition = ({
  event,
  subdirections,
  minWidth,
  maxWidth,
  minHeight,
  maxHeight,
  initialSize,
  initialPosition,
}) => {
  const deltaX = event.clientX - initialPosition.current.x;
  const deltaY = event.clientY - initialPosition.current.y;

  let adjustedClientX = event.clientX;
  let adjustedClientY = event.clientY;

  for (const direction of subdirections) {
    if (direction === 'left' || direction === 'right') {
      const newWidth = direction === 'left'
        ? initialSize.current.width - deltaX
        : initialSize.current.width + deltaX;

      if (newWidth < minWidth) {
        adjustedClientX = direction === 'left'
          ? initialPosition.current.x + (initialSize.current.width - minWidth)
          : initialPosition.current.x + (minWidth - initialSize.current.width);
      } else if (newWidth > maxWidth) {
        adjustedClientX = direction === 'left'
          ? initialPosition.current.x - (maxWidth - initialSize.current.width)
          : initialPosition.current.x + (maxWidth - initialSize.current.width);
      }
    }

    if (direction === 'top' || direction === 'bottom') {
      const newHeight = direction === 'top'
        ? initialSize.current.height - deltaY
        : initialSize.current.height + deltaY;
      if (newHeight < minHeight) {
        adjustedClientY = direction === 'top'
          ? initialPosition.current.y + (initialSize.current.height - minHeight)
          : initialPosition.current.y + (minHeight - initialSize.current.height);
      } else if (newHeight > maxHeight) {
        /* console.log('height',newHeight, maxHeight); */

        adjustedClientY = direction === 'top'
          ? initialPosition.current.y - (maxHeight - initialSize.current.height)
          : initialPosition.current.y + (maxHeight - initialSize.current.height);
      }
    }
  }

  return { adjustedClientX, adjustedClientY };
};

const extractPointerEventProps = (event) => ({
  bubbles: event.bubbles,
  cancelable: event.cancelable,
  composed: event.composed,
  pointerId: event.pointerId,
  width: event.width,
  height: event.height,
  pressure: event.pressure,
  tangentialPressure: event.tangentialPressure,
  tiltX: event.tiltX,
  tiltY: event.tiltY,
  twist: event.twist,
  pointerType: event.pointerType,
  isPrimary: event.isPrimary,

  // These are missing unless manually extracted
  movementX: event.movementX,
  movementY: event.movementY,
  clientX: event.clientX,
  clientY: event.clientY,
  screenX: event.screenX,
  screenY: event.screenY,

  // Modifier keys (must be included manually)
  altKey: event.altKey,
  ctrlKey: event.ctrlKey,
  metaKey: event.metaKey,
  shiftKey: event.shiftKey,

  // Button state
  buttons: event.buttons,

  // Additional event properties
  detail: event.detail,
  view: event.view,
  relatedTarget: event.relatedTarget,
  persistentDeviceId: event.persistentDeviceId, // Touchscreen/stylus device ID
});

const useResizeConstraints = ({
  panelApi,
  handleSelector = '.dv-resize-handle-top, .dv-resize-handle-right, .dv-resize-handle-bottom, .dv-resize-handle-left, .dv-resize-handle-topleft, .dv-resize-handle-topright, .dv-resize-handle-bottomleft, .dv-resize-handle-bottomright',
  maxWidth = Infinity,
  maxHeight = Infinity,
  minWidth = 0,
  minHeight = 0,
  initialWidth = maxWidth,
  initialHeight = maxHeight,
}) => {
  const initialPosition = useRef({ x: 0, y: 0 }); // Store pointerdown position
  const initialSize = useRef({ width: 0, height: 0 }); // Store starting width/height

  const [group, setGroup] = useState(panelApi.group);

  useEffect(() => {
    panelApi.onDidGroupChange(() => {
      const newGroup = panelApi.group;
      setGroup((prevGroup) => (prevGroup !== newGroup ? newGroup : prevGroup));
    });
  }, [panelApi]);

  useEffect(() => {
    group.api.setSize({
      width: initialWidth,
      height: initialHeight,
    });
  }, [group]);

  useEffect(() => {
    const processedEvents = new WeakSet(); // this stores events as keys and don't block garbage collection

    const element = group.element.closest('.dv-resize-container');
    if (!element) {
      /* console.warn('Parent element not provided'); */
      return;
    }

    const onPointerMove = (event, subdirections) => {
      if (processedEvents.has(event)) {
        return; // Skip already processed events
      }

      const { adjustedClientX, adjustedClientY } = adjustClientPosition({
        event,
        subdirections,
        minWidth,
        maxWidth,
        minHeight,
        maxHeight,
        initialSize,
        initialPosition,
      });

      // If we adjusted clientX or clientY, emit a modified event
      if (adjustedClientX !== event.clientX || adjustedClientY !== event.clientY) {
        event.preventDefault();
        event.stopPropagation();

        const newEventTemplate = extractPointerEventProps(event);
        const adjustedEvent = {
          ...newEventTemplate,
          clientX: adjustedClientX,
          clientY: adjustedClientY,
        };

        const newEvent = new PointerEvent('pointermove', adjustedEvent);

        processedEvents.add(newEvent);
        event.target.dispatchEvent(newEvent);
      }
    };

    const attachHandlers = (handle, subdirections) => {
      const onPointerDown = (event) => {
        /* console.log(`Attaching pointermove interceptor for direction: ${subdirections}`); */
        initialPosition.current = { x: event.clientX, y: event.clientY }; // Store starting pointer position
        initialSize.current = element.getBoundingClientRect();

        const pointerMoveHandler = (event) => onPointerMove(event, subdirections);

        window.addEventListener('pointermove', pointerMoveHandler, { capture: true });

        const onPointerUp = () => {
          /* console.log(`Detaching pointermove interceptor for direction: ${subdirections}`); */
          window.removeEventListener('pointermove', pointerMoveHandler, { capture: true });
          window.removeEventListener('pointerup', onPointerUp);
        };

        window.addEventListener('pointerup', onPointerUp);
      };

      handle.addEventListener('pointerdown', onPointerDown, { capture: true });

      // Cleanup
      return () => {
        handle.removeEventListener('pointerdown', onPointerDown, { capture: true });
      };
    };

    const resizeHandles = element.querySelectorAll(handleSelector);

    const cleanups = [];
    resizeHandles.forEach((handle) => {
      const direction = handle.className.split('-').pop();
      const regex = /(top)|(right)|(bottom)|(left)/g;
      const subDirections = direction.match(regex) ?? [];
      const cleanup = attachHandlers(handle, subDirections);
      cleanups.push(cleanup);
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [group, handleSelector, maxWidth, maxHeight, minWidth, minHeight]);
};

export default useResizeConstraints;
