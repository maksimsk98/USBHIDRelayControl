import { useCallback } from 'react';
import { extractVisiblePlotData } from '../utils/plotUtils';

/**
 * Hook returns extractor function tied to plotEl.
 *
 * Usage:
 *   const getData = usePlotDataExtractor(plotlyObj?.el);
 *   const { aoa } = getData({ aoa: true, tsv: false });
 */
export function usePlotDataExtractor(plotEl) {
  return useCallback(
    (opts = { aoa: true, tsv: false, skipEmpty: true }) => extractVisiblePlotData(plotEl, opts),
    [plotEl],
  );
}
