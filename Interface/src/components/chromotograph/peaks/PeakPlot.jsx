import React, {
  useState, useEffect, useRef, useMemo,
} from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Plot } from '../../../utils/setupPlotly';

import {
  selectIsWritingBaseLine,
  selectLastStepToIfNotWB,
  selectTimeUnit,
  selectActiveTab,
  selectActiveSubTabByTab,
  selectPlotsDataByIdAndType,
  isThisTabMeasurementRunning,
  selectEffectiveDetectorType,
  selectPlotViewPrev,
  selectPeakWorkMode,
  selectPeaksById,
} from '../../../services/reduxImportDispatcher';

import useResizeObserver from '../../../hooks/usePlotResizeObserver';
import usePlotLayout from '../../../hooks/usePlotLayout';
import {
  DEFAULT_DRAG_MODE, DETECTOR_Y_LABELS, EMPTY_ARRAY, EMPTY_OBJECT,
} from '../../../constants/constants';
import { useCustomHoverHandlers } from '../../../hooks/usePlotHoverHandler';
import useRangeEndSec from '../../../hooks/useRangeEndSec';
import useCustomConfig from '../../../hooks/useCustomConfig';
import useIsContainerReady from '../../../hooks/useISContainerReady';
import useStatePlotRef from '../../../hooks/useStatePlotRef';
import useHandleZoom from '../../../hooks/useHandleZoom';
import useHandlePeak from '../../../hooks/useHandlePeak/useHandlePeak';
import { useConverters } from '../../../hooks/usePlotConverters';
import { useCaptureRange } from '../../../hooks/useCaptureRange';
import PlotContextMenus from '../PlotContextMenus';
import useContextMenus from '../../../hooks/usePlotContextMenus';
import { usePanHandlers } from '../../../hooks/usePanHandlers';
import { usePlotDataExtractor } from '../../../hooks/usePlotDataExtractor';
import { plotExportRegistry } from '../../../utils/classes/PlotExportRegistry';
import usePlotScroll from '../../../hooks/plotHooks/usePlotScroll';
import { findBounds } from '../../../utils/plotUtils';
import usePlotZoomCompiler from '../../../hooks/plotHooks/usePlotZoomCompiler';

const colorMap = {
  measuredChromatogram: 'blue',
  calculatedChromatogram: 'green',
};

/* const generateSineWave = (numPoints = 600, frequency = 4, amplitude = 1) => {
  const x = Array.from({ length: numPoints }, (_, i) => i); // X goes from 0 to 599
  const y = x.map(val => Math.abs(amplitude * Math.sin((2 * Math.PI * frequency * val) / numPoints)));
  return { x, y };
};
const sineData = generateSineWave(); */

/* function makeLoggingSetter(setLayout) {
  return (updater) => {
    console.groupCollapsed('%c setLayout called', 'color: orange;');
    console.log(updater)
    console.trace();
    console.groupEnd();

    setLayout(updater);
  };
} */

