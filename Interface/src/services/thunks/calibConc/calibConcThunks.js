import { createAsyncThunk } from '@reduxjs/toolkit';

import {
  selectActiveTab, selectActiveTabCalibration, selectActiveTabMethod, selectGeneralMethods, selectIsCalibGen, selectSelectedCalibration,
} from '../../reduxImportDispatcher';

import { selectCalibConcConcentration } from '../../selectors/calibConc/calibConcBase';
import { processPeaksData } from '../peaks/peaksThunks';
import { calibMetaActions } from '../../slices/calibMetaSlice';
import { axiosSession } from '../../axiosConfig';

export const setStandardConcentrationThunk = createAsyncThunk(
  'measurement/setStandardConcentration',
  async (
    _,
    { dispatch, getState, rejectWithValue },
  ) => {
    try {
      const state = getState();

      const tabId = selectActiveTab(state);
      if (!tabId) return null;

      const calibNameFromTab = selectActiveTabCalibration(state);
      const calibNameFromSelected = selectSelectedCalibration(state);

      const calibName = calibNameFromTab
        ?? (calibNameFromSelected || null);

      if (!calibName) return null;

      const concentration = selectCalibConcConcentration(state, calibName);

      if (
        typeof concentration !== 'number'
        || !Number.isFinite(concentration)
      ) {
        return rejectWithValue({
          message: 'Standard concentration is not a valid number',
        });
      }

      const { data: peaksData } = await axiosSession.post(
        '/api/miscCalc/setStandardConcentration',
        {
          measurementId: tabId,
          concentration,
        },
      );

      await dispatch(
        processPeaksData({
          tabId,
          peaksData,
        }),
      );

      return { tabId, calibName, concentration };
    } catch (err) {
      return rejectWithValue({
        message:
          err?.response?.data?.error
          || err?.message
          || 'Failed to set standard concentration',
      });
    }
  },
);

export const fetchCalibConcStandardThunk = createAsyncThunk(
  'calibConc/fetchStandard',
  async (
    { method: passedMethod = null, calibration: passedCalibration = null } = { },
    { dispatch, getState, rejectWithValue },
  ) => {
    try {
      const state = getState();

      const activeTabMethod = selectActiveTabMethod(state);

      const effectiveMethod = passedMethod ?? activeTabMethod;

      // 1️⃣ определить calibName
      const calibNameFromSelected = selectSelectedCalibration(state);

      const calibName = passedCalibration
        ?? (calibNameFromSelected || null);

      if (!calibName) return null;

      const generalMethods = selectGeneralMethods(state);

      const isGeneral = selectIsCalibGen(state, { calibration: calibName, method: effectiveMethod });

      if (!isGeneral) {
        return rejectWithValue({
          message: `Calibration "${calibName}" is not general for method "${effectiveMethod}"`,
        });
      }

      const { data } = await axiosSession.get(
        '/api/miscCalc/getCalibrationStandard',
        {
          params: {
            calibrationName: calibName,
          },
        },
      );

      const {
        calibrationName,
        standardName,
        concentration,
        concentrationUnits,
        response,
        calibrationType,
        reperPeak,
      } = data ?? {};

      dispatch(
        calibMetaActions.setCalibrationData({
          calibName,
          calibrationName,
          standardName,
          concentration,
          concentrationUnits,
          response,
          calibrationType,
          reperPeak,
        }),
      );

      return { calibName };
    } catch (err) {
      console.error(err, 'Error fetching calibration standard');
      return rejectWithValue({
        message:
          err?.response?.data?.error
          || err?.message
          || 'Failed to fetch calibration standard',
      });
    }
  },
);
