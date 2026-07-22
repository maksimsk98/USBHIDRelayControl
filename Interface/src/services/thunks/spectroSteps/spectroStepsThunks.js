import { createAsyncThunk } from '@reduxjs/toolkit';

import { selectStreamedMeasurementId, spectroPlotsActions, spectroStepsActions } from '../../reduxImportDispatcher';
import { SPECTRO_OPERATIONS } from '../../../constants/pending';
import { axiosSession } from '../../axiosConfig';

export const changeSpectroCorrectionThunk = createAsyncThunk(
  'spectro/changeCorrection',
  async ({ tabId, correction }, { dispatch, getState, rejectWithValue }) => {
    // --- pending start ---
    dispatch(
      spectroStepsActions.setSpectroPending({
        tabId,
        operation: SPECTRO_OPERATIONS.changeCorrection,
        value: true,
      }),
    );

    try {
      const state = getState();
      const streamedMeasurementId = selectStreamedMeasurementId(state);
      const isMeasuring = streamedMeasurementId === tabId;

      const response = await axiosSession.post('/api/measurement/spectro/changeCorrection', {
        measurementId: tabId,
        correction,
        isMeasuring,
      });

      // Update misc param
      dispatch(
        spectroStepsActions.updateSpectroParam({
          tabId,
          name: 'correction',
          value: correction,
        }),
      );

      // Server returns ONE curve, not processedCurves for init and not running
      const { curve } = response.data;

      dispatch(
        spectroPlotsActions.setSpectroMeasuredData({
          tabId,
          measuredSpectroscopic: curve,
        }),
      );

      return curve;
    } catch (err) {
      console.error('Error in changeSpectroCorrectionThunk:', err);
      return rejectWithValue(err);
    } finally {
      // --- pending end ---
      dispatch(
        spectroStepsActions.setSpectroPending({
          tabId,
          operation: SPECTRO_OPERATIONS.changeCorrection,
          value: false,
        }),
      );
    }
  },
);
