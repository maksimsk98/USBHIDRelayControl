import { useEffect } from 'react';

/**
 * Keeps a Dockview layout synced with its parent container width/height.
 *
 * @param {object} api - Dockview API instance (from onReady)
 * @param {string} parentId - DOM id of the container to track (e.g. "working-area")
 * @param {number} [minWidth=500] - Minimum width Dockview should use
 */
export function useDockviewAutoLayout(api, parentId = 'working-area', minWidth = 500) {
  useEffect(() => {
    if (!api) return;

    const parent = document.getElementById(parentId);
    if (!parent) return;

    let rafId;

    const updateLayout = () => {
      // Cancel any pending calls
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        // measure after all flex shrink/grow settle
        const width = Math.max(minWidth, parent.scrollWidth);
        const height = parent.clientHeight || parent.offsetHeight;

        try {
          api.layout(width, null, false);
        } catch (err) {
          console.warn('[Dockview] layout update failed:', err);
        }
      });
    };

    // initial sync once container is painted
    updateLayout();

    // watch for resizes of the container
    const observer = new ResizeObserver(updateLayout);
    observer.observe(parent);

    // cleanup
    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [api, parentId, minWidth]);
}
