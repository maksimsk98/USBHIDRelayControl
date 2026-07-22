import React, {
  useEffect, useMemo, useRef, useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plot } from '../../../utils/setupPlotly';

import { DEFAULT_DRAG_MODE, EMPTY_OBJECT } from '../../../constants/constants';
import { usePanHandlers } from '../../../hooks/usePanHandlers';
import { useConverters } from '../../../hooks/usePlotConverters';

import useCustomConfig from '../../../hooks/useCustomConfig';
import useResizeObserver from '../../../hooks/usePlotResizeObserver';
import useHandleZoom from '../../../hooks/useHandleZoom';
import useContextMenus from '../../../hooks/usePlotContextMenus';
import PlotContextMenus from '../../chromotograph/PlotContextMenus';

import {
  selectActiveTab,
  selectMaxWavelengthForFocusedStep, selectPlotView, selectPlotViewPrev, selectSpectroFocusedStepData,
} from '../../../services/reduxImportDispatcher';
import useIsContainerReady from '../../../hooks/useISContainerReady';
import { plotExportRegistry } from '../../../utils/classes/PlotExportRegistry';
import { usePlotDataExtractor } from '../../../hooks/usePlotDataExtractor';
import usePlotScroll from '../../../hooks/plotHooks/usePlotScroll';
import { findBounds } from '../../../utils/plotUtils';
import usePlotZoomCompiler from '../../../hooks/plotHooks/usePlotZoomCompiler';

const DEFAULT_LAYOUT = {
  autosize: true,
  margin: {
    t: 10,
    pad: 0,
  },
  xaxis: {
    title: {
      text: 'Длина волны (нм)',
    },
    showline: true,
    showgrid: false,
    /* minallowed: 0,
    rangemode: 'tozero', */
    ticklen: 5,
    tickwidth: 2,
  },
  yaxis: {
    title: {
      text: 'Сигнал (отн. ед.)',
    },
    showline: true,
    zeroline: false,
    showgrid: false,
    ticklen: 5,
    tickwidth: 2,
  },
  showlegend: false,
  hovermode: 'closest',
  legend: {
    orientation: 'h',
    x: 0,
    y: -0.2,
  },
};

