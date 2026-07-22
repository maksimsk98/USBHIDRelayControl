import { createSlice } from '@reduxjs/toolkit';

// Initial state of the slice
const initialState = {
  activeTab: null,
  activeSubTabMap: {

  },
  closeHandlers: {}, // Store close handlers by tab ID
};

// Creating the slice
/* eslint-disable no-param-reassign */
const tabSlice = createSlice({
  name: 'tab',
  initialState,
  reducers: {
    setActiveSubTab: (state, action) => {
      const { tabId, subTab } = action.payload;
      state.activeSubTabMap[tabId] = subTab;
    },
    setActiveTab: (state, action) => {
      state.activeTab = action.payload;
    },
    checkAndNullActiveTab: (state, action) => {
      const closedTabId = action.payload;
      if (state.activeTab === closedTabId) {
        state.activeTab = null;
        state.activeSubTab = null;
        /* console.log("checked and nulled") */
      }
    },
    registerCloseHandler: (state, action) => {
      const { tabId, handler } = action.payload;
      state.closeHandlers[tabId] = handler;
    },
    unregisterCloseHandler: (state, action) => {
      const tabId = action.payload;
      delete state.closeHandlers[tabId];
    },
  },
});
/* eslint-disable no-param-reassign */

export const tabActions = tabSlice.actions;
export default tabSlice.reducer;
