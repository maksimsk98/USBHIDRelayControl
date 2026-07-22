import { createSlice } from '@reduxjs/toolkit';

const pushCoordinates = (target, source) => {
  const valid = Array.isArray(target?.x)
    && Array.isArray(target?.y)
    && Array.isArray(source?.x)
    && Array.isArray(source?.y);

  if (valid) {
    target.x.push(...source.x);
    target.y.push(...source.y);
    return true;
  }
  return false;
};

const initializeState = () => ({
  measuredSpectroscopic: { x: [], y: [] },
  processedSpectroscopic: [],
});

const initialState = {};

/* eslint-disable no-param-reassign */
const spectroPlotsSlice = createSlice({
  name: 'spectroPlots',
  initialState,
  reducers: {
    appendSpectroPoints: (state, action) => {
      const { tabId, measuredSpectroscopic } = action.payload;
      /* console.log('setting new points', newPoints) */
      if (!state[tabId]) {
        state[tabId] = initializeState();
      }
      pushCoordinates(state[tabId].measuredSpectroscopic, measuredSpectroscopic);
    },

    setSpectroMeasuredData: (state, action) => {
      const { tabId, measuredSpectroscopic } = action.payload;

      if (!state[tabId]) {
        state[tabId] = initializeState();
      }

      // Completely replace measured data
      state[tabId].measuredSpectroscopic = {
        x: Array.isArray(measuredSpectroscopic.x)
          ? [...measuredSpectroscopic.x]
          : [],
        y: Array.isArray(measuredSpectroscopic.y)
          ? [...measuredSpectroscopic.y]
          : [],
      };
    },

    setSpectroProcessedData: (state, action) => {
      const { tabId, curves } = action.payload;
      if (!state[tabId]) {
        state[tabId] = initializeState();
      }

      state[tabId].processedSpectroscopic = curves;
    },
    deleteTraceByIndex: (state, action) => {
      const { tabId, traceIndex } = action.payload;
      if (state[tabId]) {
        state[tabId].processedSpectroscopic = state[tabId].processedSpectroscopic.filter(
          (_, index) => index !== traceIndex,
        );
      }
    },
    clearMeasuredSpectroData: (state, action) => {
      const { tabId } = action.payload;
      if (state[tabId]) {
        state[tabId].measuredSpectroscopic = { x: [], y: [] };
      }
    },
    clearAllSpectroData: (state, action) => {
      const { tabId } = action.payload;
      if (state[tabId]) {
        state[tabId].measuredSpectroscopic = { x: [], y: [] };
        state[tabId].processedSpectroscopic = [];
      }
    },
    deleteEntry: (state, action) => {
      const tabId = action.payload;
      if (state[tabId]) {
        delete state[tabId];
      }
    },
  },
});
/* eslint-enable no-param-reassign */

export const spectroPlotsActions = spectroPlotsSlice.actions;
export default spectroPlotsSlice.reducer;