function SpectroTracesPlot({
  tabId, traces, getItemStyle, initiator,
}) {
  const dispatch = useDispatch();

  const plotRef = useRef(null);
  const parentRef = useRef(null); // Create a ref for the plot container

  const activeTab = useSelector(selectActiveTab);
  const isPlotActive = (tabId === activeTab)

  const [activeDragmode, setActiveDragmode] = useState(DEFAULT_DRAG_MODE);
  const [showMarkers, setShowMarkers] = useState(false);

  const plotView = useSelector((state) => selectPlotView(state, { parentId: tabId })) ?? EMPTY_OBJECT;
  const prevLayouts = useSelector((state) => selectPlotViewPrev(state, { parentId: tabId }));
  const biggestWavelengthOfFocused = useSelector((state) => selectMaxWavelengthForFocusedStep(state, tabId));

  const { from: minWavelength, to: maxWavelength } = useSelector((state) => selectSpectroFocusedStepData(state, tabId));

  const computeXRange = (traces, minWavelength, maxWavelength) => {
    // Case 1: Autorange when traces exist
    if (Array.isArray(traces) && traces.length > 0) {
      return { autorange: true, range: undefined };
    }

    // Case 2: Domain from step selection
    if (Number.isFinite(minWavelength) && Number.isFinite(maxWavelength)) {
      return { autorange: false, range: [minWavelength, maxWavelength] };
    }

    // Case 3: Fallback placeholder
    return { autorange: false, range: [0, 900] };
  };

  useEffect(() => {
    const { autorange, range } = computeXRange(traces, minWavelength, maxWavelength);

    setLayout((prev) => ({
      ...prev,
      xaxis: {
        ...prev.xaxis,
        autorange,
        range,
      },
    }));
  }, [traces, minWavelength, maxWavelength]);

  const data = useMemo(() => {
    if (!Array.isArray(traces) || traces.length === 0) return [];

    // Assign auto colors from Plotly’s default palette

    return traces.map((curve, i) => ({
      x: curve.x,
      y: curve.y,
      type: 'scatter',
      mode: 'lines',
      name: curve.name ?? `Кривая ${curve?.originalIndex + 1}`,
      line: getItemStyle(i, curve),

      hovertemplate: 'λ: %{x}<br>Интенсивность: %{y}<extra></extra>',
    }));
  }, [traces]);

  const biggestWavelength = useMemo(() => {
    if (!Array.isArray(traces) || traces.length === 0) return biggestWavelengthOfFocused;

    let max = 0;

    for (const curve of traces) {
      const xs = curve?.x;
      if (!Array.isArray(xs) || xs.length === 0) continue;

      // If spectrum is sorted (most are), fast-path:
      const last = xs[xs.length - 1];
      if (Number.isFinite(last) && last > max) {
        max = last;
        continue;
      }

      // fallback: full scan for unsorted data
      for (let i = 0; i < xs.length; i++) {
        const v = xs[i];
        if (Number.isFinite(v) && v > max) max = v;
      }
    }

    return max === 0 ? biggestWavelengthOfFocused : max;
  }, [traces, biggestWavelengthOfFocused]);

  useResizeObserver(plotRef.current, true);

  const [layout, setLayout] = useState(DEFAULT_LAYOUT);

  const { handleRelayout } = useHandleZoom(
    tabId,
    null,
    null, // desync with sibling
    setLayout,
    null,
    setActiveDragmode,
    'unitless',
    {
      doSuppressXAutoRange: true,
      doSuppressYAutoRange: true,
    },
  );

  const { convertersRef, onRelayout: onRelayoutConv } = useConverters(parentRef);

  const {
    togglePanMode,
    panButton,
  } = usePanHandlers({
    plotElem: plotRef.current?.el ?? null,
    convertersRef,
    layout,
    setLayout,
    maxX: biggestWavelength,
    activeDragmode,
    setActiveDragmode,
  });

  const { plotlyConfig, buttons: { resetButton, prevLayoutButton } } = useCustomConfig({
    dispatch,
    parentId: tabId,
    plotElem: plotRef.current?.el ?? null,
    layout,
    rangeEndSecX: null,
    prevLayouts,
    extraButtons: [panButton],
    config: {
      customResetConfig: {
        isUsed: true,
        hasOriginalLogic: true,
      },
      buttonsToRemove: ['pan2d'],
    },
  });

  const isPlotContReady = useIsContainerReady(parentRef);

  const {
    setOpenMenu,
    openMenu,
    menuAnchorPoint,
    plotContextRef,
  } = useContextMenus({
    plotElem: plotRef.current?.el ?? null,
  });

  const plotContextConfig = {
    plotElem: plotRef.current?.el,
    ref: plotContextRef,
    resetButton,
    prevLayouts,
    markers: { show: showMarkers, set: setShowMarkers },
  };

  const contextControls = {
    anchorPoint: menuAnchorPoint,
    setOpenMenu,
    openMenu,
    setLayout,
    dispatch,
    buttons: { prevLayout: prevLayoutButton, reset: resetButton },
  };

  const contextMeta = {
    parentId: tabId,
  };

  const getData = usePlotDataExtractor(plotRef?.current?.el);

  useEffect(() => {
    const plotId = initiator;
    if (plotRef?.current?.el) {
      plotExportRegistry.register(tabId, plotId, getData);
    }
    return () => plotExportRegistry.unregister(tabId, plotId);
  }, [tabId, getData]); // ref in deps might be bad

  const yBounds = useMemo(() => findBounds(data, {
    axis: 'y',
    ignoreTraces: ['Background'],
    defaults: { min: -50, max: 50 },
    paddingPercent: 0,
  }), [data]);

  // Single memo for bounds
  const bounds = useMemo(() => ({
    x: [minWavelength, maxWavelength],
    y: yBounds
  }), [minWavelength, maxWavelength, yBounds]);

  const plotZoom = usePlotZoomCompiler(plotRef?.current, bounds, {
    enabled: isPlotActive,
    scrollSpeed: 0.5,
    axis: 'both',
  });

  return (
    <div ref={parentRef} style={{ width: '100%', height: '100%' }}>
      {isPlotContReady && (
        <>
          <Plot
            ref={plotRef}
            data={data}
            layout={layout}
            onRelayout={(event) => {
              handleRelayout(event);
              onRelayoutConv(parentRef);
            }}
            onAfterPlot={() =>{ 
              plotZoom.onAfterPlot();
            }}
            config={plotlyConfig}
            style={{ width: '100%', height: '100%' }}
          />

          <PlotContextMenus
            plot={plotContextConfig}
            controls={contextControls}
            meta={contextMeta}
          />
        </>

      )}
    </div>
  );
}

export default SpectroTracesPlot;
