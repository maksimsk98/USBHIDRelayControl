import { createAsyncThunk } from '@reduxjs/toolkit';


import {
  chromaPlotsActions, degasserActions, selectIsDegasserOn, statusActions,
} from '../reduxImportDispatcher';

// base
import { selectIsMainStreaming, selectStreamedMeasurementId } from '../selectors/measurement/measureBase';
import { mainGradientActions } from '../slices/mainGradientSlice';
import { DEGASSER_STATES } from '../../constants/constants';
import { fetchAutoState } from './autosampler/autosamplerThunk';
import { axiosSession } from '../axiosConfig';

export const fetchThermostat = createAsyncThunk('status/fetchThermostat', async () => {
  const response = await axiosSession.get('/api/thermostat');
  /* console.log('thermostatThunk', response) */
  return response.data;
});

export const fetchDetector = createAsyncThunk('status/fetchDetector', async () => {
  const response = await axiosSession.get('/api/detector');
  /* console.log('detectorThunk', response) */
  return response.data;
});

export const fetchPumps = createAsyncThunk('status/fetchPumps', async (_, { getState, dispatch }) => {
  const response = await axiosSession.get('/api/pumps');
  /*   console.log('pumpThunk', response) */
  const { degasserState } = response.data;
  const state = getState();
  const isOnOld = selectIsDegasserOn(state);
  // syncing back on critical loss of synchronisity
  if (degasserState === DEGASSER_STATES.NOT_CONNECTED) {
    dispatch(degasserActions.setIsDegasserOn(false));
  }
  if (!isOnOld && degasserState === DEGASSER_STATES.WORK) {
    dispatch(degasserActions.setIsDegasserOn(true));
  }
  return response.data;
});

export const fetchStatusData = createAsyncThunk('status/fetchAllData', async (_, { dispatch, getState }) => {
  const [thermostatThunk, detectorThunk, pumpsThunk, autoThunk] = await Promise.all([
    dispatch(fetchThermostat()),
    dispatch(fetchDetector()),
    dispatch(fetchPumps()),
    dispatch(fetchAutoState()), // it's self sufficient and probably will move out of here later
  ]);

  if (fetchThermostat.fulfilled.match(thermostatThunk)
      && fetchDetector.fulfilled.match(detectorThunk)
      && fetchPumps.fulfilled.match(pumpsThunk)) {
    const state = getState();
    const streamedMeasurementId = selectStreamedMeasurementId(state);
    const isStreaming = selectIsMainStreaming(state);

    if (isStreaming) {
      // we don't add detector plots from status anymore
      dispatch(chromaPlotsActions.updateSignalsPlots({
        thermostatData: thermostatThunk.payload,
        pumpsData: pumpsThunk.payload.pumps,
        parentId: streamedMeasurementId,
      }));
    }

    dispatch(statusActions.updateStatus({
      thermostatData: thermostatThunk.payload,
      detectorData: detectorThunk.payload,
      pumpsData: {
        pumps: pumpsThunk.payload.pumps,
        degasser: pumpsThunk.payload.degasser,
      },
    }));

    dispatch(mainGradientActions.setActiveStep(pumpsThunk.payload.activeStepPumpProgram));

    return {
      thermostatData: thermostatThunk.payload,
      detectorData: detectorThunk.payload,
      pumpsData: pumpsThunk.payload,
    };
  }
  // Handle errors if any of the actions were not fulfilled
  throw new Error('Failed to fetch one or more data sources');
});
