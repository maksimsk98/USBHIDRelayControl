import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plot } from '../../../utils/setupPlotly';

import {
  chromaMiscActions, isThisTabMeasurementRunning, selectActiveSubTabByTab, selectActiveTab, selectDiviationIntervalSec, selectPlotsDataByIdAndType, selectPlotViewPrev, selectTabSignalParams,
} from '../../../services/reduxImportDispatcher';

import useResizeObserver from '../../../hooks/usePlotResizeObserver';
import usePlotLayout from '../../../hooks/usePlotLayout';
import useHandleZoom from '../../../hooks/useHandleZoom';
import { DEFAULT_DRAG_MODE, DETECTOR_PLOTS, EMPTY_OBJECT } from '../../../constants/constants';
import { useCustomHoverHandlers } from '../../../hooks/usePlotHoverHandler';
import useRangeEndSec from '../../../hooks/useRangeEndSec';
import useCustomConfig from '../../../hooks/useCustomConfig';
import useIsContainerReady from '../../../hooks/useISContainerReady';
import useStatePlotRef from '../../../hooks/useStatePlotRef';
import { useMarker } from '../../../hooks/useMarker';
import { updateMarkersThunk } from '../../../services/thunks/chormaPlots/chromaPlotsThunks';
import { useConverters } from '../../../hooks/usePlotConverters';
import PlotContextMenus from '../PlotContextMenus';
import useContextMenus from '../../../hooks/usePlotContextMenus';
import { usePanHandlers } from '../../../hooks/usePanHandlers';
import { usePlotDataExtractor } from '../../../hooks/usePlotDataExtractor';
import { plotExportRegistry } from '../../../utils/classes/PlotExportRegistry';
import usePlotScroll from '../../../hooks/plotHooks/usePlotScroll';
import { findBounds } from '../../../utils/plotUtils';
import usePlotZoomCompiler from '../../../hooks/plotHooks/usePlotZoomCompiler';

