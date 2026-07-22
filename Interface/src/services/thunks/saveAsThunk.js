import { createAsyncThunk } from '@reduxjs/toolkit';
import { saveAsChromaWithApiCall, saveAsSpectroWithApiCall } from './measurement/measurementThunks';
import { MEASUREMENT_TYPES, TAB_TYPES } from '../../constants/constants';
import { saveAsFileWithApiCall } from './file/fileThunks';

export const saveAsRequested = createAsyncThunk(
  'file/saveAsRequested',
  async (
    {
      filePath, tabId, tabType, measurementType,
    },
    { dispatch, rejectWithValue },
  ) => {
    try {
      // 🔹 FILE tab with chroma measurement
      if (
        tabType === TAB_TYPES.FILE
        && measurementType === MEASUREMENT_TYPES.chroma
      ) {
        console.log('calling save as for chroma file');
        return await dispatch(
          saveAsFileWithApiCall({
            fileId: tabId,
            filePath,
          }),
        ).unwrap();
      }

      // 🔹 MEASUREMENT tab with chroma (если захочешь разрешить)
      if (
        tabType === TAB_TYPES.MEASUREMENT
        && measurementType === MEASUREMENT_TYPES.chroma
      ) {
        console.log('calling save as for chroma meas');
        return await dispatch(
          saveAsChromaWithApiCall({
            measurementId: tabId,
            filePath,
          }),
        ).unwrap();
      }

      if (
        tabType === TAB_TYPES.MEASUREMENT
        && measurementType === MEASUREMENT_TYPES.spectro
      ) {
        console.log('calling save as for spectro measurement');

        return await dispatch(
          saveAsSpectroWithApiCall({
            measurementId: tabId,
            filePath,
          }),
        ).unwrap();
      }

      // 🔸 будущие ветки
      // if (measurementType === MEASUREMENT_TYPES.SPECTRO) { ... }
      // if (tabType === TAB_TYPES.PACKAGE) { ... }

      console.error('Unsoported save as', tabType, measurementType);

      return rejectWithValue({
        reason: 'unsupported-save-as',
        tabType,
        measurementType,
      });
    } catch (error) {
      return rejectWithValue(error);
    }
  },
);
