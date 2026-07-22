import { createSlice } from '@reduxjs/toolkit';
import _ from 'lodash';
import { getExtraKeys } from '../../utils/validation';

const defaultState = {
  pumpMode: 'none',
  activeStage: null,
  isocratProgram: {
    flowRate: 200,
    startFlowRate: 1000,
    startPressure: 2.0,
    conditioningTime: 2,
    isAutoFill: true,
    isContinuousSupply: false,
    startVolume: 0,
    isocratVolume: 0,
    gradientVolume: 0,
    fillFlowRate: 0,
  },
  gradientProgram: {
    startFlowRate: 2000,
    startVolume: null,
    startPressure: 2,
    conditioningTime: 2,
    isAutoFill: true,
    restartAfterStop: true,
    fillFlowRate: 0,
    steps: [],
  },
};

const initialState = {
  chosenTemplate: null,
  generalParams: {
    automaticReleasing: true,
    maxPressureDischarge: 8,
    maxPressureWork: 300,
    minPressureWork: 0,
    releasingFlowRate: 1000,
  },
};

/* eslint-disable no-param-reassign */
const PumpProgramSlice = createSlice({
  name: 'pumpProgramModal',
  initialState,
  reducers: {
    setTemplate: (state, action) => {
      const template = action.payload;
      state.chosenTemplate = template;
    },
    addChroma: (state, action) => {
      const { id: chromoId, pumpProgramData } = action.payload;

      // pumpProgram has nested structure so have to deep merge
      const pumpState = pumpProgramData
        ? _.merge({}, defaultState, pumpProgramData)
        : _.merge({}, defaultState, state.chosenTemplate);

      const extraKeys = getExtraKeys(pumpProgramData || state.chosenTemplate, defaultState);

      if (extraKeys.length > 0) {
        console.error('EXTRA KEYS IN METHOD:', extraKeys);
      }

      state[chromoId] = pumpState;
    },
    forceTemplate: (state, action) => {
      const { measurementId, template } = action.payload;
      const templateToForce = template || state.chosenTemplate;

      state[measurementId] = { ...defaultState, ...templateToForce };
    },
    updateIsocratModalState: (state, action) => {
      const { chromoId, params } = action.payload;
      if (!state[chromoId]?.isocratProgram) {
        state[chromoId] = {};
        console.warn(`no isocrat program for ${chromoId}`);
      }
      state[chromoId].isocratProgram = { ...state[chromoId].isocratProgram, ...params };
    },
    updateGradientModalParams: (state, action) => {
      const { chromoId, params } = action.payload;
      state[chromoId].gradientProgram = {
        ...state[chromoId].gradientProgram,
        ...params,
      };
    },
    changePumpMode: (state, action) => {
      const { chromoId, mode } = action.payload;
      state[chromoId].pumpMode = mode;
    },
    deleteMeasurement: (state, action) => {
      const measurementId = action.payload;
      if (state[measurementId]) {
        delete state[measurementId];
      }
    },
    setGeneralParams: (state, action) => {
      const pumpParms = action.payload;
      state.generalParams = pumpParms;
    },
    changeActiveStage: (state, action) => {
      const { tabId, activeStage } = action.payload;
      state[tabId].activeStage = activeStage;
    },
  },
});
/* eslint-disable no-param-reassign */

export default PumpProgramSlice.reducer;
export const pumpProgramActions = PumpProgramSlice.actions;
