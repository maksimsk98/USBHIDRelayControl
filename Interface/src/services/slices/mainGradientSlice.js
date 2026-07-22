import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  activeButton: null,
  isPumpAActive: true,
  isPumpBActive: true,
  isVolumeChecked: false,
  volume: null,
  fillFlowRate: 0,
  gradientProgram: null,
  activeStepPumpProgram: null,
};

const mainGradientSlice = createSlice({
  name: 'mainGradientForm',
  initialState,
  reducers: {
    setFormState: (state, action) => ({ ...state, ...action.payload }),
    resetFormState: () => initialState, // Reset to default state if needed
    setActiveStep: (state, action) => {
      const activeStepPumpProgram = action.payload;
      if (isFinite(activeStepPumpProgram)) {
        state.activeStepPumpProgram = activeStepPumpProgram;
      }
    },
  },
});

export const mainGradientActions = mainGradientSlice.actions;
export default mainGradientSlice.reducer;
