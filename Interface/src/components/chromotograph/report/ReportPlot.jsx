import React, {
  useState, useEffect, useRef, useMemo, useCallback,
} from 'react';

import { useSelector, useDispatch } from 'react-redux';
import { isThisTabMeasurementRunning, selectActiveSubTabByTab, selectActiveTab, selectBackgroundChroma, selectDoShowBackground, selectEffectiveDetectorType, selectIsWritingBaseLine, selectLastStepToIfNotWB, selectPeakAnnotationParams, selectPeaksById, selectPlotData, selectPlotView, selectPlotViewPrev, selectReportFreezePlots, selectStepsBorders, selectTimeUnit } from '../../../services/reduxImportDispatcher';
import { useFreezeForPrintLocal } from '../../../hooks/plotHooks/useFreezeForPrint';
import useRangeEndSec from '../../../hooks/useRangeEndSec';
import usePlotLayout from '../../../hooks/usePlotLayout';
import useHandleZoom from '../../../hooks/useHandleZoom';
import { useCustomHoverHandlers } from '../../../hooks/usePlotHoverHandler';
import { useConverters } from '../../../hooks/usePlotConverters';
import { usePanHandlers } from '../../../hooks/usePanHandlers';
import useCustomConfig from '../../../hooks/useCustomConfig';
import useIsContainerReady from '../../../hooks/useISContainerReady';
import useContextMenus from '../../../hooks/usePlotContextMenus';
import { usePlotDataExtractor } from '../../../hooks/usePlotDataExtractor';
import { DEFAULT_DRAG_MODE, DETECTOR_Y_LABELS, EMPTY_OBJECT } from '../../../constants/constants';
import useStatePlotRef from '../../../hooks/useStatePlotRef';
import useResizeObserver from '../../../hooks/usePlotResizeObserver';
import { plotExportRegistry } from '../../../utils/classes/PlotExportRegistry';
import { Plot } from '../../../utils/setupPlotly';
import PlotContextMenus from '../PlotContextMenus';
import { generatePeakAnnotations } from '../../../utils/peakUtils';
import usePlotScroll from '../../../hooks/plotHooks/usePlotScroll';
import { findBounds } from '../../../utils/plotUtils';
import usePlotZoomCompiler from '../../../hooks/plotHooks/usePlotZoomCompiler';


