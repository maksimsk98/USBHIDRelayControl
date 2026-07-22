import { createSlice } from '@reduxjs/toolkit';
import _ from 'lodash';
import { DEFAULT_EXPECTED_PLOTS } from '../../constants/constants';

// Toggleable logging for this slice
const LOG_CHROMA = false;
function logChroma(...args) {
  if (LOG_CHROMA) console.log('[chromaPlotsSlice]', ...args);
}

const initialState = {};

export const pushCoordinates = (target, source) => {
  const isValid = Array.isArray(target?.x)
    && Array.isArray(target?.y)
    && Array.isArray(source?.x)
    && Array.isArray(source?.y);

  if (isValid) {
    target.x.push(...source.x);
    target.y.push(...source.y);
    return true;
  }

  return false;
};

export const setCoordinates = (target, source) => { // mirrors pushCoordinates but is destructive by design
  const isValid = Array.isArray(source?.x) && Array.isArray(source?.y);

  if (!isValid) return false;

  target.x = [...source.x];
  target.y = [...source.y];
  return true;
};


export const buildPlotPushMap = (state, plotsData, handler) => ({
  measuredChromatogram: () => handler(state.active.measuredChromatogram, plotsData.measuredChromatogram),
  backgroundChromatogram: () => pushCoordinates(state.background.measuredChromatogram, plotsData.backgroundChromatogram),
  calculatedChromatogram: () => handler(state.active.calculatedChromatogram, plotsData.calculatedChromatogram),
  signalPhoto: () => handler(state.active.signalPhoto, plotsData.signalPhoto),
  signalRef: () => handler(state.active.signalRef, plotsData.signalRef),
  flowRateA1Points: () => handler(state.active.flowRateA1Points, plotsData.flowRateA1Points),
  flowRateA2Points: () => handler(state.active.flowRateA2Points, plotsData.flowRateA2Points),
  flowRateB1Points: () => handler(state.active.flowRateB1Points, plotsData.flowRateB1Points),
  flowRateB2Points: () => handler(state.active.flowRateB2Points, plotsData.flowRateB2Points),

  pressureA1Points: () => handler(state.active.pressureA1Points, plotsData.pressureA1Points),
  pressureA2Points: () => handler(state.active.pressureA2Points, plotsData.pressureA2Points),
  pressureB1Points: () => handler(state.active.pressureB1Points, plotsData.pressureB1Points),
  pressureB2Points: () => handler(state.active.pressureB2Points, plotsData.pressureB2Points),

  columnTemp: () => handler(state.active.columnTemp, plotsData.columnTemp),
  roomTemp: () => handler(state.active.roomTemp, plotsData.roomTemp),
});

export const applyExpectedPlots = ({
  stateForId,
  plotsData,
  expectedPlots = [],
  handler = pushCoordinates,
  logMissing = true,
}) => {
  const pushMap = buildPlotPushMap(stateForId, plotsData, handler);

  for (const key of expectedPlots) {
    const pushFn = pushMap[key];

    if (!pushFn) {
      if (logMissing) {
        console.warn(`Missing push function for expected plot "${key}"`);
      }
      continue;
    }

    const success = pushFn();
    if (!success && logMissing) {
      console.warn(`Failed to push data for expected plot "${key}"`);
    }
  }
};

const initializeState = () => ({
  revision: 0,
  active: {
    measuredChromatogram: { x: [], y: [] },
    calculatedChromatogram: { x: [], y: [] },
    signalPhoto: { x: [], y: [] },
    signalRef: { x: [], y: [] },
    flowRateA1Points: { x: [], y: [] },
    flowRateA2Points: { x: [], y: [] },
    flowRateB1Points: { x: [], y: [] },
    flowRateB2Points: { x: [], y: [] },
    pressureA1Points: { x: [], y: [] },
    pressureA2Points: { x: [], y: [] },
    pressureB1Points: { x: [], y: [] },
    pressureB2Points: { x: [], y: [] },
    columnTemp: { x: [], y: [] },
    roomTemp: { x: [], y: [] },
  },
  background: {
    measuredChromatogram: { x: [], y: [] },
  },
  chromaPlotsTable: {
    photoParams: {
      absMSD: null,
      range: null,
      relMSD: null,
      signal: null,
    },
    referenceParams: {
      absMSD: null,
      range: null,
      relMSD: null,
      signal: null,
    },
    mainParams: {
      absMSD: null,
      range: null,
      relMSD: null,
      signal: null,
    },
  },
  displayOptions: {
    showBackground: false,
  },
}
);

function ensureEntry(state, parentId) {
  if (!state[parentId]) {
    state[parentId] = initializeState();
  }
  return state[parentId];
}

function bumpFileRevision(entry) {
  entry.revision += 1;
}

