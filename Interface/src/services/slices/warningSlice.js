import { createSlice } from '@reduxjs/toolkit';

const initialState = {}; // warnings per tab ID

const warningsSlice = createSlice({
  name: 'warnings',
  initialState,
  reducers: {
    setWarning: (state, action) => {
      const { tabId, warningType } = action.payload;
      if (!state[tabId]) {
        state[tabId] = []; // Store as an array
      }
      if (!state[tabId].includes(warningType)) {
        state[tabId].push(warningType); // Avoid duplicate warnings
      }
    },
    clearWarning: (state, action) => {
      const { tabId, warningType } = action.payload;
      if (state[tabId]) {
        state[tabId] = state[tabId].filter((warning) => warning !== warningType);
        if (state[tabId].length === 0) {
          delete state[tabId]; // Remove tab entry if no warnings left
        }
      }
    },
    clearWarningsForTab: (state, action) => {
      const { tabId } = action.payload;
      delete state[tabId]; // Remove all warnings for a tab
    },
  },
});

export const warningActions = warningsSlice.actions;
export default warningsSlice.reducer;
