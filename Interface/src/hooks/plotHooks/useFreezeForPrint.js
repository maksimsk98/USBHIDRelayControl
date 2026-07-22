import {
  useState, useEffect, useCallback, useRef,
} from 'react';
import { Plotly } from '../../utils/setupPlotly';
import { reportActions } from '../../services/reduxImportDispatcher';

export function useFreezeForPrintLocal(el, freeze, parentId, dispatch) {
  const [pngUrl, setPngUrl] = useState(null);
  const [imgRendered, setImgRendered] = useState(false);
  const [pngDimensions, setPngDimensions] = useState({ width: 0, height: 0 });

  const decrementedRef = useRef(false);

  useEffect(() => {
    if (!freeze) {
      setPngUrl(null);
      setImgRendered(false);
      setPngDimensions({ width: 0, height: 0 });
      decrementedRef.current = false;
      return;
    }
    if (!el) return;

    let cancelled = false;

    // Notify start
    dispatch(reportActions.incrementFreezePending({ parentId }));

    async function generatePng() {
      try {
        // 1 — подождать один кадр, чтобы Plotly успел дорендерить
        await new Promise((r) => requestAnimationFrame(r));

        // 2 — реальный размер
        const rect = el.getBoundingClientRect();

        let { width } = rect;
        let { height } = rect;

        // 3 — fallback если Plotly еще не отрисовал
        if (!width || !height) {
          console.warn('Freeze: rect invalid, using Plotly internal layout');
          const gd = el; // plotly element
          if (gd._fullLayout) {
            width = gd._fullLayout.width;
            height = gd._fullLayout.height;
          }
        }

        if (!width || !height) {
          console.error('Freeze: failed to get plot dimensions');
          return;
        }

        setPngDimensions({
          width: Math.round(width),
          height: Math.round(height),
        });

        const url = await Plotly.toImage(el, {
          format: 'png',
          scale: 4,
          width,
          height,
        });

        if (!cancelled) setPngUrl(url);
      } catch (e) {
        console.error('PNG generation failed:', e);
      } finally {
        /* console.log('generated plot png (waiting for render)', parentId); */
      }
    }

    generatePng();

    return () => {
      cancelled = true;
    };
  }, [freeze, el, parentId, dispatch]);

  const imgRef = useCallback((node) => {
    if (!freeze) return;

    if (node && !decrementedRef.current) {
      decrementedRef.current = true;
      setImgRendered(true);
      /* console.log('IMG intrinsic:', node.naturalWidth, node.naturalHeight);
      console.log('IMG rendered:', node.clientWidth, node.clientHeight);

      console.log('[freeze] img mounted → decrement pending', parentId); */
      dispatch(reportActions.decrementFreezePending({ parentId }));
    }
  }, [dispatch, parentId, freeze]);

  const renderPlotOrImage = useCallback(
    (original) => (
      freeze && pngUrl
        ? (
          <img
            ref={imgRef}
            src={pngUrl}
            data-original-width={pngDimensions.width}
            data-original-height={pngDimensions.height}
            style={{
              width: '100%',
              height: '100%',
              /* border: '3px solid #0d6efd', */
              maxWidth: `${pngDimensions.width}px`,
              maxHeight: `${pngDimensions.height}px`,
            }}
          />
        )
        : original
    ),
    [freeze, pngUrl, imgRef, pngDimensions],
  );

  return { pngUrl, renderPlotOrImage, imgRendered };
}
