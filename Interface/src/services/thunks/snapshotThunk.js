import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  fileActions, measurementActions, selectChromaDataSnapshot, selectMethodData, selectTabMethod,
} from '../reduxImportDispatcher';

export const takeFileDataSnapshotThunk = createAsyncThunk(
  'files/takeDataSnapshot',
  ({ id }, { getState, dispatch }) => {
    const state = getState();

    const payload = selectChromaDataSnapshot(state, id);

    dispatch(
      fileActions.setFileDataSnapshot({
        id,
        payload,
        takenAt: Date.now(),
      }),
    );

    return true;
  },
);

export const takeFileMethodSnapshotThunk = createAsyncThunk(
  'files/takeMethodSnapshot',
  ({ id }, { getState, dispatch }) => {
    const state = getState();

    const payload = selectMethodData(state, id);
    const method = selectTabMethod(state, id);

    dispatch(
      fileActions.setFileMethodSnapshot({
        id,
        payload,
        method,
        takenAt: Date.now(),
      }),
    );

    return true;
  },
);

export const takeMeasurementDataSnapshotThunk = createAsyncThunk(
  'measurement/takeDataSnapshot',
  ({ id }, { getState, dispatch }) => {
    const state = getState();

    const payload = selectChromaDataSnapshot(state, id);

    dispatch(
      measurementActions.setDataSnapshot({
        id,
        payload,
        takenAt: Date.now(),
      }),
    );

    return true;
  },
);

export const takeMeasurementMethodSnapshotThunk = createAsyncThunk(
  'measurement/takeMethodSnapshot',
  ({ id }, { getState, dispatch }) => {
    const state = getState();

    const payload = selectMethodData(state, id);
    const method = selectTabMethod(state, id);

    dispatch(
      measurementActions.setMethodSnapshot({
        id,
        method,
        payload,
        takenAt: Date.now(),
      }),
    );

    return true;
  },
);
