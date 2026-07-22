import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  data: {
    targetTemp: 25,
    dispersion: null,
    isThermostatOn: false,
  },
};

const thermostatSlice = createSlice({
  name: 'thermostat',
  initialState,
  reducers: {
    setTargetTemp: (state, action) => {
      const targetTemp = action.payload;
      if (targetTemp) {
        state.data.targetTemp = targetTemp;
      }
    },
    setDispersion: (state, action) => {
      const dispersion = action.payload;
      if (dispersion) {
        state.data.dispersion = dispersion;
      }
    },
    setIsThermostatIsOn: (state, action) => {
      const isThermostatOn = action.payload;
      state.data.isThermostatOn = isThermostatOn;
    },
  },
});

export const thermostatActions = thermostatSlice.actions;
export default thermostatSlice.reducer;
