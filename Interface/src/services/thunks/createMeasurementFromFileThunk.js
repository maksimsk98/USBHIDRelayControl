// thunks/measurement/copyFromFileToMeasurement.js
import { createAsyncThunk } from '@reduxjs/toolkit';
import { fileActions, measurementActions, selectFileEntry } from '../reduxImportDispatcher';

export const createMeasurementFromFileThunk = createAsyncThunk(
  'measurement/createFromFile',
  async ({ sourceId }, { getState, dispatch }) => {
    const state = getState();
    const file = selectFileEntry(state, sourceId);

    if (!file) {
      console.error(`createMeasurementFromFileThunk: no file for ${sourceId}`);
      return null;
    }

    const {
      id,
      type,
      method,
      calibration,
      name,
      path
    } = file;

    // add measurement with fields derived from file entity
    dispatch(
      measurementActions.addMeasurement({
        id,
        type,
        method,
        calibration,
        name,
        shouldOpen: false,
        sourceId,
        sourcePath: path
      }),
    );

    dispatch(fileActions.deleteFileEntry(id));

    return id;
  },
);
