import { createAsyncThunk } from '@reduxjs/toolkit';
import { v1 as uuidv1 } from 'uuid';

import {
  autosamplerActions, measurementActions, selectActualGenMethods,
} from '../../reduxImportDispatcher';
import {
  selectAutoControlProgram, selectAutoControlSessionId, selectFilteredAutoProgram, selectVialCount,
} from '../../selectors/autosampler/autosamplerBase';
import { handleAutoMeasurementFinished, handleAutoMeasurementStopped } from './autoMeasurementThunks';
import { addNewMeasurementTab } from '../measurement/measurementThunks';
import { getEmptyControlRow } from '../../../utils/autoSampler';
import { axiosSession } from '../../axiosConfig';

export const setPendingStateChangeWithTimeout = (mode, delayMs = 3000) => (dispatch, getState) => {
  // immediately set pending true
  dispatch(autosamplerActions.setPendingStateChange({ mode, pending: true }));

  // then auto-reset after timeout
  setTimeout(() => {
    const state = getState();
    if (state.autosamplerReducer.data[mode]?.state.pendingStateChange) {
      dispatch(autosamplerActions.setPendingStateChange({ mode, pending: false }));
    }
  }, delayMs);
};

export const switchWashState = createAsyncThunk(
  'autosampler/wash',
  async ({ params, switchTo }, { dispatch, getState, rejectWithValue }) => {
    const state = getState();
    try {
      dispatch(autosamplerActions.setModuleParams({ mode: 'wash', params }));
      dispatch(setPendingStateChangeWithTimeout('wash', 1100));
      dispatch(autosamplerActions.changeModuleState({ mode: 'wash', isOn: switchTo }));
      const response = await axiosSession.post('api/autosampler/wash', { params, switchTo });
      return response.data;
    } catch (error) {
      console.error('Failed autosampler wash', error);
      return rejectWithValue(error);
    }
  },
);

