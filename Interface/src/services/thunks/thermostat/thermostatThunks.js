import { createAsyncThunk } from '@reduxjs/toolkit';

import { thermostatActions } from '../../reduxImportDispatcher';
import { axiosSession } from '../../axiosConfig';

export const setDefaultThermoThunk = createAsyncThunk(
  'thermostat/postTermostatData',
  async ({ dispersion, targetTemp }, { dispatch, rejectWithValue }) => {
    try {
      dispatch(thermostatActions.setTargetTemp(targetTemp));
      dispatch(thermostatActions.setDispersion(dispersion));
      const response = await axiosSession.post('/api/thermostat/setDefaults', {
        dispersion,
        targetTemp,
      });
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  },
);

export const changeThermostatState = createAsyncThunk(
  'thermostat/changeState',
  async ({ isThermostatOn, targetTemp, dispersion }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosSession.post('/api/thermostat/', {
        isThermostatOn, targetTemp, dispersion
      });
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  },
);
