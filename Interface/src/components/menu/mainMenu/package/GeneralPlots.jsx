import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plot } from '../../../../utils/setupPlotly';
import {
  DEFAULT_DRAG_MODE, DEFAULT_Y_LABEL, EMPTY_OBJECT, TAB_TYPES, USE_PER_DETECTOR,
} from '../../../../constants/constants';
import usePlotLayout from '../../../../hooks/usePlotLayout';
import { usePlotStats } from '../../../../hooks/plotHooks/usePlotStats';
import { findBounds, getShiftedY, useLineStyleGenerator } from '../../../../utils/plotUtils';
import { useCustomHoverHandlers } from '../../../../hooks/usePlotHoverHandler';
import { generatePeakAnnotations } from '../../../../utils/peakUtils';
import {
  selectActiveTab,
  selectDetectorTypesByIds, selectFileNamesByIdsMap, selectPeaksByIds, selectPlotView, selectPlotViewPrev,
} from '../../../../services/reduxImportDispatcher';
import useResizeObserver from '../../../../hooks/usePlotResizeObserver';
import useCustomConfig from '../../../../hooks/useCustomConfig';
import useContextMenus from '../../../../hooks/usePlotContextMenus';
import PlotContextMenus from '../../../chromotograph/PlotContextMenus';
import useHandleZoom from '../../../../hooks/useHandleZoom';
import { trimSuffix } from '../../../../utils/fsAccess';
import { useConverters } from '../../../../hooks/usePlotConverters';
import { usePanHandlers } from '../../../../hooks/usePanHandlers';
import { usePlotDataExtractor } from '../../../../hooks/usePlotDataExtractor';
import { plotExportRegistry } from '../../../../utils/classes/PlotExportRegistry';
import usePlotZoomCompiler from '../../../../hooks/plotHooks/usePlotZoomCompiler';


function diffLayout(prev, next, path = '') {
  const changes = [];

  // если одно из значений null/undefined
  if (prev === next) return changes;

  // простые типы
  if (typeof prev !== 'object' || typeof next !== 'object' || prev == null || next == null) {
    changes.push({
      path,
      from: prev,
      to: next,
    });
    return changes;
  }

  // массивы
  if (Array.isArray(prev) || Array.isArray(next)) {
    if (!Array.isArray(prev) || !Array.isArray(next) || prev.length !== next.length) {
      changes.push({ path, from: prev, to: next });
      return changes;
    }
    for (let i = 0; i < prev.length; i++) {
      if (prev[i] !== next[i]) {
        changes.push({
          path: `${path}[${i}]`,
          from: prev[i],
          to: next[i],
        });
      }
    }
    return changes;
  }

  // объекты
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  for (const key of keys) {
    if (prev[key] === next[key]) continue;

    changes.push(
      ...diffLayout(prev[key], next[key], path ? `${path}.${key}` : key),
    );
  }

  return changes;
}