function SignalPlot(props) {
  const dispatch = useDispatch();
  const {
    parentId, parentSubTab, initiator, plotParams, tracesVisible, timeUnit, lastStepBorder,
  } = props;
  const [plotlyObj, setPlotlyRef] = useStatePlotRef();
  const parentRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeDragmode, setActiveDragmode] = useState(DEFAULT_DRAG_MODE);

  const [showMarkers, setShowMarkers] = useState(false);

  const plotView = useSelector((state) => state.plotViewReducer[parentId]) ?? EMPTY_OBJECT;
  const prevLayouts = useSelector((state) => selectPlotViewPrev(state, { parentId }));

  const fetchedPlotsData = useSelector((state) => selectPlotsDataByIdAndType(state, {
    tabId: parentId, pointTypes: plotParams.plotData,
  }));
  const activeTab = useSelector(selectActiveTab);
  const activeSubTab = useSelector((state) => selectActiveSubTabByTab(state, activeTab));
  const isPlotActive = (parentId === activeTab && parentSubTab === activeSubTab);

  const diviationIntervalSec = useSelector((state) => selectDiviationIntervalSec(state, parentId));
  const { isSquishableInterval, isCaptureInterval } = useSelector((state) => selectTabSignalParams(state, parentId));
  const isMeasureRunning = useSelector((state) => isThisTabMeasurementRunning(state, parentId));

  const isDetectorPlot = DETECTOR_PLOTS.some((key) => Object.prototype.hasOwnProperty.call(tracesVisible, key));

  const firstX = fetchedPlotsData?.measuredChromatogram?.x?.[0] ?? null;

  const [intervalMarkers, setIntervalMarkers] = useState(
    firstX != null && diviationIntervalSec !== null
      ? [
        { x: firstX, color: 'blue', customData: { type: 'marker' } },
        { x: firstX + diviationIntervalSec, color: 'blue', customData: { type: 'marker' } },
      ]
      : [],
  );

  useEffect(() => {
    const xData = fetchedPlotsData?.measuredChromatogram?.x;
    if (!Array.isArray(xData) || xData.length === 0 || diviationIntervalSec === null) return;

    const minX = xData[0];
    const maxX = xData[xData.length - 1];

    // Defensive reset if markers are missing
    if (!Array.isArray(intervalMarkers) || intervalMarkers.length !== 2) {
      setIntervalMarkers([
        { x: minX, color: 'blue', customData: { type: 'marker' } },
        { x: Math.min(minX + diviationIntervalSec, maxX), color: 'blue', customData: { type: 'marker' } },
      ]);

      return;
    }

    const left = intervalMarkers[0];
    const right = intervalMarkers[1];
    const currentInterval = right.x - left.x;

    // Reset if out of order or interval mismatch
    if (currentInterval !== diviationIntervalSec || left.x > right.x || left.x < minX || right.x > maxX) {
      /* console.log('Resetting markers due to invalid state or changed interval'); */
      const preRight = (left.x + diviationIntervalSec);
      const newRightBorderX = preRight < maxX ? preRight : maxX;
      const preLeft = newRightBorderX - diviationIntervalSec;
      const newLeftBorderX = preLeft < minX ? minX : preLeft;
      setIntervalMarkers([
        { ...left, x: newLeftBorderX },
        { ...right, x: newRightBorderX },
      ]);
      dispatch(updateMarkersThunk({ tabId: parentId, leftBorder: newLeftBorderX, rightBorder: newRightBorderX }));
      return;
    }

    let clampedLeftX = left.x;
    let clampedRightX = right.x;

    // Clamp both while preserving interval
    if (left.x < minX) {
      clampedLeftX = minX;
      clampedRightX = minX + diviationIntervalSec;
    } else if (right.x > maxX) {
      clampedRightX = maxX;
      clampedLeftX = maxX - diviationIntervalSec;
    }

    if (left.x !== clampedLeftX || right.x !== clampedRightX) {
      setIntervalMarkers([
        { ...left, x: clampedLeftX },
        { ...right, x: clampedRightX },
      ]);
    }
  }, [fetchedPlotsData?.measuredChromatogram?.x, diviationIntervalSec, isSquishableInterval]);

  const plotData = plotParams.plotData.map((pointType) => {
    if (fetchedPlotsData[pointType]) {
      return {
        type: showMarkers ? 'scattergl' : 'scatter',
        mode: showMarkers ? 'lines+markers' : 'lines',
        line: { 
          color: plotParams.lineColors[pointType],
          width: showMarkers ? 1 : 2,
          simplify: true, // Enable line simplification for performance
        },

        ...(showMarkers && {       // Прокидываем маркеры только если showMarkers=true
          marker: {
            size: 2,
            color: 'purple',
            maxdisplayed: 2000,
          },
        }),

        x: fetchedPlotsData[pointType].x,
        y: fetchedPlotsData[pointType].y,
        visible: tracesVisible[pointType] ? true : 'legendonly',
        hovertemplate: '<extra></extra>',
        name: pointType,
      };
    }
    return null;
  });

  const lastDataPointX = plotData[0].x.at(-1);
  const rangeEndSecX = useRangeEndSec(lastStepBorder, lastDataPointX, timeUnit);

  const [layout, setLayout] = usePlotLayout(
    rangeEndSecX,
    timeUnit,
    plotView.layout,
    plotParams.axisTitles.xAxis,
    plotParams.axisTitles.yAxis,
  );

  const { handleRelayout } = useHandleZoom(
    parentId,
    initiator,
    plotView.layout,
    setLayout,
    rangeEndSecX,
    setActiveDragmode,
    timeUnit,
    {
      doSuppressXAutoRange: true,
      doSuppressYAutoRange: true,
    },
  );

  const { onHover, onUnhover } = useCustomHoverHandlers(timeUnit);

  useResizeObserver(plotlyObj, isPlotActive);

  const { convertersRef, onRelayout: onRelayoutConv } = useConverters(parentRef);

  const {
    togglePanMode,
    panButton,
  } = usePanHandlers({
    plotElem: plotlyObj?.el,
    convertersRef,
    layout,
    setLayout,
    maxX: rangeEndSecX,
    activeDragmode,
    setActiveDragmode,
  });

  const { plotlyConfig, buttons: { resetButton, prevLayoutButton } } = useCustomConfig({
    dispatch,
    parentId,
    plotElem: plotlyObj?.el,
    layout,
    rangeEndSecX,
    prevLayouts,
    extraButtons: [panButton],
    config: { buttonsToRemove: ['pan2d'] },
  });

  const isPlotContReady = useIsContainerReady(parentRef);

  const plotStyle = {
    width: '100%',
    height: '100%',
    visibility: isPlotContReady ? 'visible' : 'hidden', // Keeps the layout flow but hides visually
    pointerEvents: isPlotContReady ? 'auto' : 'none', // Optional: Prevents interactions when not visible
    position: 'relative', // Prevent layout issues
  };

  const moveMarkerHandler = ({
    shapeIndex, newX, pairedIndex, pairedX,
  }) => {
    const updated = [...intervalMarkers];
    updated[shapeIndex].x = newX;
    if (pairedIndex != null && pairedX != null) {
      updated[pairedIndex].x = pairedX;
    }
    setIntervalMarkers(updated);

    if (isCaptureInterval) {
      const newInterval = Math.abs(pairedX - newX);
      dispatch(chromaMiscActions.updateSignalParams({ id: parentId, params: { customUserDeviationInterval: newInterval } }));
    }

    // Extract left and right markers regardless of order
    const positions = updated.map((m) => m.x).sort((a, b) => a - b);
    const [leftBorder, rightBorder] = positions;

    dispatch(updateMarkersThunk({ tabId: parentId, leftBorder, rightBorder }));
  };

  useMarker({
    plotlyObj,
    setLayout,
    plotData: fetchedPlotsData.measuredChromatogram,
    shapeDefs: intervalMarkers,
    shapeTypes: ['marker'],
    moveMarkerHandler,
    config: {
      mode: isCaptureInterval ? 'capture' : 'slidingWindow', // "slidingWindow" | "capture"
      slidingWindowWidth: diviationIntervalSec,
      squishableInterval: isSquishableInterval,
      enableCollision: isCaptureInterval,
      minGap: 1,
    },
    isActive: isDetectorPlot && isInitialized,
    layout,
    convertersRef,
  });

  const handleInitialized = (figure, graphDiv) => {
    setIsInitialized(true);
  };

  const {
    setOpenMenu,
    openMenu,
    menuAnchorPoint,
    plotContextRef,
  } = useContextMenus({
    plotElem: plotlyObj?.el,
  });

  const plotContextConfig = {
    plotElem: plotlyObj?.el,
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
    parentId,
  };

  const getData = usePlotDataExtractor(plotlyObj?.el);

  const isPlotVisible = Object.values(tracesVisible).some(Boolean);

  useEffect(() => {
    const plotId = `signals:${initiator}`;

    if (!plotlyObj?.el || !isPlotVisible) {
      // If previously registered but now invisible → unregister
      plotExportRegistry.unregister(parentId, plotId);
      return;
    }

    console.log('signal reg', plotId);
    plotExportRegistry.register(parentId, plotId, getData);

    return () => plotExportRegistry.unregister(parentId, plotId);
  }, [plotlyObj, parentId, initiator, isPlotVisible, getData]);

  const yBounds = useMemo(() => findBounds(plotData, {
    axis: 'y',
    ignoreTraces: ['Background'],
    defaults: { min: -50, max: 50 },
    paddingPercent: 0.05,
  }), [plotData]);

  // Single memo for bounds
  const bounds = useMemo(() => ({
    x: [0, lastStepBorder],
    y: yBounds
  }), [lastStepBorder, yBounds]);

  const plotZoom = usePlotZoomCompiler(plotlyObj, bounds, {
    enabled: isPlotActive,
    scrollSpeed: 0.5,
    axis: 'both',
  });

  return (
    <div ref={parentRef} style={{ borderTop: '1px solid black', width: '100%', height: '100%' }}>
      {isPlotContReady && (
        <>
          <Plot
            ref={setPlotlyRef}
            data={plotData}
            layout={layout}
            onRelayout={(event) => {
              handleRelayout(event);
              onRelayoutConv(parentRef);
            }}
            onAfterPlot={() =>{ 
              plotZoom.onAfterPlot();
            }}
            onInitialized={handleInitialized}
            onHover={onHover}
            onUnhover={onUnhover}
            /* useResizeHandler={true} */
            style={plotStyle}
            config={plotlyConfig}
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

export default SignalPlot;
