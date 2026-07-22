import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plot } from '../../utils/setupPlotly';

import { selectSpectroPlotById } from '../../services/selectors/spectroPlots/spectroPlotsBase';

import useCustomConfig from '../../hooks/useCustomConfig';
import useResizeObserver from '../../hooks/usePlotResizeObserver';
import useHandleZoom from '../../hooks/useHandleZoom';
import { DEFAULT_DRAG_MODE } from '../../constants/constants';
import { selectActiveTab, selectPlotViewPrev, selectSpectroFocusedStepData } from '../../services/reduxImportDispatcher';
import { usePanHandlers } from '../../hooks/usePanHandlers';
import { useConverters } from '../../hooks/usePlotConverters';
import useIsContainerReady from '../../hooks/useISContainerReady';
import useContextMenus from '../../hooks/usePlotContextMenus';
import PlotContextMenus from '../chromotograph/PlotContextMenus';
import usePlotScroll from '../../hooks/plotHooks/usePlotScroll';
import { findBounds } from '../../utils/plotUtils';
import usePlotZoomCompiler from '../../hooks/plotHooks/usePlotZoomCompiler';

const getLayout = (rangeMin, rangeMax) => ({
  autosize: true,
  margin: {
    t: 10,
    pad: 0,
  },
  xaxis: {
    title: {
      text: 'Длина волны (нм)',
    },
    range: [rangeMin, rangeMax],
    autorange: true,
    showline: true,
    showgrid: false,
    rangemode: 'tozero',
    ticklen: 5,
    tickwidth: 2,
  },
  yaxis: {
    title: {
      text: 'Сигнал (отн. ед.)',
    },
    showline: true,
    zeroline: false,
    rangemode: 'tozero',
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
});

function SpectroPlot({ tabId }) {
  const dispatch = useDispatch();
  const plotRef = useRef(null);
  const parentRef = useRef(null); // Create a ref for the plot container

  const activeTab = useSelector(selectActiveTab);
  const isPlotActive = (tabId === activeTab)

  const [activeDragmode, setActiveDragmode] = useState(DEFAULT_DRAG_MODE);
  const [showMarkers, setShowMarkers] = useState(false);

  const spectroPoints = useSelector((state) => selectSpectroPlotById(state, tabId));

  /* const plotView = useSelector((state) => selectPlotView(state, {parentId: tabId})) ?? EMPTY_OBJECT; */ // no sync for now needed
  const prevLayouts = useSelector((state) => selectPlotViewPrev(state, { parentId: tabId }));

  const { from: minWavelength, to: maxWavelength } = useSelector((state) => selectSpectroFocusedStepData(state, tabId));

  useResizeObserver(plotRef.current, true);

  const data = useMemo(() => {
    // handle both null and malformed inputs gracefully
    if (
      !spectroPoints
      || !Array.isArray(spectroPoints.x)
      || !Array.isArray(spectroPoints.y)
    ) {
      return [];
    }

    return [
      {
        x: spectroPoints.x,
        y: spectroPoints.y,
        type: 'scatter',
        mode: 'lines',
        line: { width: 2 },
        hovertemplate: 'λ: %{x}<br>Интенсивность: %{y}<extra></extra>',
        name: 'Спектр',
      },
    ];
  }, [spectroPoints]);

  const [layout, setLayout] = useState(getLayout(minWavelength, maxWavelength));

  const { handleRelayout } = useHandleZoom(
    tabId,
    null,
    null, // desync with sibling
    setLayout,
    maxWavelength,
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
    maxX: maxWavelength,
    activeDragmode,
    setActiveDragmode,
  });

  const getNewXRange = useCallback(() => {
    const min = minWavelength ?? 0;
    const max = maxWavelength ?? 900;
    return [min, max];
  }, [minWavelength, maxWavelength]);

  useEffect(() => {
    setLayout((prev) => ({
      ...prev,
      xaxis: {
        ...prev.xaxis,
        autorange: false,
        range: [minWavelength, maxWavelength],
      },
    }));
  }, [minWavelength, maxWavelength]);

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
        hasOriginalLogic: false,
        getNewXRange,
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

export default SpectroPlot;
