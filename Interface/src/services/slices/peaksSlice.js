import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  data: {},
  error: null,
};

export const DEFAULT_PEAK_PARAMS = {
  markStart: null,
  minHeight: null,
  minHalfWidth: 5,
};

function ensureEntry(state, tabId) {
  if (!state.data[tabId]) {
    state.data[tabId] = { revision: 0, isRedacting: false };
  }
  return state.data[tabId];
}

/* function bumpRevision(entry) {
  entry.revision += 1;
} */

const peaksSlice = createSlice({
  name: 'peaks',
  initialState,
  reducers: {
    setPeaksData: (state, action) => {
      const { tabId, peakTable } = action.payload;
      const entry = ensureEntry(state, tabId);
      state.data[tabId].peaks = peakTable;
    },
    setPeaksParams: (state, action) => {
      const { tabId, params } = action.payload;

      ensureEntry(state, tabId);

      // nullish are invalid should not override defaults
      const filteredParams = params
        ? Object.fromEntries(
          Object.entries(params).filter(([, value]) => value != null),
        )
        : null;

      const newState = {
        ...DEFAULT_PEAK_PARAMS,
        ...(state.data[tabId].params ?? {}),
        ...(filteredParams ?? {}),
      };

      state.data[tabId].params = newState;
    },
    setPeaksStatistics: (state, action) => {
      const { tabId, statistics } = action.payload;
      ensureEntry(state, tabId);
      state.data[tabId].statistics = statistics;
    },
    setPeaksMarkers: (state, action) => {
      const { tabId, markers } = action.payload;
      ensureEntry(state, tabId);
      state.data[tabId].markers = markers;
    },
    setPeakWorkMode: (state, action) => {
      const { tabId, workMode } = action.payload;
      ensureEntry(state, tabId);
      if (state.data[tabId].workMode === workMode) {
        state.data[tabId].workMode = null;
      } else {
        state.data[tabId].workMode = workMode;
      }
    },
    deleteMeasurement: (state, action) => {
      const tabId = action.payload;
      if (state.data[tabId]) {
        delete state.data[tabId];
      }
    },
    setHistoryMove: (state, action) => {
      const { tabId, historyMove } = action.payload;
      ensureEntry(state, tabId);
      state.data[tabId].historyMove = historyMove;
    },
    setCalibrationTable: (state, action) => {
      const { tabId, calibrationTable } = action.payload;
      ensureEntry(state, tabId);
      state.data[tabId].calibrationTable = calibrationTable ?? {};
    },
    resetPeaksRuntime: (state, action) => {
      const tabId = action.payload;

      const entry = state.data[tabId];
      if (!entry) return;

      // runtime / derived stuff — safe to drop
      delete entry.statistics;
      delete entry.markers;
      delete entry.historyMove;
      delete entry.calibrationTable;
      delete entry.peaks;

      // deliberately NOT touching:
      // entry.params
      // entry.workMode
    },
    togglePeaksRedacting: (state, action) => {
      const tabId = action.payload;
      const entry = ensureEntry(state, tabId);
      entry.isRedacting = !entry.isRedacting;
      console.log('toggle', tabId, entry.isRedacting);
    },

    setPeaksRedacting: (state, action) => {
      const { tabId, value } = action.payload;
      const entry = ensureEntry(state, tabId);
      entry.isRedacting = value;
      console.log('set', tabId, entry.isRedacting);
    },

  },
});

export const peaksActions = peaksSlice.actions;
export default peaksSlice.reducer;
