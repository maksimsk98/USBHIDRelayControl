import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  chosenTemplate: null,
};

const defaultMisc = {
  thermostatTemp: null,
  averaging: 1,
  timeUnit: 'min',
  isWritingBaseline: false,
  signalParams: {
    isSignalAveraging: true,
    isCheckedCorrection: true,
    isCheckedDriftCompensation: true,
    isCheckedShift: true,
    standardDeviationInterval: 60,
    isSquishableInterval: false,
    customUserDeviationInterval: 60,
  },

  smoothingParams: {
    isSmoothingPulseChecked: true,
    isSmoothingAdaptiveChecked: true,
    isSmoothingCubicChecked: false,
    isSmoothingDoubleChecked: false,
    smoothingFactor: 1,
    smoothingWindow: 5,
    smoothingMinLevel: null,
    alternativeFilters: 'none',
    useDriftCompensation: false,
    driftFrom: null,
    driftTo: null,
  },

  peakIdParams: {
    useRelativeTimes: true,
    maxRelation: 15,
    searchWindow: 2,
  },

  peakAnnotationParams: {
    useAnnotations: true,
    orientation: 'vertical',
    namingMode: 'index'
  }
};

const nullTemplateMisc = {
  thermostatTemp: defaultMisc.thermostatTemp,
  averaging: defaultMisc.averaging,
};

/* eslint-disable no-param-reassign */
const chromaMiscSlice = createSlice({
  name: 'chromaMisc',
  initialState,
  reducers: {
    setTemplate: (state, action) => {
      const template = action.payload;
      state.chosenTemplate = template;
    },
    forceTemplate: (state, action) => {
      const { measurementId, template } = action.payload;
      const templateToForce = template || state.chosenTemplate || nullTemplateMisc;
      state[measurementId] = { ...state[measurementId], ...templateToForce }; // merging with default will switch to minutes breaking logic
    },
    addChroma: (state, action) => {
      const { id, chromaMiscData } = action.payload;
      state[id] = chromaMiscData
        ? { ...defaultMisc, ...chromaMiscData }
        : { ...defaultMisc, ...state.chosenTemplate };
    },
    setThermostatTemp: (state, action) => {
      const { id, newThermostatTemp } = action.payload;
      state[id].thermostatTemp = newThermostatTemp;
    },
    setAveraging: (state, action) => {
      const { id, newAveraging } = action.payload;
      state[id].averaging = newAveraging;
    },
    setTimeUnit: (state, action) => {
      const { id, newTimeUnit } = action.payload;
      state[id].timeUnit = newTimeUnit;
    },
    setIsWritingBaseline: (state, action) => {
      const { id, isWritingBaseline } = action.payload;
      state[id].isWritingBaseline = isWritingBaseline;
    },
    deleteMeasurement: (state, action) => {
      const measurementId = action.payload;
      if (state[measurementId]) {
        delete state[measurementId];
      }
    },
    updateSignalParams: (state, action) => {
      const { id, params } = action.payload;
      state[id].signalParams = {
        ...state[id].signalParams,
        ...params,
      };
    },
    updateSmoothingParams: (state, action) => {
      const { id, params } = action.payload;
      state[id].smoothingParams = {
        ...state[id].smoothingParams,
        ...params,
      };
    },
    updatePeakIdParams: (state, action) => {
      const { id, params } = action.payload;
      state[id].peakIdParams = {
        ...state[id].peakIdParams,
        ...params,
      };
    },
    
    setUsePeakAnnotations: (state, action) => {
      const { id, value } = action.payload;
      state[id].peakAnnotationParams.useAnnotations = value;
    },

    setPeakAnnotationOrientation: (state, action) => {
      const { id, value } = action.payload;
      state[id].peakAnnotationParams.orientation = value;
    },

    setPeakAnnotationNamingMode: (state, action) => {
      const { id, value } = action.payload;
      state[id].peakAnnotationParams.namingMode = value;
    },
  },
});
/* eslint-enable no-param-reassign */

export default chromaMiscSlice.reducer;
export const chromaMiscActions = chromaMiscSlice.actions;
