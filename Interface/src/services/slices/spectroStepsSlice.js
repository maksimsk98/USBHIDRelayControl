// services/slices/spectro/spectroStepsSlice.js
import { createSlice } from '@reduxjs/toolkit';

const defaultSpectroState = {
  steps: [
    {
      from: 200,
      to: 300,
      fixedWaveLength: 40,
      scanningType: 'sync',
      component: '',
    },
  ],
  params: {
    sensitivity: 'low',
    averagingFlashes: '(1)',
    averagingTime: '(0.01)',
    correction: 'off',
  },
  isRedacting: false,
  focusedStep: 0,
};

const initialState = {
  chosenTemplate: null,
  pending: {},
};

const spectroStepsSlice = createSlice({
  name: 'spectroSteps',
  initialState,
  reducers: {
    setTemplate: (state, action) => {
      const template = action.payload;
      state.chosenTemplate = template || null;
    },

    forceTemplate: (state, action) => {
      const { measurementId, template } = action.payload;

      const templateToForce = template || state.chosenTemplate || {};

      const stepsSource = templateToForce?.steps;
      const isStepSourceValid = Array.isArray(stepsSource) && stepsSource.length > 0;
      const steps = isStepSourceValid
        ? stepsSource.map((step) => ({ ...step }))
        : defaultSpectroState.steps.map((step) => ({ ...step })); // deep clone for safety

      const incomingParams = templateToForce.params ?? {};
      const filteredIncomingParams = Object.fromEntries(
        Object.entries(incomingParams).filter(([k, v]) => v != null),
      );

      state[measurementId] = {
        ...defaultSpectroState,
        steps,
        params: { ...defaultSpectroState.params, ...filteredIncomingParams },
      };
    },

    addSpectro: (state, action) => {
      const { id: spectroId, stepsData, paramsData } = action.payload;
      const templateSteps = stepsData ?? state.chosenTemplate?.steps;

      const isTemplateStepsValid = Array.isArray(templateSteps) && templateSteps.length > 0;

      const stepsSource = isTemplateStepsValid
        ? templateSteps
        : defaultSpectroState.steps;

      const steps = stepsSource.map((step) => ({ ...step })); // deep clone for safety

      const incomingParams = paramsData ?? state.chosenTemplate?.params ?? {};
      const filteredIncomingParams = Object.fromEntries(
        Object.entries(incomingParams).filter(([k, v]) => v != null), // allow nulls to be filtered too cause fields are not optional
      );

      const initState = {
        ...defaultSpectroState,
        steps,
        params: { ...defaultSpectroState.params, ...filteredIncomingParams },
      };
      state[spectroId] = initState;
    },

    setStepsTable: (state, action) => {
      const { tabId, stepsTable } = action.payload;
      if (stepsTable && state[tabId]) {
        state[tabId].steps = stepsTable;
      }
    },

    updateSpectroParam: (state, action) => {
      const { tabId, name, value } = action.payload;

      const entry = state[tabId];

      if (!entry) return console.warn('no entry');

      if (entry.params && Object.prototype.hasOwnProperty.call(entry.params, name)) {
        entry.params[name] = value;
      } else {
        console.warn(`[spectroStepsSlice] Tried to update unknown param "${name}" for tab ${tabId}`);
      }
    },

    addStep: (state, action) => {
      const spectroId = action.payload;
      const steps = state[spectroId]?.steps;
      if (!steps || steps.length === 0) return;

      const newStep = { ...defaultSpectroState.steps[0] };
      steps.push(newStep);
    },

    deleteStepByIndex: (state, action) => {
      const { tabId, index } = action.payload;
      const entry = state[tabId];
      if (!entry) return;

      const { steps } = entry;
      if (!steps || steps.length <= 1) return; // cannot remove last step

      if (index < 0 || index >= steps.length) return; // out of bounds

      // --- DELETE STEP ---
      steps.splice(index, 1);

      // --- FOCUS FIX (mirrors sibling logic but generalized) ---

      const { focusedStep } = entry;

      if (index === focusedStep || focusedStep >= steps.length) { // when deleting midlle if focused last, less steps, index decreases too
        const newFocusedStep = Math.max(0, Math.min(focusedStep - 1, steps.length - 1));
        state[tabId].focusedStep = newFocusedStep;
      }
    },
    deleteFocusedStep: (state, action) => {
      const tabId = action.payload;
      const entry = state[tabId];
      if (!entry) return;

      const index = entry.focusedStep;
      const { steps } = entry;
      if (!steps || steps.length <= 1) return; // prevent deleting last

      steps.splice(index, 1);

      // clamp focusedStep
      entry.focusedStep = Math.max(0, index - 1);
    },

    setReadacting: (state, action) => {
      const { tabId, value } = action.payload;
      if (state[tabId]) state[tabId].isRedacting = value;
    },

    setFocusedStep: (state, action) => {
      const { tabId, value } = action.payload;
      if (state[tabId]) state[tabId].focusedStep = value;
    },

    deleteEntry: (state, action) => {
      const tabId = action.payload;
      if (state[tabId]) {
        delete state[tabId];
      }
    },

    setSpectroPending(state, action) {
      const { tabId, operation, value } = action.payload;

      if (!state.pending[tabId]) {
        state.pending[tabId] = {};
      }

      state.pending[tabId][operation] = value;
    },

  },
});

export default spectroStepsSlice.reducer;
export const spectroStepsActions = spectroStepsSlice.actions;