// Thunk для чтения параметров сэмплера
export const readAutosamplerParams = createAsyncThunk(
  'autosampler/readParams',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosSession.get(`/api/autosampler/samplerSettings`);
      return response.data.samplerSettings; // Возвращаем только samplerSettings
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Thunk для записи параметров сэмплера
export const writeAutosamplerParams = createAsyncThunk(
  'autosampler/writeParams',
  async (samplerSettings, { rejectWithValue }) => {
    try {
      const payload = {
        operation: 'writeSamplerSettings',
        samplerSettings
      };
      const response = await axiosSession.post(`/api/autosampler/samplerSettings`, payload);
      return { ...response.data, samplerSettings }; // Возвращаем подтверждение и настройки
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const switchSingleInjectionState = createAsyncThunk(
  'autosampler/singleInjection',
  async ({ params, switchTo }, { dispatch, rejectWithValue }) => {
    try {
      const { useIndividualMethod, ...paramsToSend } = params;
      dispatch(autosamplerActions.setModuleParams({ mode: 'singleInjection', params }));
      dispatch(setPendingStateChangeWithTimeout('singleInjection', 1100));
      dispatch(autosamplerActions.changeModuleState({ mode: 'singleInjection', isOn: switchTo }));
      const response = await axiosSession.post('api/autosampler/singleInjection', { params: paramsToSend, switchTo });
      return response.data;
    } catch (error) {
      console.error('Failed autosampler singleInjection', error);
      return rejectWithValue(error);
    }
  },
);

export const switchAutoThermostatState = createAsyncThunk(
  'autosampler/autoThermostat',
  async ({ params, switchTo }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosSession.post('api/autosampler/autoThermostat', { params, switchTo });
      dispatch(autosamplerActions.setModuleParams({ mode: 'thermostat', params }));
      dispatch(setPendingStateChangeWithTimeout('thermostat', 1100));
      dispatch(autosamplerActions.changeModuleState({ mode: 'thermostat', isOn: switchTo }));
      return response.data;
    } catch (error) {
      console.error('Failed autosampler thermostat', error);
      return rejectWithValue(error);
    }
  },
);

export const switchAutoControlState = createAsyncThunk(
  'autosampler/autoControl',
  async ({ params, switchTo }, { getState, dispatch, rejectWithValue }) => {
    try {
      dispatch(autosamplerActions.updateControlProgram({ programSteps: params.programSteps }));
      const state = getState();

      let sessionId;
      if (switchTo) {
        sessionId = `autosamplerSession_${uuidv1()}`;
      } else {
        sessionId = selectAutoControlSessionId(state); // reuse current ID on stop
      }

      dispatch(setPendingStateChangeWithTimeout('control', 1100));
      dispatch(autosamplerActions.changeModuleState({ mode: 'control', isOn: switchTo }));

      const filteredProg = selectFilteredAutoProgram(state);

      const mainMessage = {
        switchTo,
        sessionId,
        ...(switchTo && { params: { programSteps: filteredProg } }),
      };

      const response = await axiosSession.post('api/autosampler/autoControl', mainMessage);

      if (!switchTo) {
        try {
          await dispatch(handleAutoMeasurementStopped(sessionId)).unwrap();
        } catch (err) {
          console.warn('Stop failed', err);
        }

        try {
          await dispatch(handleAutoMeasurementFinished(sessionId)).unwrap();
        } catch (err) {
          console.warn('Finish failed', err);
        }

        try {
          await dispatch(handleAutoSessionEnd(sessionId)).unwrap();
        } catch (err) {
          console.warn('Session cleanup failed', err);
        }
      }

      if (switchTo) {
        dispatch(autosamplerActions.assignSessionId({ sessionId }));
        dispatch(addNewMeasurementTab({ id: sessionId }));
        dispatch(measurementActions.startMeasurement({ tabId: sessionId }));
      } else {
        dispatch(autosamplerActions.assignSessionId({ sessionId: null }));
      }

      return response.data;
    } catch (error) {
      console.error('Failed autosampler control switch', error);
      dispatch(autosamplerActions.assignSessionId({ sessionId: null }));
      return rejectWithValue(error);
    }
  },
);

export const updateAutoControlProgram = createAsyncThunk(
  'autosampler/autoControlUpdate',
  async ({ params }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosSession.post('api/autosampler/autoControlUpdate', { params });
      dispatch(autosamplerActions.updateControlProgram({ programSteps: params.programSteps }));
      return response.data;
    } catch (error) {
      console.error('Failed autosampler control update', error);
      return rejectWithValue(error);
    }
  },
);

export const fetchAutoConfig = createAsyncThunk(
  'autosampler/fetchAutoConfig',
  async (_, { getState, dispatch, rejectWithValue }) => {
    try {
      dispatch(autosamplerActions.setFetchStatus('loading'));
      const oldState = getState();
      const oldVialCount = selectVialCount(oldState);

      const response = await axiosSession.get('api/autosampler/fetchAutoConfig');
      dispatch(autosamplerActions.setLoadedConfig({ config: response.data }));

      const state = getState();
      const vialCount = selectVialCount(state);

      if (oldVialCount > vialCount || !oldVialCount) {
        dispatch(autosamplerActions.setClearSteps({
          vialCount,
        }));
      }

      const { data } = response;

      const safePreWash = data.preWashSolvents?.[0] ?? null;
      const safePostWash = data.postWashSolvents?.[0] ?? null;

      dispatch(
        autosamplerActions.solventDefaults({ // i know looks bad up but i work with what i get
          preWashSolvent: safePreWash,
          postWashSolvent: safePreWash,
          solvent: safePreWash,
          wasteVial: safePostWash,
        }),
      );

      dispatch(autosamplerActions.setFetchStatus('succeeded'));
      return response.data;
    } catch (error) {
      console.error('Failed fetching autosampler config', error);
      dispatch(autosamplerActions.setFetchError(error.message));
      dispatch(autosamplerActions.setFetchStatus('failed'));
      return rejectWithValue(error);
    }
  },
);

const DEFAULT_PROGRAM = { activeStep: null, currentInjection: null };
const DEFAULT_THERMOSTAT = { isThermostatOn: null, targetTemp: null, currentTemp: null };

export const fetchAutoState = createAsyncThunk(
  'autosampler/fetchAutoState',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosSession.get('api/autosampler/fetchAutoState');
      const autoState = response.data;
      const {
        autosamplerState,
        currentAutosamplerMode,
        autosamplerProgram: {
          activeStep = null,
          currentInjection = null,
        } = DEFAULT_PROGRAM,
        autosamplerThermostat: {
          isThermostatOn = null,
          targetTemp = null,
          currentTemp = null,
        } = DEFAULT_THERMOSTAT,
      } = autoState;

      dispatch(autosamplerActions.setBaseState({
        autosamplerState,
      }));
      dispatch(autosamplerActions.setDetectorProgramState({
        activeStep, currentInjection,
      }));
      dispatch(autosamplerActions.setThermostatState({
        targetTemp, currentTemp,
      }));
      dispatch(autosamplerActions.setNodeAutosamplerMode({ currentAutosamplerMode }));
      dispatch(autosamplerActions.setNodeThermostatState({ isThermostatOn }));
      return response.data;
    } catch (error) {
      console.error('Failed fetching autosampler config', error);
      return rejectWithValue(error);
    }
  },
);

export const handleAutoSessionEnd = createAsyncThunk(
  'autosampler/onSessionEnd',
  async (sessionId, { getState, dispatch }) => {
    dispatch(measurementActions.stopMeasurement()); // stop session master measurement
    dispatch(measurementActions.markForClosure({ tabId: sessionId }));
    dispatch(autosamplerActions.clearSessionId());

    try {
      const response = await axiosSession.post('api/autosampler/autoControlFinish', {
        sessionId,
      });
      return response.data;
    } catch (error) {
      console.error('failed cleanup of auto session on finish', error);
    }
  },
);

export const revalidateAutosamplerProgram = createAsyncThunk(
  'autosampler/revalidate',
  async (local = null, { getState, dispatch }) => {
    try {
      const state = getState();
      const autoProgram = local ?? selectAutoControlProgram(state);
      const availableMethods = selectActualGenMethods(state);
      const methodsMap = new Set(availableMethods);

      let hasChanges = false;
      const validProg = autoProgram.map((step, index) => {
        if (!methodsMap.has(step.method) && step.method !== '') {
          hasChanges = true;
          return getEmptyControlRow(index);
        }
        return step;
      });

      if (!hasChanges) {
        console.log('no changes in auto prog');
        return null;
      }
      console.log('fixed auto program', validProg);
      if (local) return validProg;

      dispatch(autosamplerActions.updateControlProgram({ programSteps: validProg }));
    } catch (error) {
      console.error(error);
    }
  },
);