/* eslint-disable no-param-reassign */
const chromaPlotsSlice = createSlice({
  name: 'chromaPlots',
  initialState,
  reducers: {
    appendPlotsAndAddTable: (state, action) => {
      logChroma('appendPlotsAndAddTable', action.payload);
      const { id: parentId, plotsData, expectedPlots = DEFAULT_EXPECTED_PLOTS } = action.payload;
      const {
        photoParams = {},
        referenceParams = {},
        mainParams = {},
      } = plotsData;
      const entry = ensureEntry(state, parentId);

      applyExpectedPlots({
        stateForId: state[parentId],
        plotsData,
        expectedPlots,
        handler: pushCoordinates,
        logMissing: true,
      });

      state[parentId].chromaPlotsTable.photoParams = { ...photoParams };
      state[parentId].chromaPlotsTable.referenceParams = { ...referenceParams };
      state[parentId].chromaPlotsTable.mainParams = { ...mainParams };

      bumpFileRevision(entry);
    },

    setPlotsAndAddTable: (state, action) => {
      logChroma('setPlotsAndAddTable', action.payload);

      const { id: parentId, plotsData, expectedPlots = DEFAULT_EXPECTED_PLOTS } = action.payload;
      const {
        photoParams = {},
        referenceParams = {},
        mainParams = {},
      } = plotsData;

      const entry = ensureEntry(state, parentId);

      // hard reset plots only
      Object.values(entry.active).forEach(plot => {
        plot.x = [];
        plot.y = [];
      });
      Object.values(entry.background).forEach(plot => {
        plot.x = [];
        plot.y = [];
      });

      // reuse same mapping, but SET instead of PUSH
      applyExpectedPlots({
        stateForId: entry,
        plotsData,
        expectedPlots,
        op: setCoordinates,
      });

      entry.chromaPlotsTable.photoParams = { ...photoParams };
      entry.chromaPlotsTable.referenceParams = { ...referenceParams };
      entry.chromaPlotsTable.mainParams = { ...mainParams };

      bumpFileRevision(entry);
    },

    updatePlotTable: (state, action) => {
      logChroma('updatePlotTable', action.payload);
      const { parentId, plotTable: { photoParams = {}, referenceParams = {}, mainParams = {} } = {} } = action.payload ?? {};
      const entry = ensureEntry(state, parentId);

      state[parentId].chromaPlotsTable.photoParams = { ...photoParams };
      state[parentId].chromaPlotsTable.referenceParams = { ...referenceParams };
      state[parentId].chromaPlotsTable.mainParams = { ...mainParams };

      bumpFileRevision(entry);
    },
    appendPlotPointsData: (state, action) => {
      logChroma('appendPlotPointsData', action.payload);
      const {
        parentId, newPoints, plotType, plotState = 'active',
      } = action.payload;

      const entry = ensureEntry(state, parentId);

      pushCoordinates(state[parentId][plotState][plotType], newPoints);

      bumpFileRevision(entry);
    },
    updateSignalsPlots: (state, action) => {
      logChroma('updateSignalsPlots', action.payload);
      const {
        thermostatData,
        pumpsData,
        parentId,
      } = action.payload;

      const entry = ensureEntry(state, parentId);

      // here i have to take out only points filtering status out
      const dataMappings = [ // we don't add detector plots from status anymore
        { data: thermostatData, keys: ['columnTemp', 'roomTemp'] },
      ];

      dataMappings.forEach(({ data, keys }) => {
        keys.forEach((key) => {
          pushCoordinates(state[parentId].active[key], data[key]);
        });
      });

      const pumpMappings = [
        { pump: pumpsData.A1, flowRateKey: 'flowRateA1Points', pressureKey: 'pressureA1Points' },
        { pump: pumpsData.A2, flowRateKey: 'flowRateA2Points', pressureKey: 'pressureA2Points' },
        { pump: pumpsData.B1, flowRateKey: 'flowRateB1Points', pressureKey: 'pressureB1Points' },
        { pump: pumpsData.B2, flowRateKey: 'flowRateB2Points', pressureKey: 'pressureB2Points' },
      ];

      pumpMappings.forEach(({ pump, flowRateKey, pressureKey }) => {
        pushCoordinates(state[parentId].active[flowRateKey], pump.flowRate);
        pushCoordinates(state[parentId].active[pressureKey], pump.pressure);
      });

      bumpFileRevision(entry);
    },
    clearAllPlotsData: (state, action) => {
      logChroma('clearAllPlotsData', action.payload);
      const { parentId, preservePaths = [] } = action.payload;

      const fresh = initializeState();

      const nextState = _.cloneDeep(fresh);

      preservePaths.forEach((path) => {
        const preserved = _.get(state[parentId], path);
        if (preserved !== undefined) {
          _.set(nextState, path, preserved);
        }
      });

      state[parentId] = nextState;

      bumpFileRevision(state[parentId]);
    },
    clearPlot: (state, action) => {
      logChroma('clearPlot', action.payload);
      const { parentId, plotType } = action.payload;

      if (state[parentId] && state[parentId].active[plotType]) {
        state[parentId].active[plotType] = { x: [], y: [] };
        bumpFileRevision(state[parentId]);
      }
    },
    deleteMeasurement: (state, action) => {
      logChroma('deleteMeasurement', action.payload);
      const measurementId = action.payload;
      if (state[measurementId]) {
        delete state[measurementId];
      }
    },
    setMeasurementPoints: (state, action) => {
      logChroma('setMeasurementPoints', action.payload);
      const { parentId, measurementData } = action.payload;

      const entry = ensureEntry(state, parentId);

      const {
        measuredChromatogram,
        signalPhoto,
        signalRef,
      } = measurementData;
      pushCoordinates(state[parentId].active.measuredChromatogram, measuredChromatogram);
      pushCoordinates(state[parentId].active.signalPhoto, signalPhoto);
      pushCoordinates(state[parentId].active.signalRef, signalRef);

      bumpFileRevision(entry);
    },
    setDisplayOptions: (state, action) => {
      logChroma('setDisplayOptions', action.payload);
      const { parentId, displayOptions } = action.payload;

      if (!state[parentId]) {
        state[parentId] = initializeState();
      }

      state[parentId].displayOptions = {
        ...state[parentId].displayOptions,
        ...displayOptions,
      };
    },
  },
});
/* eslint-disable no-param-reassign */

export const chromaPlotsActions = chromaPlotsSlice.actions;
export default chromaPlotsSlice.reducer;
