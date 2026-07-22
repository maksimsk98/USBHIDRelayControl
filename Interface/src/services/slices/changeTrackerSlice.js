import { createSlice } from '@reduxjs/toolkit';

const initialState = {};

const changeTrackerSlice = createSlice({
  name: 'changeTracker',
  initialState,
  reducers: {
    setHasAlteredData: (state, action) => {
      const id = action.payload;
      state[id] = { hasAlteredData: true };
    },
    resetHasAlteredData: (state, action) => {
      const id = action.payload;
      if (state[id]) {
        state[id].hasAlteredData = false;
      } else {
        console.warn('resetting uninitialized data');
      }
    },
    deleteMeasurement: (state, action) => {
      const measurementId = action.payload;
      if (state[measurementId]) {
        delete state[measurementId];
      }
    },
  },
});

export const changeTrackerActions = changeTrackerSlice.actions;
export default changeTrackerSlice.reducer;
