import { createSelector } from '@reduxjs/toolkit';
import {
  AUTOSAMPLER_AVAILABLE_STATES, AUTOSAMPLER_CONNECTED_STATES, AUTOSAMPLER_MODES, AUTOSAMPLER_STATES, EMPTY_ARRAY,
} from '../../../constants/constants';
import { filterValidProgramSteps } from '../../../utils/autoSampler';

export const selectAutosamplerState = (state) => state.autosamplerReducer.data.nodeState.autosamplerState;
export const selectIsAutosamplerConnected = createSelector(
  [selectAutosamplerState],
  (state) => AUTOSAMPLER_CONNECTED_STATES.includes(state),
);

export const selectIsAutosamplerAvailable = createSelector(
  [selectAutosamplerState],
  (state) => AUTOSAMPLER_AVAILABLE_STATES.includes(state),
);

export const selectIsAutosamplerBusy = createSelector(
  [selectAutosamplerState],
  (state) => state === AUTOSAMPLER_STATES.BUSY,
);

export const selectAutosamplerMethod = (state) => state.autosamplerReducer.data.generalParams.method;

export const selectWashParams = (state) => state.autosamplerReducer.data.wash.params;
export const selectIsWashOn = (state) => state.autosamplerReducer.data.wash.state.isOn;

export const selectSingleInjectionParams = (state) => state.autosamplerReducer.data.singleInjection.params;
export const selectIsSingleInjectionOn = (state) => state.autosamplerReducer.data.singleInjection.state.isOn;

export const selectAutoThermostatParams = (state) => state.autosamplerReducer.data.thermostat.params;
export const selectIsAutoThermostatOn = (state) => state.autosamplerReducer.data.thermostat.state.isOn;

export const selectIsAutoControlOn = (state) => state.autosamplerReducer.data.control.state.isOn;
export const selectAutoControlState = (state) => state.autosamplerReducer.data.control.state;
export const selectAutoControlParams = (state) => state.autosamplerReducer.data.control.params;
export const selectAutoControlProgram = (state) => state.autosamplerReducer.data.control.params.programSteps ?? EMPTY_ARRAY;

export const selectVialLabels = (state) => state.autosamplerReducer.data.loadedConfig.vialLabels ?? EMPTY_ARRAY;
export const selectVialCount = (state) => state.autosamplerReducer.data.generalParams.vialCount;

export const selectAutoMode = (state) => state.autosamplerReducer.data.nodeState.currentAutosamplerMode;

export const selectLocalAutoMode = createSelector(
  [selectIsWashOn, selectIsSingleInjectionOn, selectIsAutoControlOn],
  (isWash, isSingle, isControl) => {
    if (isWash) return AUTOSAMPLER_MODES.WASH;
    if (isControl) return AUTOSAMPLER_MODES.AUTOSAMPLER_PROGRAM;
    if (isSingle) return AUTOSAMPLER_MODES.SINGLE_INJECTION;

    return AUTOSAMPLER_MODES.NONE;
  },
);

export const selectIsAutoThermostatingSupported = (state) => state.autosamplerReducer.data
  .loadedConfig.isThermostatingSupported;

export const selectActiveAutoStep = (state) => state.autosamplerReducer.data
  .nodeState.autosamplerProgram.activeStep;

export const selectCurrentInjection = (state) => state.autosamplerReducer.data
  .nodeState.autosamplerProgram.currentInjection;

export const selectDisplayAutoProgram = createSelector(
  [selectAutoControlProgram, selectIsAutoControlOn],
  (allRows, isRunning) => {
    if (!isRunning) return allRows;
    return filterValidProgramSteps(allRows);
  },
);

export const selectFilteredAutoProgram = createSelector(
  [selectAutoControlProgram],
  (allRows) => filterValidProgramSteps(allRows),
);

export const selectAutoNodeTargetTemp = (state) => state.autosamplerReducer.data
  .nodeState.autosamplerThermostat.targetTemp;

export const selectAutoNodeCurrentTemp = (state) => state.autosamplerReducer.data
  .nodeState.autosamplerThermostat.currentTemp;

export const selectAutoConfig = (state) => state.autosamplerReducer.data.loadedConfig;

export const selectPreWashSolvents = createSelector(
  [selectAutoConfig],
  (config) => config.preWashSolvents,
);
export const selectPostWashSolvents = createSelector(
  [selectAutoConfig],
  (config) => config.postWashSolvents,
);

export const selectAutoControlSessionId = createSelector(
  [selectAutoControlState],
  (controlState) => controlState.sessionId,
);

export const selectAutosamplerFetchStatus = (state) => state.autosamplerReducer.fetchStatus;

export const selectAutosamplerFetchError = (state) => state.autosamplerReducer.fetchError;

export const selectIsAutosamplerLoading = createSelector(
  [selectAutosamplerFetchStatus],
  (status) => status === 'loading',
);
