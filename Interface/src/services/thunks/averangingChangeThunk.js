import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  selectActiveSubTabByTab, selectActiveTab, selectActiveTabType, selectChromaMiscData, selectIsMainStreaming, selectIsTabInitialized, selectTabSignalParams,
} from '../reduxImportDispatcher';
import { changeFileAveraging } from './file/fileThunks';
import { changeMeasurementAveraging } from './measurement/measurementThunks';
import { recalcNoiseIfNeeded } from './report/reportThunks';

export const changeAveraging = createAsyncThunk(
  'misc/changeAveraging',
  async ({ id, averaging }, { dispatch, getState, rejectWithValue }) => {
    try {
      const state = getState();
      const tabType = selectActiveTabType(state);
      const isMeasuring = selectIsMainStreaming(state);
      switch (tabType) {
        case 'file':
          dispatch(changeFileAveraging({ tabId: id, averaging }));
          break;
        case 'measurement':
          dispatch(changeMeasurementAveraging({ tabId: id, averaging, isMeasuring }));
          break;
      }

      // ПОСЛЕ смены averaging — пересчёт шума (если нужно)
      dispatch(recalcNoiseIfNeeded({ parentId: id }));
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  },
);

export const reaffirmAveraging = createAsyncThunk(
  'misc/reaffirmAveraging',
  async (tabId, { dispatch, getState, rejectWithValue }) => {
    const state = getState();
    const activeTab = selectActiveTab(state);
    const isTabInitialized = selectIsTabInitialized(state, tabId);

    if (activeTab !== tabId || !isTabInitialized) return; // guard against background changes;
    try {
      const activeSubTab = selectActiveSubTabByTab(state, activeTab);
      const { isSignalAveraging } = selectTabSignalParams(state, tabId);
      const { averaging } = selectChromaMiscData(state, tabId);

      if (activeSubTab === 'signals') {
        const effectiveAveraging = isSignalAveraging ? averaging : 0.2;
        dispatch(changeAveraging({ id: tabId, averaging: effectiveAveraging }));
      } else {
        dispatch(changeAveraging({ id: tabId, averaging }));
      }
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  },
);