function PeakPlot({
  parentId,
  parentSubTab,
  displayedPlots,
  annotationsConfig,
}) {
  const dispatch = useDispatch();
  const initiator = parentSubTab;
  const parentRef = useRef(null); // Create a ref for the plot container
  const [plotlyObj, setPlotlyRef] = useStatePlotRef();
  const [isInitialized, setIsInitialized] = useState(false);

  const [activeDragmode, setActiveDragmode] = useState(DEFAULT_DRAG_MODE);

  const fetchedPlotsData = useSelector((state) => selectPlotsDataByIdAndType(state, {
    tabId: parentId,
    pointTypes: displayedPlots,
  }));
  const timeUnit = useSelector((state) => selectTimeUnit(state, parentId));

  const plotView = useSelector((state) => state.plotViewReducer[parentId]) ?? EMPTY_OBJECT;
  const prevLayouts = useSelector((state) => selectPlotViewPrev(state, { parentId }));

  const isWritingBaseLine = useSelector((state) => selectIsWritingBaseLine(state));
  const lastStepBorder = useSelector((state) => selectLastStepToIfNotWB(state, { tabId: parentId }));
  const peakData = useSelector((state) => selectPeaksById(state, parentId)) ?? EMPTY_ARRAY;

  const activeTab = useSelector(selectActiveTab);
  const activeSubTab = useSelector((state) => selectActiveSubTabByTab(state, activeTab));
  const isPlotActive = (parentId === activeTab && parentSubTab === activeSubTab);
  const isMeasureRunning = useSelector((state) => isThisTabMeasurementRunning(state, parentId));
  const detectorType = useSelector((state) => selectEffectiveDetectorType(state, parentId ));

  const peakWorkMode = useSelector((state) => selectPeakWorkMode(state, parentId));

  const [showMarkers, setShowMarkers] = useState(false);

  const enablePeakContext = true;

  const plotData = useMemo(() => (
    Object.entries(fetchedPlotsData).map(([type, plot]) => ({
      type: showMarkers ? 'scattergl' : 'scatter',
      mode: showMarkers ? 'lines+markers' : 'lines',
      x: plot.x,
      y: plot.y,
      hovertemplate: '%{x} сек<br>%{y} mAU',
      line: { 
        color: colorMap[type],
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
      customData: { type },
      name: type,
      hovertemplate: '<extra></extra>',
    }))
  ), [fetchedPlotsData, showMarkers]);

  const filteredPlotData = useMemo(() => (
    plotData.filter((plot) => plot.customData.type === 'calculatedChromatogram')
  ), [plotData]);

  const lastDataPointX = Object.values(fetchedPlotsData)[0]?.x?.at(-1) ?? 0;
  const rangeEndSecX = useRangeEndSec(lastStepBorder, lastDataPointX, timeUnit);

  const yLabel = DETECTOR_Y_LABELS[detectorType];

  const [layout, setLayout] = usePlotLayout(
    rangeEndSecX,
    timeUnit,
    plotView.layout,
    `Время измерения (${timeUnit === 'min' ? 'мин' : 'сек'})`,
    yLabel,
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

  const isPlotContReady = useIsContainerReady(parentRef);

  const plotStyle = {
    width: '100%',
    height: '100%',
    visibility: isPlotContReady ? 'visible' : 'hidden', // Keeps the layout flow but hides visually
    pointerEvents: isPlotContReady ? 'auto' : 'none', // Optional: Prevents interactions when not visible
    position: 'relative', // Prevent layout issues
  };

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
    hasCompetition: peakWorkMode !== null,
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

  const { range: trueRanges, onRelayout: captureRangeRelayout } = useCaptureRange();

  const { getNewSelectedPeak, selectedPeakNum } = useHandlePeak({
    plotlyObj,
    isInitialized,
    setLayout,
    peaks: peakData,
    layout,
    plotData: filteredPlotData,
    dispatch,
    parentId,
    convertersRef,
    trueRanges,
    annotationsConfig,
    workMode: peakWorkMode,
  });

  const handleInitialized = (figure, graphDiv) => {
    setIsInitialized(true);
    onRelayoutConv(parentRef);
  };

  const {
    setOpenMenu,
    openMenu,
    menuAnchorPoint,
    peakContextRef,
    plotContextRef,
  } = useContextMenus({
    plotElem: plotlyObj?.el,
    convertersRef,
    getNewSelectedPeak,
    selectedPeakNum,
    enablePeakContext,
  });

  const peakContextConfig = {
    ref: peakContextRef,
    selected: selectedPeakNum,
    data: peakData,
  };

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
    enablePeakContext,
    parentId,
  };

  const getData = usePlotDataExtractor(plotlyObj?.el);

  useEffect(() => {
    if (plotlyObj?.el) {
      plotExportRegistry.register(parentId, 'peaks', getData);
    }
    return () => plotExportRegistry.unregister(parentId, 'peaks');
  }, [plotlyObj, parentId, getData]);

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
          <Plot /* key={`plot-${parentTab}`} */
            ref={setPlotlyRef}
            onRelayout={(event) => {
              handleRelayout(event);
              captureRangeRelayout(event);
              onRelayoutConv(parentRef);
            }}
            onInitialized={handleInitialized}
            onAfterPlot={() =>{ 
              plotZoom.onAfterPlot();
            }}
            onHover={onHover}
            onUnhover={onUnhover}
            data={plotData}
            layout={layout}
            style={plotStyle}
            config={plotlyConfig} // must have for working split
          />

          <PlotContextMenus
            peak={peakContextConfig}
            plot={plotContextConfig}
            controls={contextControls}
            meta={contextMeta}
          />
        </>
      )}
    </div>
  );
}

export default PeakPlot;
