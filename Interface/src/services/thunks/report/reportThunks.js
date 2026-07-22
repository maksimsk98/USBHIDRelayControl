import { createAsyncThunk } from '@reduxjs/toolkit';

import {
  reportActions,
  selectChromaReportCheckboxes,
  selectNoiseEvalParams,
} from '../../reduxImportDispatcher';
import { axiosSession } from '../../axiosConfig';

export const fetchNoiseEvalThunk = createAsyncThunk(
  'miscCalc/fetchNoiseEval',
  async ({ parentId }, { dispatch, getState, rejectWithValue }) => {
    try {
      const state = getState();

      const checks = selectChromaReportCheckboxes(state, parentId);
      const enabled = !!checks?.noiseEval;
      const params = selectNoiseEvalParams(state, parentId);

      if (!enabled || !params) return null;

      dispatch(reportActions.setNoiseEvalCalc({ parentId, noise: null }));

      const response = await axiosSession.post('/api/miscCalc/getNoiseEval', {
        measurementId: parentId,
        noiseEvalParams: params,
      });

      const { noiseValue } = response.data;

      dispatch(reportActions.setNoiseEvalCalc({ parentId, noise: noiseValue }));

      return { parentId, noiseValue };
    } catch (err) {
      return rejectWithValue({
        parentId,
        message: err?.response?.data?.error || err?.message || 'Noise eval failed',
      });
    }
  },
);

export const confirmNoiseEvalThunk = createAsyncThunk(
  'miscCalc/confirmNoiseEval',
  async ({ parentId, params }, { dispatch, rejectWithValue }) => {
    try {
      dispatch(reportActions.setNoiseEvalParams({ parentId, params }));

      // важно: мы НЕ читаем state обратно здесь — fetch сам всё прочитает
      await dispatch(fetchNoiseEvalThunk({ parentId })).unwrap();

      return { parentId };
    } catch (err) {
      return rejectWithValue(err);
    }
  },
);

export const recalcNoiseIfNeeded = createAsyncThunk(
  'report/recalcNoiseIfNeeded',
  async ({ parentId }, { dispatch }) => {
    await dispatch(fetchNoiseEvalThunk({ parentId }));
    return { parentId };
  },
);
