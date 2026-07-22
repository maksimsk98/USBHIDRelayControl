import { isMatch, reject } from 'lodash';
import {
  DETECTOR_TYPE_DASH_MAP, LINE_DASHES, LINE_STYLES, PLOTLY_COLOR_ARR, PLOTLY_COLOR_MAP,
} from '../constants/constants';

export const getShiftedY = ({
  yArray, shiftBase, index = 1, mode = 'none', shiftCoef = 1,
}) => {
  if (!Array.isArray(yArray)) return [];

  switch (mode) {
    case 'none':
      return yArray;

    case '%':
      return yArray.map((orig) => orig + shiftBase * index * (shiftCoef * 0.01));

    case 'coord':
      return yArray.map((orig) => orig + shiftBase * index);

    default:
      console.warn(`Unknown shift mode: ${mode}`);
      return yArray;
  }
};

export function useLineStyleGenerator({
  selectedStyle = {},
  widths = {},
} = {}) {
  const {
    selectedWidth: defaultSelectedWidth = 2,
    defaultWidth: defaultLineWidth = 1,
  } = widths;

  const {
    color: selColor = PLOTLY_COLOR_MAP.red,
    dash: selDash = LINE_DASHES.longdashdot,
  } = selectedStyle;

  const RESERVED_LINE_STYLE = { color: selColor, dash: selDash };

  // Filter out the reserved style once
  const generalStyles = reject(LINE_STYLES, (style) => isMatch(style, RESERVED_LINE_STYLE));

  return function getLineStyle({
    index,
    selectedIndex = null,
    selectedWidth = defaultSelectedWidth,
    defaultWidth = defaultLineWidth,
    detectorType = null,
    isActive = false,
    extraLineProps = {},
  }) {
    if (index === selectedIndex || isActive) {
      return {
        ...(detectorType
          ? { color: selColor, dash: LINE_DASHES.longdashdot }
          : RESERVED_LINE_STYLE
        ),
        width: selectedWidth,
        ...extraLineProps,
      };
    }

    let style;
    const detectorSpecificDash = DETECTOR_TYPE_DASH_MAP[detectorType];
    if (detectorSpecificDash) {
      style = {
        color: PLOTLY_COLOR_ARR[index % PLOTLY_COLOR_ARR.length],
        dash: DETECTOR_TYPE_DASH_MAP[detectorType],
      };
    } else {
      style = generalStyles[index % generalStyles.length];
    }

    return {
      ...style,
      width: defaultWidth,
      ...extraLineProps,
    };
  };
}

export function createLogger(initiator, baseInitiator) {
  return {
    log: (...args) => {
      if (initiator === baseInitiator) console.log(...args);
    },
    warn: (...args) => {
      if (initiator === baseInitiator) console.warn(...args);
    },
    info: (...args) => {
      if (initiator === baseInitiator) console.info(...args);
    },
    groupCollapsed: (...args) => {
      if (initiator === baseInitiator) console.groupCollapsed(...args);
    },
    groupEnd: () => {
      if (initiator === baseInitiator) console.groupEnd();
    },
  };
}

export function extractVisiblePlotData(plotEl, options) {
  const {
    aoa = true,
    tsv = true,
    skipEmpty = true,
  } = options || {};

  if (!plotEl || !Array.isArray(plotEl.data)) {
    return {
      aoa: aoa ? [] : undefined,
      tsv: tsv ? '' : undefined,
    };
  }

  const traces = plotEl.data.filter((t) => {
    if (t.visible === false || t.visible === 'legendonly') return false;
    if (!Array.isArray(t.x) || !Array.isArray(t.y)) return false;
    if (t.x.length !== t.y.length) return false;
    if (skipEmpty && t.x.length === 0) return false;
    return true;
  });

  if (traces.length === 0) {
    return {
      aoa: aoa ? [] : undefined,
      tsv: tsv ? '' : undefined,
    };
  }

  // ---- Headers
  const headers = traces.flatMap((t) => {
    const name = t.name || t.customData?.type || 'trace';
    return [`${name} X`, `${name} Y`];
  });

  const max = Math.max(...traces.map((t) => t.x.length));

  // Optional results
  const aoaResult = aoa ? [headers] : null;
  const tsvRows = tsv ? [headers.join('\t')] : null;

  // ---- Row build
  for (let i = 0; i < max; i++) {
    const row = [];

    for (const t of traces) {
      row.push(t.x[i] ?? '', t.y[i] ?? '');
    }

    if (aoa) aoaResult.push(row);
    if (tsv) tsvRows.push(row.join('\t'));
  }

  return {
    aoa: aoa ? aoaResult : undefined,
    tsv: tsv ? tsvRows.join('\n') : undefined,
  };
}

export function mergeSignalAOAs(signalEntries) {
  // signalEntries = [ [initiator, extractorFn], ... ]

  // Extract individual AOAs
  const datasets = signalEntries.map(([initiator, extractor]) => {
    const { aoa } = extractor({ aoa: true });
    return { initiator, aoa };
  });

  // Determine maximum row count across all AOAs
  const maxRows = Math.max(...datasets.map((ds) => ds.aoa.length));

  const merged = [];

  for (let r = 0; r < maxRows; r++) {
    const row = [];

    for (const ds of datasets) {
      const rowData = ds.aoa[r] ?? []; // may be shorter
      row.push(...rowData);
    }

    merged.push(row);
  }

  return merged;
}

export const findBounds = (plotData, config = {}) => {
    const {
      axis = 'y', // 'x' or 'y'
      ignoreTraces = ['Background'],
      defaults = { min: -50, max: 50 },
      paddingPercent = 0.05,
      fallbackToDefaults = true,
    } = config;

    if (!plotData || plotData.length === 0) {
      return [defaults.min, defaults.max];
    }
    
    let globalMin = Infinity;
    let globalMax = -Infinity;
    let hasValidData = false;
    
    plotData.forEach(trace => {
      // Skip ignored traces by name
      if (ignoreTraces.includes(trace.name)) return;
      
      // Skip traces with hoverinfo: 'skip'
      if (trace.hoverinfo === 'skip') return;
      
      const dataArray = trace[axis];
      if (!dataArray || dataArray.length === 0) return;
      
      const validData = dataArray.filter(v => v !== null && v !== undefined && !isNaN(v));
      if (validData.length === 0) return;
      
      const traceMin = Math.min(...validData);
      const traceMax = Math.max(...validData);
      
      globalMin = Math.min(globalMin, traceMin);
      globalMax = Math.max(globalMax, traceMax);
      hasValidData = true;
    });
    
    if (!hasValidData) {
      return fallbackToDefaults ? [defaults.min, defaults.max] : [0, 1];
    }
    
    // Add padding
    const range = globalMax - globalMin;
    const padding = range === 0 ? 1 : range * paddingPercent;
    
    return [globalMin - padding, globalMax + padding];
  }