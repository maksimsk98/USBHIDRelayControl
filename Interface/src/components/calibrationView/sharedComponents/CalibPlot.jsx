import React, {
  useState, useEffect, useRef, useMemo,
} from 'react';

import { useSelector, useDispatch } from 'react-redux';
import { Plot } from '../../../utils/setupPlotly';

import useResizeObserver from '../../../hooks/usePlotResizeObserver';

import {
  selectActiveSubTabByTab, selectActiveTab, selectCalibPointsForDisplay, selectFittedCurveByTabId, selectPlotView, selectPlotViewPrev,
} from '../../../services/reduxImportDispatcher';
import { DEFAULT_DRAG_MODE, EMPTY_OBJECT, TAB_TYPES } from '../../../constants/constants';
import useCustomConfig from '../../../hooks/useCustomConfig';
import useHandleZoom from '../../../hooks/useHandleZoom';
import PlotContextMenus from '../../chromotograph/PlotContextMenus';
import useContextMenus from '../../../hooks/usePlotContextMenus';
import { usePlotDataExtractor } from '../../../hooks/usePlotDataExtractor';
import { plotExportRegistry } from '../../../utils/classes/PlotExportRegistry';
import { findBounds } from '../../../utils/plotUtils';
import usePlotZoomCompiler from '../../../hooks/plotHooks/usePlotZoomCompiler';

function CalibPlot({ parentId, parentSubTab }) {
  const dispatch = useDispatch();
  const plotRef = useRef(null);

  const [activeDragmode, setActiveDragmode] = useState(DEFAULT_DRAG_MODE);

  const activeTab = useSelector(selectActiveTab);
  const isPlotActive = (parentId === activeTab);

  const plotView = useSelector((state) => selectPlotView(state, { parentId })) ?? EMPTY_OBJECT;
  const prevLayouts = useSelector((state) => selectPlotViewPrev(state, { parentId }));

  const { x: lineX, y: lineY } = useSelector((state) => selectFittedCurveByTabId(state, parentId));
  const { active: activePoints, disabled: disabledPoints } = useSelector((state) => selectCalibPointsForDisplay(state, parentId));

  const markerTraces = useMemo(() => {
    const traces = [];

    const { x: activeX, y: activeY } = activePoints;
    const { x: disabledX, y: disabledY } = disabledPoints;

    if (activeX.length && activeY.length) {
      traces.push({
        mode: 'markers',
        x: activeX,
        y: activeY,
        marker: { color: 'green', size: 6 },
      });
    }

    if (disabledX.length && disabledY.length) {
      traces.push({
        mode: 'markers',
        x: disabledX,
        y: disabledY,
        marker: { color: 'red', size: 6, symbol: 'cross' },
      });
    }

    return traces;
  }, [activePoints, disabledPoints]);

  useEffect(() => {
    setPlotData([
      {
        mode: 'lines',
        x: lineX,
        y: lineY,
      },
      ...markerTraces,
    ]);
  }, [lineX, lineY, markerTraces]);

  const [plotData, setPlotData] = useState([]);

  const [layout, setLayout] = useState({
    autosize: true,
    margin: {
      t: 10,
      pad: 0,
    },
    xaxis: {
      title: {
        text: 'Относительная концентрация',
      },
      showline: true,
      zeroline: false,
      minallowed: 0,
      nticks: 10,
      ticks: 'outside',
    },
    yaxis: {
      title: {
        text: 'Относительная площадь пика',
      },
      showline: true,
      zeroline: false,
      nticks: 10,
      ticks: 'outside',
    },
    showlegend: false,
  });

  const { handleRelayout } = useHandleZoom(
    parentId, 
    parentSubTab, 
    plotView.layout, 
    setLayout, 
    null, 
    setActiveDragmode, 
    null,
    { minZoomForAdjust: 0.1}
  );

  useResizeObserver(plotRef.current, isPlotActive);

  const { plotlyConfig, buttons: { resetButton, prevLayoutButton } } = useCustomConfig(
    {
      dispatch,
      parentId,
      plotElem: plotRef.current?.el,
      layout,
      rangeEndSecX: null,
      config: {
        customResetConfig: { isUsed: false, hasOriginalLogic: true, resetHandler: { needsParsing: false, recalcTicks: false } },
        buttonsToRemove: ['lasso2d', 'select2d'],
      },
      prevLayouts,
    },
  );

  const {
    setOpenMenu,
    openMenu,
    menuAnchorPoint,
    plotContextRef,
  } = useContextMenus({
    plotElem: plotRef.current?.el,
  });

  const plotContextConfig = {
    plotElem: plotRef.current?.el,
    ref: plotContextRef,
    resetButton,
    prevLayouts,
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

  const getData = usePlotDataExtractor(plotRef?.current?.el);

  useEffect(() => {
    const plotId = TAB_TYPES.CALIBRATION;
    if (plotRef?.current?.el) {
      plotExportRegistry.register(parentId, plotId, getData);
    }
    return () => plotExportRegistry.unregister(parentId, plotId);
  }, [parentId, getData]); // ref in deps might be bad

  const yBounds = useMemo(() => findBounds(plotData, {
    axis: 'y',
    ignoreTraces: ['Background'],
    defaults: { min: -50, max: 50 },
    paddingPercent: 0.05,
  }), [plotData]);

  const xBounds = useMemo(() => findBounds(plotData, {
    axis: 'x',
    ignoreTraces: ['Background'],
    defaults: { min: -50, max: 50 },
    paddingPercent: 0,
  }), [plotData]);

  // Single memo for bounds
  const bounds = useMemo(() => ({
    x: xBounds,
    y: yBounds
  }), [xBounds, yBounds]);

  const plotZoom = usePlotZoomCompiler(plotRef?.current, bounds, {
    enabled: isPlotActive,
    scrollSpeed: 0.5,
    axis: 'both',
  });

  return (
    <div style={{ borderTop: '1px solid black', width: '100%', height: '100%' }}>
      <Plot /* key={`plot-${parentTab}`} */
        ref={plotRef}
        onRelayout={(event) => handleRelayout(event, {
          needsParsing: true,
          recalcTicks: false,
        })}
        onAfterPlot={() =>{ 
          plotZoom.onAfterPlot();
        }}
        onInitialized={(figure) => {
          plotRef.current.resizeHandler();
        }}
        data={plotData}
        layout={layout}
        /* useResizeHandler={true} */
        style={{ width: '100%', height: '100%' }}
        config={plotlyConfig}
      />

      <PlotContextMenus
        plot={plotContextConfig}
        controls={contextControls}
        meta={contextMeta}
      />
    </div>
  );
}

export default CalibPlot;
