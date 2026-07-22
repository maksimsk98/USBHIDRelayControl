import { createSlice } from '@reduxjs/toolkit';
import { isString } from 'lodash';
import { AUTOSAMPLER_MODES, NODE_STATUSES } from '../../constants/constants';
import { getEmptyControlRow } from '../../utils/autoSampler';

const initialState = {
  data: {
    wash: {
      params: {
        solvent: null,
        volume: 1,
        volumeInternal: 1,
        washObject: 'waste',
        wasteVial: null,
      },
      state: {
        isOn: false,
        pendingStateChange: false,
      },
    },
    singleInjection: {
      params: {
        useIndividualMethod: false,
        method: 1,
        vialId: 1,
        preWashSolvent: null,
        postWashSolvent: null,
      },
      state: {
        isOn: false,
        pendingStateChange: false,
      },
    },
    thermostat: {
      params: {
        targetTemp: 4,
      },
      state: {
        isOn: false,
        pendingStateChange: false,
      },
    },
    control: {
      params: {
        programSteps: [],
      },
      state: {
        isOn: false,
        pendingStateChange: false,
        sessionId: null,
      },
    },
    generalParams: {
      method: 0,
      vialCount: null,
    },
    loadedConfig: {
      rowsCount: 0,
      samplesPerRow: 0,
      isThermostatingSupported: false,
      vialLabels: [],
      preWashSolvents: [],
      postWashSolvents: [],
      coolingReagents: [],
    },
    nodeState: {
      autosamplerState: NODE_STATUSES.NOT_CONNECTED,
      currentAutosamplerMode: AUTOSAMPLER_MODES.NONE,
      autosamplerProgram: {
        activeStep: null,
        currentInjection: null,
      },
      autosamplerThermostat: {
        isThermostatOn: false,
        targetTemp: null,
        currentTemp: null,
      },
    },
  },
  fetchStatus: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  fetchError: null,
};

const autosamplerSlice = createSlice({
  name: 'autosampler',
  initialState,
  reducers: {
    setClearSteps(state, action) {
      const vialCount = action.payload?.vialCount ?? state.data.generalParams.vialCount;
      if (!vialCount || vialCount <= 0) {
        console.warn('setClearSteps called with no valid vialCount');
        return;
      }
      state.data.control.params.programSteps = Array.from({ length: vialCount }, (_, vialIndex) => (getEmptyControlRow(vialIndex)));
    },
    setModuleParams(state, action) {
      const { mode, params } = action.payload;
      if (!state.data[mode]) return;
      state.data[mode].params = params;
    },
    setGeneralParams(state, action) {
      const { params } = action.payload;
      state.data.generalParams = { ...state.data.generalParams, ...params };
    },
    setLoadedConfig(state, action) {
      const { config } = action.payload;
      state.data.generalParams.vialCount = config.rowsCount * config.samplesPerRow;
      state.data.loadedConfig = config;
      if (config.isThermostatingSupported === false) {
        state.data.thermostat.state.isOn = false;
      }
    },
    changeModuleState(state, action) {
      const { mode, isOn } = action.payload;
      if (!state.data[mode] || !state.data[mode].state) return;

      if (typeof isOn === 'boolean') {
        state.data[mode].state.isOn = isOn;
      } else {
        state.data[mode].state.isOn = !state.data[mode].state.isOn;
      }
    },
    updateControlProgram(state, action) {
      const { programSteps } = action.payload;
      const currentSteps = state.data.control.params.programSteps || [];

      const updatedSteps = [...currentSteps];
      programSteps.forEach((step) => {
        console.log(step);
        const methodPresent = isString(step.method) && step.method !== '';
        const normilizedInjCount = step.injectionsCount
          ? step.injectionsCount
          : methodPresent
            ? 1
            : '';
        const normilizedStep = methodPresent
          ? {
            ...step,
            injectionsCount: normilizedInjCount,
          }
          : getEmptyControlRow(step.vialIndex);
        updatedSteps[step.vialIndex] = normilizedStep;
      });

      state.data.control.params.programSteps = updatedSteps;
    },
    setBaseState(state, action) {
      const {
        autosamplerState = NODE_STATUSES.NOT_CONNECTED,
      } = action.payload;

      state.data.nodeState.autosamplerState = autosamplerState;
    },
    setNodeAutosamplerMode(state, action) {
      const { currentAutosamplerMode } = action.payload;

      if (!state.data.wash.state.pendingStateChange) {
        state.data.wash.state.isOn = currentAutosamplerMode === AUTOSAMPLER_MODES.WASH;
      }
      if (!state.data.singleInjection.state.pendingStateChange) {
        state.data.singleInjection.state.isOn = currentAutosamplerMode === AUTOSAMPLER_MODES.SINGLE_INJECTION;
      }
      if (!state.data.control.state.pendingStateChange) {
        state.data.control.state.isOn = currentAutosamplerMode === AUTOSAMPLER_MODES.AUTOSAMPLER_PROGRAM;
      }

      state.data.nodeState.currentAutosamplerMode = currentAutosamplerMode;
    },
    setNodeThermostatState(state, action) {
      const { isThermostatOn } = action.payload;

      if (!state.data.thermostat.state.pendingStateChange) {
        state.data.thermostat.state.isOn = isThermostatOn;
      }

      state.data.nodeState.autosamplerThermostat.isThermostatOn = isThermostatOn;
    },
    setDetectorProgramState(state, action) {
      const { activeStep, currentInjection } = action.payload;

      state.data.nodeState.autosamplerProgram.activeStep = activeStep;
      state.data.nodeState.autosamplerProgram.currentInjection = currentInjection;
    },
    setThermostatState(state, action) {
      const { targetTemp, currentTemp } = action.payload;

      state.data.nodeState.autosamplerThermostat.targetTemp = targetTemp;
      state.data.nodeState.autosamplerThermostat.currentTemp = currentTemp;
    },
    setPendingStateChange(state, action) {
      const { mode, pending } = action.payload;
      if (!state.data[mode] || !state.data[mode].state) return;
      state.data[mode].state.pendingStateChange = pending;
    },
    solventDefaults(state, action) {
      const {
        preWashSolvent,
        postWashSolvent,
        solvent,
        wasteVial,
      } = action.payload;

      // wash
      state.data.wash.params.solvent = solvent;
      state.data.wash.params.wasteVial = wasteVial;

      // single injection
      state.data.singleInjection.params.preWashSolvent = preWashSolvent;
      state.data.singleInjection.params.postWashSolvent = postWashSolvent;
    },
    assignSessionId(state, action) {
      const { sessionId } = action.payload;
      if (sessionId == null) {
        console.warn('assignSessionId called with no sessionId');
        return;
      }
      state.data.control.state.sessionId = sessionId;
    },
    clearSessionId(state) {
      state.data.control.state.sessionId = null;
    },
    setFetchStatus(state, action) {
      state.fetchStatus = action.payload;
    },
    setFetchError(state, action) {
      state.fetchError = action.payload;
    },
  },

});

export const autosamplerActions = autosamplerSlice.actions;
export default autosamplerSlice.reducer;