function GeneralPlots({
  packageId,
  plotsByIds,
  displayedMap,
  highlightedId = null,
  activeFileIndex = null,
  timeUnit,
  shift: { mode: shiftMode = '%', shiftX = 0, shiftY = 10 } = {},
  annotationsConfig,
  yLabelsForDetectors = [DEFAULT_Y_LABEL],
}) {
  /* // === BENCHMARK TRACKER ===
    const benchRef = useRef({
        start: 0,
        lastUpdate: 0,
        timer: null,
    });

    // вызываем это когда данные пришли из селектора
    const markDataArrived = () => {
        benchRef.current.start = performance.now();
        benchRef.current.lastUpdate = 0;
        console.log(
            "%c[BENCH] data arrived",
            "color: orange",
            benchRef.current.start
        );
    };

    useEffect(() => {
        // сработает когда селектор plotsByIds изменился
        markDataArrived();
    }, [plotsByIds]);

    // вызываем после каждого Plotly onUpdate
    const markPlotlyUpdate = () => {
        benchRef.current.lastUpdate = performance.now();

        console.log(
            "%c[BENCH] plotly onUpdate",
            "color: lightgreen",
            benchRef.current.lastUpdate - benchRef.current.start
        );

        // сбрасываем старый таймер «успокоения»
        if (benchRef.current.timer) clearTimeout(benchRef.current.timer);

        // ставим новый
        benchRef.current.timer = setTimeout(() => {
            const total =
                benchRef.current.lastUpdate - benchRef.current.start;

            console.log(
                "%c[BENCH DONE] Total latency:",
                "color: gold; font-weight: bold",
                total,
                "ms"
            );
        }, 5000); // 5 секунд тишины
    };

    // вызывается когда Plotly закончил ПОЛНУЮ перерисовку
    const markAfterplot = () => {
        const end = performance.now();
        console.log(
            "%c[BENCH] FINAL afterplot (full render complete)",
            "color: gold; font-weight: bold",
            end - benchRef.current.start,
            "ms"
        );
    };

    const renderStartRef = useRef(0);
    renderStartRef.current = performance.now();
    console.log("[PLOT] render start");
 */
  const dispatch = useDispatch();
  const plotRef = useRef(null);
  const parentRef = useRef(null); // Create a ref for the plot container
  const [activeDragmode, setActiveDragmode] = useState(DEFAULT_DRAG_MODE);

  const activeTab = useSelector(selectActiveTab);
  const isPlotActive = (packageId === activeTab);

  const plotView = useSelector((state) => selectPlotView(state, { parentId: packageId })) ?? EMPTY_OBJECT;
  const prevLayouts = useSelector((state) => selectPlotViewPrev(state, { parentId: packageId }));

  const yComposeLabel = yLabelsForDetectors.join(' / ');

  const { latestSecX, maxAbsY } = usePlotStats(plotsByIds);

  const shiftedYById = useMemo(() => {
    /*  const t0 = performance.now() */
    const result = {};
    Object.entries(plotsByIds).forEach(([fileId, plot], index) => {
      result[fileId] = getShiftedY({
        yArray: plot.y,
        shiftBase: maxAbsY,
        shiftCoef: shiftY,
        index,
        mode: shiftMode,
      });
    });
    /* console.log("[PLOT] shiftedYById", performance.now() - t0) */
    return result;
  }, [plotsByIds, maxAbsY, shiftY, shiftMode]);

  const fileIds = useMemo(() => Object.keys(plotsByIds), [plotsByIds]);
  const fileNames = useSelector((state) => selectFileNamesByIdsMap(state, fileIds));
  const detectorTypes = useSelector((state) => selectDetectorTypesByIds(state, fileIds));

  const peaksByFileId = useSelector((state) => selectPeaksByIds(state, fileIds));

  const { annotationsById, annotations } = useMemo(() => {
    /*  const t0 = performance.now() */
    const annotationsById = {};
    const annotations = [];

    for (const fileId of fileIds) {
      const plot = plotsByIds[fileId];
      const peakData = peaksByFileId[fileId];

      const borders = peakData.map((peak) => ({
        center: peak.time,
        meta: {
          component: peak.component,
          concentrationCalc: peak.concentrationCalc,
          concentrationRef: peak.concentrationRef,
        },
      }));

      if (!plot?.x?.length || !plot?.y?.length || !borders?.length) continue;

      const shiftedPlot = {
        ...plot,
        y: shiftedYById[fileId],
      };

      const result = generatePeakAnnotations(borders, shiftedPlot, annotationsConfig);
      annotationsById[fileId] = result;
      annotations.push(...result);
    }

    /* console.log("[PLOT] annotations generation", performance.now() - t0) */
    return { annotationsById, annotations };
  }, [plotsByIds, peaksByFileId, annotationsConfig, fileIds, shiftedYById]);

  const getLineStyle = useLineStyleGenerator();
  const stableGetLineStyle = useCallback(getLineStyle, []);

  const { onHover, onUnhover } = useCustomHoverHandlers(timeUnit);

  // Храним стабильные трейсы, которые Plotly не будет перерисовывать
  const traceRef = useRef([]);

  const plotData = useMemo(() => {
    /* console.log("[PLOT] before plotData generation"); */
    /* const t0 = performance.now(); */

    const entries = Object.entries(plotsByIds).reverse(); // FILO
    const next = new Array(entries.length);

    for (let i = 0; i < entries.length; i++) {
      const [id, plot] = entries[i];

      const origIndexOfFile = displayedMap[id];
      const isActive = id === highlightedId;

      const newTraceCore = {
        type: 'scattergl',
        mode: 'lines',
        x: plot.x,
        y: shiftedYById[id],
        line: stableGetLineStyle({
          index: origIndexOfFile,
          isActive,
          detectorType: USE_PER_DETECTOR && detectorTypes[origIndexOfFile],
          stylesToPass: {
            simplify: true,
          }
        }),

        name: trimSuffix(fileNames[id]),
        hovertemplate: '<extra></extra>',
      };

      const prevTrace = traceRef.current[i];

      // Если ID трейса тот же — обновляем только ЗНАЧИМЫЕ поля
      if (prevTrace && prevTrace.__id === id) {
        // Если x/y/line/name не поменялись — можно оставить старый объект
        const stable = prevTrace.x === newTraceCore.x
                && prevTrace.y === newTraceCore.y
                && prevTrace.name === newTraceCore.name
                && prevTrace.line === newTraceCore.line;

        if (stable) {
          next[i] = prevTrace; // оставить объект Plotly не перерисует
          continue;
        }

        // иначе — обновляем только изменённые поля
        next[i] = { ...prevTrace, ...newTraceCore };
        next[i].__id = id;
        continue;
      }

      // Новый трейс или сдвиг индекса/смена файла
      next[i] = { ...newTraceCore, __id: id };
    }

    traceRef.current = next;

    /* console.log("[PLOT] plotData optimized", performance.now() - t0); */
    return next;
  }, [
    plotsByIds,
    highlightedId,
    displayedMap,
    shiftedYById,
    detectorTypes,
    USE_PER_DETECTOR,
    fileNames,
    stableGetLineStyle,
    activeFileIndex,
  ]);

  const [layout, setLayout] = usePlotLayout(
    latestSecX,
    timeUnit,
    EMPTY_OBJECT,
    `Время измерения (${timeUnit === 'min' ? 'мин' : 'сек'})`,
    yComposeLabel,
    packageId,
    true, // this is useHover, disable for ram economy
  );

  useEffect(() => {
    /* console.log("[PLOT] after annotations", performance.now() - renderStartRef.current) */

    setLayout((prev) => {
      const result = {
        ...prev,
        annotations,
      };
      return result;
    });
  }, [annotations]);

  useResizeObserver(plotRef.current, true);

  const { handleRelayout } = useHandleZoom(
    packageId,
    null,
    plotView.layout,
    setLayout,
    latestSecX,
    setActiveDragmode,
    timeUnit,
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
    maxX: latestSecX,
    activeDragmode,
    setActiveDragmode,
  });

  const { plotlyConfig, buttons: { resetButton, prevLayoutButton } } = useCustomConfig({
    dispatch,
    parentId: packageId,
    plotElem: plotRef.current?.el ?? null,
    layout,
    rangeEndSecX: latestSecX,
    extraButtons: [panButton],
    config: {
      customResetConfig: { isUsed: true, hasOriginalLogic: true, resetHandler: { needsParsing: false, recalcTicks: false } },
      buttonsToRemove: ['lasso2d', 'select2d', 'pan2d'],
    },
    prevLayouts,
  });

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
    parentId: packageId,
  };
  /*
    useEffect(() => {
        console.log("%c[GeneralPlots] render", "color: red")
    })

    useEffect(()=>{
    console.log(">>> layout identity:", layout)
    }, [layout])

    useEffect(()=>{
    console.log(">>> config identity:", plotlyConfig)
    }, [plotlyConfig])

    useEffect(()=>{
    console.log(">>> data identity:", plotData)
    }, [plotData])

    const prevLayoutRef = useRef(null);

useEffect(() => {
    if (!prevLayoutRef.current) {
        prevLayoutRef.current = layout;
        return;
    }

    const prev = prevLayoutRef.current;
    const next = layout;

    const changes = [];

    function compare(a, b, path = "") {
        if (a === b) return;

        const typeA = typeof a;
        const typeB = typeof b;

        // simple or mismatched types
        if (
            a === null || b === null ||
            typeA !== "object" || typeB !== "object"
        ) {
            changes.push({ path, from: a, to: b });
            return;
        }

        // arrays
        if (Array.isArray(a) || Array.isArray(b)) {
            if (!Array.isArray(a) || !Array.isArray(b)) {
                changes.push({ path, from: a, to: b });
                return;
            }

            if (a.length !== b.length) {
                changes.push({
                    path: `${path}.length`,
                    from: a.length,
                    to: b.length
                });
            }

            for (let i = 0; i < Math.min(a.length, b.length); i++) {
                if (a[i] !== b[i]) {
                    changes.push({
                        path: `${path}[${i}]`,
                        from: a[i],
                        to: b[i]
                    });
                }
            }
            return;
        }

        // objects
        const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
        for (const key of keys) {
            compare(a[key], b[key], path ? `${path}.${key}` : key);
        }
    }

    compare(prev, next);

    if (changes.length > 0) {
        console.group(
            `[LAYOUT DIFF] ${changes.length} changes`
        );
        changes.forEach(ch =>
            console.log(`${ch.path}:`, ch.from, "→", ch.to)
        );
        console.groupEnd();
    }

    prevLayoutRef.current = next;
}, [layout]);
 */

  const getData = usePlotDataExtractor(plotRef?.current?.el);

  useEffect(() => {
    const plotId = TAB_TYPES.PACKAGE;
    if (plotRef?.current?.el) {
      plotExportRegistry.register(packageId, plotId, getData);
    }
    return () => plotExportRegistry.unregister(packageId, plotId);
  }, [packageId, getData]); // ref in deps might be bad

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
    <div ref={parentRef} style={{ width: '100%', height: '100%' }}>
      <Plot
        ref={plotRef}
        data={plotData}
        layout={layout}
        config={plotlyConfig}
        onHover={onHover}
        onUnhover={onUnhover}
        useResizeHandler={false}
        style={{ width: '100%', height: '100%' }}
/*                 onAfterPlot={markAfterplot} */
        onRelayout={(event) => {
          /* const t0 = performance.now() */
          handleRelayout(event);
          onRelayoutConv(parentRef);
          /* console.log("[PLOT] relayout cost", performance.now() - t0) */
        }}
        onAfterPlot={() =>{ 
          plotZoom.onAfterPlot();
        }}
      />

      <PlotContextMenus
        plot={plotContextConfig}
        controls={contextControls}
        meta={contextMeta}
      />

    </div>
  );
}

export default GeneralPlots;
