import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  activeButton: null,
  fillChecked: false,
  drainChecked: false,
  fillVolume: 0,
  drainVolume: 0,
  supplyFlowRate: 1000,
  supplyStartFlowRate: 1000,
  supplyStartPressure: 2.0,
  hasSupplyRan: false,
};

const mainIsocratSlice = createSlice({
  name: 'mainIsocratForm',
  initialState,
  reducers: {
    setFormState: (state, action) => ({ ...state, ...action.payload }),
    resetFormState: () => initialState, // Reset to default state if needed
  },
});

export const mainIsocratActions = mainIsocratSlice.actions;
export default mainIsocratSlice.reducer;
