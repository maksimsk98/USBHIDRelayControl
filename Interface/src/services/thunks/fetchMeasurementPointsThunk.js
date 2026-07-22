import { createAsyncThunk } from '@reduxjs/toolkit';
import { selectTabMeasurementType } from '../reduxImportDispatcher';
import { fetchChromaMeasurementPoints } from './chormaPlots/chromaPlotsThunks';
import { fetchSpectroMeasurementPoints } from './spectroPlots/spectroPlotsThunks';

// Dispatches correct fetch thunk based on measurement type
export const fetchMeasurementPointsThunk = createAsyncThunk(
  'measurement/fetchPoints',
  async (measurementId, { getState, dispatch, rejectWithValue }) => {
    try {
      const state = getState();
      const type = selectTabMeasurementType(state, measurementId);

      if (type === 'chroma') {
        await dispatch(fetchChromaMeasurementPoints(measurementId));
      } else if (type === 'spectro') {
        await dispatch(fetchSpectroMeasurementPoints(measurementId));
      } else {
        console.warn(`Unknown measurement type for ${measurementId}:`, type);
      }

      return { measurementId, type };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);
