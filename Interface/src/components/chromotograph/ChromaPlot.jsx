import React, {
  useState, useEffect, useRef, useMemo, useCallback,
} from 'react';

import { useSelector, useDispatch } from 'react-redux';
import { Plot } from '../../utils/setupPlotly';
import {
  selectIsWritingBaseLine,
  selectPlotData,
  selectLastStepToIfNotWB,
  selectTimeUnit,
  selectPlotView,
  selectActiveTab,
  selectActiveSubTabByTab,
  selectStepsBorders,
  isThisTabMeasurementRunning,
  selectEffectiveDetectorType,
  selectDoShowBackground,
  selectBackgroundChroma,
  selectPlotViewPrev,
  selectReportFreezePlots,
} from '../../services/reduxImportDispatcher';

import useHandleZoom from '../../hooks/useHandleZoom';
import useResizeObserver from '../../hooks/usePlotResizeObserver';
import usePlotLayout from '../../hooks/usePlotLayout';
import {
  DEFAULT_DRAG_MODE, DETECTOR_Y_LABELS, EMPTY_OBJECT,
} from '../../constants/constants';
import { useCustomHoverHandlers } from '../../hooks/usePlotHoverHandler';
import useRangeEndSec from '../../hooks/useRangeEndSec';
import useCustomConfig from '../../hooks/useCustomConfig';
import useIsContainerReady from '../../hooks/useISContainerReady';
import useStatePlotRef from '../../hooks/useStatePlotRef';
import useContextMenus from '../../hooks/usePlotContextMenus';
import PlotContextMenus from './PlotContextMenus';
import { useConverters } from '../../hooks/usePlotConverters';
import { usePanHandlers } from '../../hooks/usePanHandlers';
import { useFreezeForPrintLocal } from '../../hooks/plotHooks/useFreezeForPrint';
import { plotExportRegistry } from '../../utils/classes/PlotExportRegistry';
import { usePlotDataExtractor } from '../../hooks/usePlotDataExtractor';
import usePlotScroll from '../../hooks/plotHooks/usePlotScroll';
import { tryConvertTimeTo } from '../../utils/validation';
import { findBounds } from '../../utils/plotUtils';

import usePlotZoomCompiler from '../../hooks/plotHooks/usePlotZoomCompiler';

function ChromaPlot({ parentId, parentTab }) {
  const initiator = parentTab;
  const [activeDragmode, setActiveDragmode] = useState(DEFAULT_DRAG_MODE);

  const parentRef = useRef(null); // Create a ref for the plot container
  const [plotlyObj, setPlotlyRef] = useStatePlotRef();

  const dispatch = useDispatch();

  const fetchedPlotData = useSelector((state) => selectPlotData(
    state,
    { tabId: parentId, pointType: 'measuredChromatogram' },
  ));
  const timeUnit = useSelector((state) => selectTimeUnit(state, parentId));

  const plotView = useSelector((state) => selectPlotView(state, { parentId })) ?? EMPTY_OBJECT;
  const prevLayouts = useSelector((state) => selectPlotViewPrev(state, { parentId }));

  const isWritingBaseLine = useSelector((state) => selectIsWritingBaseLine(state));
  const lastStepBorder = useSelector((state) => selectLastStepToIfNotWB(state, { tabId: parentId }));
  const stepBorders = useSelector((state) => selectStepsBorders(state, parentId));
  const activeTab = useSelector(selectActiveTab);
  const activeSubTab = useSelector((state) => selectActiveSubTabByTab(state, activeTab));
  const detectorType = useSelector((state) => selectEffectiveDetectorType(state, parentId ));

  const isMeasureRunning = useSelector((state) => isThisTabMeasurementRunning(state, parentId));

  const isPlotActive = (parentId === activeTab && parentTab === activeSubTab);

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
    }));
  }, [stepBorders]);

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
            onAfterPlot={() =>{ 
              plotZoom.onAfterPlot();
            }}
            onHover={onHover}
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

export default ChromaPlot;
