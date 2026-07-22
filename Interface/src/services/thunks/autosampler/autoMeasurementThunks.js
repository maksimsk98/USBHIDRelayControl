import { createAsyncThunk } from '@reduxjs/toolkit';

import { chromaPlotsActions, measurementActions, selectChromaDataIfAltered, selectPassportData } from '../../reduxImportDispatcher';
import { MEASUREMENT_STATUSES } from '../../../constants/constants';
import { handleClearPlotsIfUpdated, handleParamsAndPointsUpdate, handleStepAndStageUpdate } from '../chormaPlots/chromaPlotsThunks';
import { axiosSession } from '../../axiosConfig';

export const handleAutoMeasurementFinished = createAsyncThunk(
  'autoMeasurement/onAutoFinish',
  async (sessionId, { getState, dispatch }) => {
    const state = getState();
    const alteredData = selectChromaDataIfAltered(state, sessionId);

    dispatch(chromaPlotsActions.clearAllPlotsData(sessionId));

    try {
      const response = await axiosSession.post('api/autosampler/autoSubMeasurementClose', {
        sessionId,
        needsToSave: true,
        alteredData,
      });

      return response.data; // if you care about result
    } catch (error) {
      console.error('Failed to close autosampler sub-measurement', error);
      throw error;
    }
  },
);

export const handleAutoMeasurementStopped = createAsyncThunk(
  'autoMeasurement/onAutoStop',
  async (sessionId, { getState, dispatch }) => {
    const state = getState();
    const alteredData = selectChromaDataIfAltered(state, sessionId);

    try {
      await axiosSession.post('api/autosampler/autoSubMeasurementStop', {
        sessionId,
      });
      await axiosSession.post('api/autosampler/autoSubMeasurementClose', {
        sessionId,
        needsToSave: true,
        alteredData
      });

      return true;
    } catch (error) {
      console.error('Failed to close autosampler sub-measurement', error);
      throw error;
    }
  },
);

// they are simillar for now so aliasing
export const handleAutoMeasurementClosed = handleAutoMeasurementStopped;

export const fetchAutoMeasurementData = createAsyncThunk(
  'autoMeasurement/fetchChroma',
  async (sessionId, { getState, dispatch }) => {
    const response = await axiosSession.get('/api/autosampler/autoControlListen', {
      params: { autoSessionId: sessionId },
    });

    const { data } = response;

    dispatch(handleClearPlotsIfUpdated(sessionId, data.isAfterUpdate));
    dispatch(handleStepAndStageUpdate(sessionId, data.activeStep, data.pumpProgramStage));
    dispatch(handleParamsAndPointsUpdate(sessionId, data));
    const { status } = data;
    if (status
        && status !== MEASUREMENT_STATUSES.MEASUREMENT_FINISHED) {
      dispatch(measurementActions.changeCurStreamStatus(status));
    }

    return {
      sessionId,
      measurementData: {
        measuredChromatogram: data.measuredChromatogram,
        signalPhoto: data.signalPhoto,
        signalRef: data.signalRef,
      },
      status: data.status,
    };
  },
);
