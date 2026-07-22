import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  chosenTemplate: null,
};

const defaultPassport = {
  sampleName: '',
  extendedName: '',
  /* calibration: false, */ // redumentary, since 11.2025
  volume: 0,
  dilution: 0,
  columnNum: '',
  sorbent: '',
  particleSize: 0,
  diameter: 0,
  length: 0,
  precolumn: false,
  eluentA: '',
  eluentB: '',
  flow: 0,
  pressure: 0,
  temperature: 0,
  comment: '',
};

/* eslint-disable no-param-reassign */
const passportSlice = createSlice({
  name: 'passport',
  initialState,
  reducers: {
    setTemplate: (state, action) => {
      const template = action.payload;
      state.chosenTemplate = template;
    },
    forceTemplate: (state, action) => {
      const { measurementId, template } = action.payload;
      const templateToForce = template || state.chosenTemplate;
      state[measurementId] = { ...defaultPassport, ...templateToForce };
    },
    addChroma: (state, action) => {
      const { measurementId, passportData, metaData } = action.payload;
      state[measurementId] = passportData
        ? { ...defaultPassport, ...passportData }
        : { ...defaultPassport, ...state.chosenTemplate };
      if (metaData) {
        state[measurementId].metaData = metaData;
      }
    },
    /*     updateAllFields: (state, action) => {
      const { measurementId, formData } = action.payload;
      state[measurementId] = formData;
    }, */
    updateField: (state, action) => {
      const { tabId, name, value } = action.payload;
      state[tabId][name] = value;
    },
    updateSampleName: (state, action) => {
      const { tabId, sampleName } = action.payload;
      state[tabId].sampleName = sampleName;
    },
    deleteMeasurement: (state, action) => {
      const measurementId = action.payload;
      if (state[measurementId]) {
        delete state[measurementId];
      }
    },
  },
});
/* eslint-disable no-param-reassign */

export default passportSlice.reducer;
export const passportActions = passportSlice.actions;
