import { createAsyncThunk } from '@reduxjs/toolkit';

import {
  degasserActions, selectAutoMode, selectDetectorStatusData, selectDetectorType, selectIsDegasserOn, selectIsThermostatOn, selectThermoParams,
} from '../../reduxImportDispatcher';
import { AUTOSAMPLER_MODES, DETECTOR_TYPES } from '../../../constants/constants';
import { axiosSession } from '../../axiosConfig';

export const postTermostatData = createAsyncThunk(
  'pumps/postTermostatData',
  async (data, { rejectWithValue }) => {
    try {
      const response = await axiosSession.post('/api/thermostat', data);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  },
);

export const postIsocratFillData = createAsyncThunk(
  'pumps/postIsocratFillData',
  async (data, { rejectWithValue }) => {
    try {
      const response = await axiosSession.post('/api/pumps/isocrat/fill', data);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  },
);

export const postIsocratDrainData = createAsyncThunk(
  'pumps/postIsocratDrainData',
  async (data, { rejectWithValue }) => {
    try {
      const response = await axiosSession.post('/api/pumps/isocrat/drain', data);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  },
);

export const postIsocratSupplyData = createAsyncThunk(
  'pumps/postIsocratSupplyData',
  async (data, { rejectWithValue }) => {
    try {
      const response = await axiosSession.post('/api/pumps/isocrat/supply', data);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  },
);

export const stopPump = createAsyncThunk(
  'pumps/stop',
  async (data, { rejectWithValue }) => {
    try {
      const response = await axiosSession.post('/api/pumps/stop', data);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  },
);

export const releasePressure = createAsyncThunk(
  'pumps/releasePressure',
  async (releaseParams, { rejectWithValue }) => {
    try {
      const response = await axiosSession.post('/api/pumps/releasePressure', releaseParams);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  },
);

export const postPumpParams = createAsyncThunk(
  'pumps/pumpParams',
  async (data, { rejectWithValue }) => {
    try {
      const response = await axiosSession.post('/api/pumps/pumpParams', data);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  },
);

export const postGradientFillData = createAsyncThunk(
  'pumps/postIsocratFillData',
  async (data, { rejectWithValue }) => {
    try {
      const response = await axiosSession.post('/api/pumps/gradient/fill', data);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  },
);

export const postGradientDrainData = createAsyncThunk(
  'pumps/postIsocratDrainData',
  async (data, { rejectWithValue }) => {
    try {
      const response = await axiosSession.post('/api/pumps/gradient/drain', data);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  },
);

export const postGradientSupplyData = createAsyncThunk(
  'pumps/postIsocratSupplyData',
  async (data, { rejectWithValue }) => {
    try {
      const response = await axiosSession.post('/api/pumps/gradient/supply', data);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  },
);

export const toggleDegasser = createAsyncThunk(
  'pumps/toggleDegasser',
  async (_, { getState, dispatch, rejectWithValue }) => {
    try {
      const state = getState();
      const isDegasserOnOld = selectIsDegasserOn(state);

      const newState = isDegasserOnOld === false;
      dispatch(degasserActions.setIsDegasserOn(newState));

      const messageBody = {
        newState,
      };

      const response = await axiosSession.post('/api/pumps/toggleDegasser', messageBody);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  },
);

export const ensureThermostatOff = createAsyncThunk(
  'thermostat/ensureThermostatOff',
  async ({ maxRetries = Infinity }, { getState, dispatch, rejectWithValue }) => {
    const DELAY = 300; // ms

    const state = getState();
    const isAutosamplerProgram = selectAutoMode(state) === AUTOSAMPLER_MODES.AUTOSAMPLER_PROGRAM; // selector for autosampler mode
    if (isAutosamplerProgram) return; // skip for autosampler programs

    const isOn = selectIsThermostatOn(state);
    if (!isOn) return;

    const { targetTemp, dispersion } = selectThermoParams(state);
    const safeDispersion = isFinite(Number(dispersion)) ? Number(dispersion) : 0;

    await postTermostatData({ isThermostatOn: false, targetTemp, dispersion: safeDispersion });

    let retries = 0;
    while (retries < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, DELAY));
      const latest = getState();
      if (!selectIsThermostatOn(latest)) return;
      retries++;
    }

    return rejectWithValue('Thermostat did not turn off in time.');
  },
);

/** Переключение продувки RID. При purge=true измерение нельзя запускать. */
export const setRidPurge = createAsyncThunk(
  'status/setRidPurge', 
  async (_, { getState, dispatch, rejectWithValue }) => {
    const state = getState();
    const detectorType = selectDetectorType(state)
    try {      
      if (detectorType !== DETECTOR_TYPES.RID) {
        console.warn(`Setting purge of non-RID detector ${detectorType}. Noop`)
        return null
      }
      const detectorStatusData = selectDetectorStatusData(state)

      const currentPurge = detectorStatusData?.purge

      const purgeToPost = !currentPurge

      await axiosSession.post('/api/detector/setRidPurge', { purge: purgeToPost });
      return {purgeToPost, success: true}
    } catch (error) {
      console.error(`Failed purging ${detectorType}`, error)
      rejectWithValue(null)
    }
  }
);