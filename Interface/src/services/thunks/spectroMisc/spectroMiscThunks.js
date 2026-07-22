
import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  selectSpectroHasScaling, selectSpectroHasSmoothing, spectroMiscActions,
} from '../../reduxImportDispatcher';
import { spectroPlotsActions } from '../../slices/spectroPlotsSlice';
import { axiosSession } from '../../axiosConfig';

export const changeSpectroScalingThunk = ({ tabId, isChecked }) => async (dispatch) => {
  try {
    // send POST to server
    const response = await axiosSession.post('/api/measurement/spectro/changeScaling', {
      measurementId: tabId,
      isChecked,
    });

    // update Redux
    dispatch(
      spectroMiscActions.setHasScaling({
        tabId,
        value: isChecked,
      }),
    );

    const { updatedData } = response.data;

    dispatch(spectroPlotsActions.setSpectroProcessedData({ tabId, curves: updatedData }));
  } catch (err) {
    console.error('Error in changeSpectroScalingThunk:', err);
    throw err;
  }
};

export const changeSpectroSmoothingThunk = ({
  tabId,
  isChecked,
  threshold,
  factor,
}) => async (dispatch) => {
  try {
    const response = await axiosSession.post('/api/measurement/spectro/changeSmoothing', {
      measurementId: tabId,
      isChecked,
      threshold,
      factor,
    });

    dispatch(
      spectroMiscActions.setHasSmoothing({
        tabId,
        value: isChecked,
      }),
    );

    dispatch(
      spectroMiscActions.applyFactorAndThreshold({
        tabId,
        threshold,
        factor,
      }),
    );

    const { updatedData } = response.data;

    dispatch(spectroPlotsActions.setSpectroProcessedData({ tabId, curves: updatedData }));
  } catch (err) {
    console.error('Error in changeSpectroSmoothingThunk:', err);
    throw err;
  }
};

export const changeSpectroBackgroundThunk = createAsyncThunk(
  'spectro/changeBackground',
  async ({ tabId, index }, { dispatch, getState, rejectWithValue }) => {
    try {
      const state = getState();
      const hasScaling = selectSpectroHasScaling(state, tabId);
      const hasSmoothing = selectSpectroHasSmoothing(state, tabId);

      const response = await axiosSession.post('/api/measurement/spectro/changeBackground', {
        measurementId: tabId,
        backgroundIndex: index,
        isScalingCheck: hasScaling,
        isSmoothingCheck: hasSmoothing,
      });

      // update misc state
      dispatch(
        spectroMiscActions.setSelectedBackgroundIndex({
          tabId,
          value: index,
        }),
      );

      // update processed curves
      const { updatedData } = response.data;

      dispatch(
        spectroPlotsActions.setSpectroProcessedData({
          tabId,
          curves: updatedData,
        }),
      );

      return updatedData; // useful for chaining if needed
    } catch (err) {
      console.error('Error in changeSpectroBackgroundThunk:', err);
      return rejectWithValue(err);
    }
  },
);