function ReportPlot({ parentId, parentTab }) {
  const initiator = parentTab;
  const [activeDragmode, setActiveDragmode] = useState(DEFAULT_DRAG_MODE);

  const parentRef = useRef(null); // Create a ref for the plot container
  const [plotlyObj, setPlotlyRef] = useStatePlotRef();

  const dispatch = useDispatch();

  const fetchedPlotData = useSelector((state) => selectPlotData(
    state,
    { tabId: parentId, pointType: 'calculatedChromatogram' },
  ));
  const peaksData = useSelector(state => selectPeaksById(state, parentId))
  const annotationsConfig = useSelector(state => selectPeakAnnotationParams(state, parentId))
    
  const timeUnit = useSelector((state) => selectTimeUnit(state, parentId));

  const plotView = useSelector((state) => selectPlotView(state, { parentId })) ?? EMPTY_OBJECT;
  const prevLayouts = useSelector((state) => selectPlotViewPrev(state, { parentId }));

  const isWritingBaseLine = useSelector((state) => selectIsWritingBaseLine(state));
  const lastStepBorder = useSelector((state) => selectLastStepToIfNotWB(state,  { tabId: parentId }));
  const stepBorders = useSelector((state) => selectStepsBorders(state, parentId));
  const activeTab = useSelector(selectActiveTab);
  const detectorType = useSelector((state) => selectEffectiveDetectorType(state, parentId ));

  const isMeasureRunning = useSelector((state) => isThisTabMeasurementRunning(state, parentId));

  const isPlotActive = (parentId === activeTab);

  const tabsToShowBackground = ['measurement'];
  const doShowBackground = useSelector((state) => selectDoShowBackground(state, parentId))
    && tabsToShowBackground.includes(parentTab)
    && !isWritingBaseLine;
  const backgroundChromatogram = useSelector((state) => selectBackgroundChroma(state, parentId));

  const tabReportPlotsMustFreeze = useSelector((state) => selectReportFreezePlots(state, parentId));
  const freeze = initiator === 'report' && tabReportPlotsMustFreeze;

  const { renderPlotOrImage } = useFreezeForPrintLocal(
    plotlyObj?.el,
    freeze,
    parentId,
    dispatch,
  );

  const [showMarkers, setShowMarkers] = useState(false);

  const annotations = useMemo(() => {  
    const borders = peaksData.map((peak) => ({
      center: peak.time,
      meta: {
        component: peak.component,
        concentrationCalc: peak.concentrationCalc,
        concentrationRef: peak.concentrationRef,
      },
    }));

    if (!fetchedPlotData?.x?.length || !fetchedPlotData?.y?.length || !borders?.length) return [];

    return generatePeakAnnotations(borders, fetchedPlotData, annotationsConfig);
  }, [fetchedPlotData, peaksData, annotationsConfig]);

  const plotData = useMemo(
    () => {
      const baseTrace = {
        type: showMarkers ? 'scattergl' : 'scatter',
        mode: showMarkers ? 'lines+markers' : 'lines',
        x: fetchedPlotData.x,
        y: fetchedPlotData.y,
        hovertemplate: '<extra></extra>',
        name: 'MeasuredChromatogram',

        line: { 
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
      };

      const bgTrace = doShowBackground
        ? [{
          type: showMarkers ? 'scattergl' : 'scatter',
          mode: showMarkers ? 'lines+markers' : 'lines',
          x: backgroundChromatogram.x,
          y: backgroundChromatogram.y,
          line: {
            color: 'rgba(0,0,0,0.3)',
            width: 1,
            dash: 'dot',
          },
          hoverinfo: 'skip',
          name: 'Background',
        }]
        : [];

      return [baseTrace, ...bgTrace];
    },
    [showMarkers, fetchedPlotData, doShowBackground, backgroundChromatogram],
  );

  useEffect(() => {
    setLayout((prev) => ({
      ...prev,
      shapes: stepBorders.map((border) => ({
        type: 'line',
        xref: 'x',
        yref: 'paper',
        x0: border,
        x1: border,
        y0: 0,
        y1: 1,
        line: {
          color: 'rgba(0, 0, 0, 0.5)', // semi-transparent black
          width: 1,
          dash: 'dot',
        },
      })),
      annotations
    }));
  }, [stepBorders, annotations]);

  const lastDataPointX = fetchedPlotData.x.at(-1);
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

  const getDataWithFreezeGuard = useCallback(() => {
    if (freeze) {
      alert('Plot is frozen, export unavailable');
      return null;
    }
    return getData();
  }, [freeze, getData]);

  useEffect(() => {
    if (plotlyObj?.el) {
      plotExportRegistry.register(parentId, initiator, getDataWithFreezeGuard);
    }
    return () => plotExportRegistry.unregister(parentId, initiator);
  }, [plotlyObj, parentId, getDataWithFreezeGuard]);

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

  // Once parent is sized and ready, render the Plot
  return (
    <div ref={parentRef} style={{ borderTop: '1px solid black', width: '100%', height: '100%' }}>
      {isPlotContReady && (
        <>
          {renderPlotOrImage(<Plot /* key={`plot-${parentTab}`} */
            ref={setPlotlyRef}
            onRelayout={(event) => {
              handleRelayout(event);
              onRelayoutConv(parentRef);
            }}
            onHover={onHover}
            onAfterPlot={() =>{ 
              plotZoom.onAfterPlot();
            }}
            onUnhover={onUnhover}
            data={plotData}
            layout={layout}
            /* useResizeHandler={true} */
            style={plotStyle}
            config={plotlyConfig} //  responsive: true must have for working split
          />)}

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

export default ReportPlot;
