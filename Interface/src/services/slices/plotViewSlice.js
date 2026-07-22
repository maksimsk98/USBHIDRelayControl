// src/features/zoom/zoomSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {

};

const plotViewSlice = createSlice({
  name: 'plotView',
  initialState,
  reducers: {
    setZoomState(state, action) {
      const {
        layout, initiator, tabId, prevLayout,
      } = action.payload;
      if (!state[tabId]) {
        state[tabId] = {
          layout: null,
          updatedTabs: [],
          prevLayouts: [],
        };
      }
      state[tabId].layout = layout;
      state[tabId].updatedTabs = [initiator];

      if (prevLayout !== undefined) { // either {} or null as reset, undef means don't write
        state[tabId].prevLayouts.push(prevLayout);
      }
    },
    deleteMeasurement: (state, action) => {
      const tabId = action.payload;
      if (state[tabId]) {
        delete state[tabId];
      }
    },
    markUndo: (state, action) => {
      const tabId = action.payload;
      state[tabId].prevLayouts.pop();
    },
    clearHistory: (state, action) => {
      const tabId = action.payload;
      if (state?.[tabId]?.prevLayouts) {
        state[tabId].prevLayouts = [];
      }
    },
  },
});

export const plotViewActions = plotViewSlice.actions;
export default plotViewSlice.reducer;
