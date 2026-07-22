
import { createAsyncThunk } from '@reduxjs/toolkit';

import { spectroPlotsActions } from '../../slices/spectroPlotsSlice';
import { handleStatusUpdate } from '../chormaPlots/chromaPlotsThunks';
import { axiosSession } from '../../axiosConfig';

export const fetchSpectroMeasurementPoints = createAsyncThunk(
  'measurement/fetchSpectro',
  async (tabId, { getState, dispatch }) => {
    const response = await axiosSession.get('/api/measurement/spectro/listen', {
      params: { tabId },
    });

    const { measuredSpectroscopic, processedCurves, status } = response.data;

    dispatch(handleStatusUpdate(status));
    dispatch(spectroPlotsActions.appendSpectroPoints({ tabId, measuredSpectroscopic }));
    if (Array.isArray(processedCurves) && processedCurves.length > 0) dispatch(spectroPlotsActions.setSpectroProcessedData({ tabId, curves: processedCurves }));
  },
);

export const deleteSpectroCurve = createAsyncThunk(
  'measurement/deleteSpectroCurve',
  async ({ tabId, traceIndex }, { getState, rejectWithValue, dispatch }) => {
    try {
      /* dispatch(spectroPlotsActions.deleteTraceByIndex({ tabId, traceIndex })); */ // if you want optimistic update uncomment this line

      const response = await axiosSession.post('/api/measurement/spectro/deleteCurve', {
        measurementId: tabId,
        curveIndex: traceIndex,
      });

      const { updatedData: processedCurves } = response.data;
      dispatch(spectroPlotsActions.setSpectroProcessedData({ tabId, curves: processedCurves }));

      return { tabId };
    } catch (error) {
      console.error(`Error deleting spectro curve: ${tabId}, ${traceIndex}`, error);

      //  rejected action, but with a defined payload
      return rejectWithValue({ tabId, error: error.message || String(error) });
    }
  },
);
