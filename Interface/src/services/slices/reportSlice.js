import { createSlice } from '@reduxjs/toolkit';
import _ from 'lodash';

const initialGeneralCheckboxesState = {
  header: false,
  chromatograph: true,
  detector: true,
  pumps: true,
  thermostat: true,
  sample: true,
  comment: true,
  column: true,
  eluent: true,
  calibration: true,
  chromatogram: true,
  peakTable: true,
  gradTable: true,
  detectorProgram: true,
  pumpProgram: true,
  noiseEval: false,
};

const initialPeakTableState = {
  number: true,
  exitTime: true,
  componentName: true,
  concentration: false,
  /*   concentrationRef: true,
  concentrationCalc: true, */
  height: true,
  area: true,
  halfWidth: true,
  asymmetry: true,
  efficiency: true,
  resolution: true,
  relativeTime: true,
  peakValley: true,
};

const initialReportCalcParams = {
  noiseEval: {
    from: null,
    to: null,
  },
};

const initialState = {
  sourceIdOfReport: null,
};

const initialReportCalcs = {
  noiseEval: null,
};

const reportSlice = createSlice({
  name: 'report',
  initialState,
  reducers: {
    initializeCheckboxes: (state, action) => {
      const { id } = action.payload;
      if (!state[id]) {
        state[id] = {};
      }
      state[id].checkboxes = { ...initialGeneralCheckboxesState };
      state[id].peakTableParams = { ...initialPeakTableState };
      state[id].reportCalcParams = _.cloneDeep(initialReportCalcParams);
      state[id].reportCalcs = { ...initialReportCalcs };
    },
    updateReportChecks: (state, action) => {
      const { parentId, name, checked } = action.payload;
      if (state[parentId] && state[parentId].checkboxes) {
        state[parentId].checkboxes[name] = checked;
      }
    },
    updatePeakTableParam: (state, action) => {
      const { parentId, name, checked } = action.payload;
      if (state[parentId] && state[parentId].checkboxes) {
        state[parentId].peakTableParams[name] = checked;
      }
    },

    setReportChecks: (state, action) => {
      const { id, generalParams = {}, peakParams = {} } = action.payload;

      if (!state[id]) state[id] = {};

      state[id].checkboxes = {
        ...initialGeneralCheckboxesState,
        ...generalParams,
      };

      state[id].peakTableParams = {
        ...initialPeakTableState,
        ...peakParams,
      };
    },

    deleteMeasurement: (state, action) => {
      const measurementId = action.payload;
      if (state[measurementId]) {
        delete state[measurementId];
      }
    },

    setFreezePlots: (state, action) => {
      const { parentId, freeze } = action.payload;
      if (!state[parentId]) {
        state[parentId] = {};
      }
      state[parentId].freezePlots = freeze;
    },
    incrementFreezePending: (state, action) => {
      const { parentId } = action.payload;
      if (!state[parentId]) state[parentId] = {};
      state[parentId].freezePending = (state[parentId].freezePending ?? 0) + 1;
    },

    decrementFreezePending: (state, action) => {
      const { parentId } = action.payload;
      if (!state[parentId]) state[parentId] = {};
      state[parentId].freezePending = Math.max((state[parentId].freezePending ?? 1) - 1, 0);
    },

    setNoiseEvalParams: (state, action) => {
      const { parentId, params } = action.payload;

      if (!state[parentId]) state[parentId] = {};
      if (!state[parentId].reportCalcParams) {
        state[parentId].reportCalcParams = initialReportCalcParams;
      }

      state[parentId].reportCalcParams.noiseEval = {
        ...state[parentId].reportCalcParams.noiseEval,
        ...params,
      };
    },

    setReportCalcParams: (state, action) => {
      const { parentId, calcParams = {} } = action.payload;

      if (!state[parentId]) state[parentId] = {};

      const prev = state[parentId].reportCalcParams ?? {};

      state[parentId].reportCalcParams = _.merge(
        {}, // важно: новый объект
        initialReportCalcParams, // 1) defaults
        prev, // 2) старые данные
        calcParams, // 3) новые данные
      );
    },

    setNoiseEvalCalc: (state, action) => {
      const { parentId, noise } = action.payload;

      if (!state[parentId]) state[parentId] = {};
      if (!state[parentId].reportCalcs) {
        state[parentId].reportCalcs = initialReportCalcs;
      }

      state[parentId].reportCalcs.noiseEval = noise;
    },
    /*
    resetNoiseEvalCalc: (state, action) => {
      const { parentId } = action.payload;
      if (state[parentId]?.reportCalcs) {
        state[parentId].reportCalcs.noiseEval = null;
      }
    }, */

  },
});

export const reportActions = reportSlice.actions;

export default reportSlice.reducer;
