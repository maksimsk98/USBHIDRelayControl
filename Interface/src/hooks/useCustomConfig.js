import {
  useRef, useEffect, useCallback, useMemo,
} from 'react';

import { Plotly } from '../utils/setupPlotly';
import { plotViewActions } from '../services/reduxImportDispatcher';

const useCustomConfig = ({
  dispatch,
  parentId,
  plotElem,
  layout,
  rangeEndSecX,
  config = {},
  prevLayouts,
  extraButtons = [],
}) => {
  const {
    customResetConfig = {
      isUsed: true,
      hasOriginalLogic: true,
      getNewXRange: null, // NEW (optional): (layout) => [min, max]
      resetHandler: { needsParsing: false, recalcTicks: true },
    },
    prevLayoutConfig = { isUsed: true },
    buttonsToRemove = [],
  } = config;

  const resetRangeRef = useRef(customResetConfig.getNewXRange);

  useEffect(() => {
    resetRangeRef.current = customResetConfig.getNewXRange;
  }, [customResetConfig.getNewXRange]);

  const rangeRef = useRef(rangeEndSecX); // we need ref for freash values in reset button, plotly doesn't react on config change, so it is the best solution so far

  useEffect(() => {
    rangeRef.current = rangeEndSecX;
  }, [rangeEndSecX]);

  const resetView = useCallback(() => {
    console.groupCollapsed('reset view');
    console.log('[resetView] rangeRef.current', rangeRef.current);
    console.log('[resetView] layout', layout);
    let newXRange;
    const fn = resetRangeRef.current;
    if (typeof fn === 'function') {
      newXRange = fn(layout);
    } else {
      // backward-compatible default
      const currentMax = rangeRef.current ?? 100;
      newXRange = [0, currentMax];
    }

    console.log('[resetView] newXRange', newXRange);

    const newLayout = {
      xaxis: {
        ...layout.xaxis,
        autorange: false,
        range: newXRange,
      },
      yaxis: {
        ...layout.yaxis,
        autorange: true,
      },
      excludeFromHistory: true,
    };
    console.log('[resetView] newLayout', newLayout);
    console.groupEnd();

    dispatch(plotViewActions.clearHistory(parentId)); // Clear old zooms
    Plotly.relayout(plotElem, newLayout);
  }, [layout, rangeRef, plotElem]);

  const resetButton = useMemo(() => {
    if (!customResetConfig.isUsed) return null;
    if (customResetConfig?.hasOriginalLogic) {
      return ({
        name: 'Сбросить отображение осей к значениям по умолчанию',
        icon: Plotly.Icons.home,
        click: () => {
          Plotly.relayout(plotElem, {
            'xaxis.autorange': true,
            'yaxis.autorange': true,
            excludeFromHistory: true, // HACK: relies on Plotly passing unknown layout keys. May break in future.
          });
          dispatch(plotViewActions.clearHistory(parentId)); // Clear old zooms
        },
      // This mimics Plotly's default reset behavior,
      // but we override it to ensure Redux zoom history is cleared too
      });
    }

    return {
      name: 'Сбросить отображение осей к значениям по умолчанию',
      icon: Plotly.Icons.home,
      click: resetView,
    };
  }, [customResetConfig, layout, resetView]);

  const prevLayoutsRef = useRef(prevLayouts);
  useEffect(() => {
    prevLayoutsRef.current = prevLayouts;
  }, [prevLayouts]);

  const handlePrevLayoutClick = useCallback(() => {
    const prevLayout = prevLayoutsRef.current.at(-1);
    dispatch(plotViewActions.markUndo(parentId));
    if (prevLayout === null) {
      /* console.log('reset') */
      resetView();
    } else {
      const xAxis = prevLayout?.xaxis;
      const xAutorange = xAxis?.autorange ?? null;
      const xRange = xAxis?.range ?? null;

      const yAxis = prevLayout?.yaxis;
      const yAutorange = yAxis?.autorange ?? null;
      const yRange = yAxis?.range ?? null;

      /* const prevCustomData = prevLayout?.customData ?? {} */

      const layoutPatch = {
        ...(xAutorange != null && { 'xaxis.autorange': xAutorange }),
        ...(xRange != null && {
          'xaxis.range[0]': xRange[0],
          'xaxis.range[1]': xRange[1],
        }),
        ...(yAutorange != null && { 'yaxis.autorange': yAutorange }),
        ...(yRange != null && {
          'yaxis.range[0]': yRange[0],
          'yaxis.range[1]': yRange[1],
        }),
        excludeFromHistory: true, // HACK: relies on Plotly passing unknown layout keys. May break in future.
      };

      /* console.log('undo', layoutPatch, prevLayout) */
      Plotly.relayout(plotElem, layoutPatch);
    }
  }, [dispatch, parentId, resetView, plotElem]);

  const prevLayoutButton = useMemo(() => {
    if (!prevLayoutConfig?.isUsed || prevLayouts.length === 0) return null; // No need to add a button if

    return {
      name: 'Вернуть прошлое отоброжение области',
      icon: Plotly.Icons.undo,
      click: handlePrevLayoutClick,
    };
  }, [prevLayoutConfig, prevLayouts, handlePrevLayoutClick]);

  const modeBarButtonsToAdd = useMemo(() => {
    const buttons = []; //

    if (resetButton) {
      buttons.push(resetButton);
    }
    if (prevLayoutButton) {
      buttons.push(prevLayoutButton);
    }

    buttons.push(...extraButtons);

    return buttons.length > 0 ? buttons : undefined;
  }, [resetButton, prevLayoutButton, extraButtons]);

  const modeBarButtonsToRemove = useMemo(() => {
    const allButtonsToRemove = new Set([...buttonsToRemove]); // Ensures uniqueness

    if (customResetConfig?.isUsed) {
      allButtonsToRemove.add('resetScale2d');
      allButtonsToRemove.add('autoScale2d');
    }

    return allButtonsToRemove.size > 0 ? Array.from(allButtonsToRemove) : undefined; // Ensure undefined if empty
  }, [customResetConfig.isUsed, buttonsToRemove]);

  // don't use useMemo here, plotly skips updates due to stable reference
  const plotlyConfig = {
    responsive: true,
    displaylogo: false,
    ...(modeBarButtonsToRemove && { modeBarButtonsToRemove }), // Add only if needed
    ...(modeBarButtonsToAdd && { modeBarButtonsToAdd }), // Ensures it's only included if needed
    locale: 'ru',
  };

  return { plotlyConfig, buttons: { resetButton, prevLayoutButton } };
};

export default useCustomConfig;
