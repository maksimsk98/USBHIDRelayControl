import { createAsyncThunk } from '@reduxjs/toolkit';

import {
  chromaPlotsActions, fileActions, isFileInState, selectChromaDataIfAltered, selectFilePathById, selectOpenedIndexersForFile, selectPreviewIndexersForFile, selectSpectroDataIfAltered, selectTabMeasurementType,
} from '../../reduxImportDispatcher';
import { FILE_ID_CATEGORIES, OPEN_STATES } from '../../../constants/constants';
import { axiosSession } from '../../axiosConfig';

export const closeFileWithApiCall = createAsyncThunk(
  'files/closeFileWithApiCall',
  async ({
    fileId, needsToSave, alteredData, forRestart = false,
  }, { getState, dispatch, rejectWithValue }) => {
    try {
      console.log('Closing file with api call', fileId, needsToSave, alteredData, forRestart);
      const state = getState();

      let actualAlteredData = alteredData;
      const measurementType = selectTabMeasurementType(state, fileId);

      if (actualAlteredData == null) {
        if (measurementType === 'spectro') {
          actualAlteredData = selectSpectroDataIfAltered(state, fileId);
        } else if (measurementType === 'chroma') {
          actualAlteredData = selectChromaDataIfAltered(state, fileId);
        } else { // HACK TODO WATCHLIST default to chroma
          console.warn(`Unknown measurement type "${measurementType}" for fileId: ${fileId} during close, defaulting alteredData selector to chroma.`);
          actualAlteredData = selectChromaDataIfAltered(state, fileId);
        }
      }

      const path = selectFilePathById(state, fileId);

      const response = await axiosSession.post('/api/files/close', {
        fileId,
        needsToSave: needsToSave ?? false,
        alteredData,
        measurementType,
        forRestart,
        filePath: path,
      });

      await dispatch(removeOpenedCat({ fileId }));

      return { ...response.data, fileId };
    } catch (error) {
      console.error('Failed closing file for', fileId, error);
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  },
);

export const saveAsFileWithApiCall = createAsyncThunk(
  'files/saveAsFileWithApiCall',
  async (
    { fileId, filePath, alteredData },
    { getState, dispatch, rejectWithValue },
  ) => {
    try {
      const state = getState();

      let actualAlteredData = alteredData;
      const measurementType = selectTabMeasurementType(state, fileId);

      if (actualAlteredData == null) {
        if (measurementType === 'spectro') {
          actualAlteredData = selectSpectroDataIfAltered(state, fileId);
        } else if (measurementType === 'chroma') {
          actualAlteredData = selectChromaDataIfAltered(state, fileId);
        } else {
          // WATCHLIST fallback — строго как в close
          console.warn(
            `Unknown measurement type "${measurementType}" for fileId ${fileId} during save-as, defaulting to chroma alteredData`,
          );
          actualAlteredData = selectChromaDataIfAltered(state, fileId);
        }
      }

      const response = await axiosSession.post('/api/files/save-as', {
        fileId,
        filePath,
        alteredData: actualAlteredData ?? {},
        measurementType,
      });

      // Do not reset as save as counts as separate enitity from original file
      /*  dispatch(changeTrackerActions.resetHasAlteredData(fileId)) */

      return {
        fileId,
        filePath,
        measurementType,
        result: response.data?.message ?? 'save-as requested',
      };
    } catch (error) {
      console.error('saveAsFileWithApiCall failed for', fileId, error);
      return rejectWithValue(
        error.response?.data?.error || error.message,
      );
    }
  },
);

export const changeFileAveraging = createAsyncThunk(
  'files/changeAveraging',
  async ({ tabId, averaging }, { dispatch, getState, rejectWithValue }) => {
    try {
      const response = await axiosSession.post('/api/files/changeAveraging', { tabId, averaging });
      const { updatedData: { plotsData } } = response.data;

      dispatch(chromaPlotsActions.clearAllPlotsData({ parentId: tabId }));
      dispatch(chromaPlotsActions.appendPlotsAndAddTable({ id: tabId, plotsData }));
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  },
);

export const unlinkFileFromCategory = createAsyncThunk(
  'files/unlinkFileFromCategory',
  async ({ fileId, indexer, category }, { dispatch }) => {
    if (!indexer) {
      console.warn(`unlinkFileFromCategory called with null indexer for file ${fileId}`);
      return;
    }
    if (!category) {
      console.warn(`unlinkFileFromCategory called without category for file ${fileId}`);
      return;
    }
    dispatch(
      fileActions.editIndexedCategories({
        id: fileId,
        category,
        indexer,
        edit: 'remove',
      }),
    );
  },
);

export const linkFileToCategory = createAsyncThunk(
  'files/linkFileToCategory',
  async ({ fileId, indexer, category }, { dispatch }) => {
    if (!indexer) {
      console.warn(`linkFileToCategory called with null indexer for file ${fileId}`);
      return;
    }
    if (!category) {
      console.warn(`linkFileToCategory called without category for file ${fileId}`);
      return;
    }
    dispatch(
      fileActions.editIndexedCategories({
        id: fileId,
        category,
        indexer,
        edit: 'add',
      }),
    );
  },
);

export const addOpenedCatAndSetShouldOpen = createAsyncThunk(
  'files/addOpenedCatAndSetShouldOpen',
  async ({ fileId, tabId = fileId }, { dispatch }) => {
    if (!fileId) {
      console.error('invalid id to register', fileId);
      return false;
    }

    dispatch(fileActions.setOpenState({ id: fileId }));

    await dispatch(
      linkFileToCategory({
        fileId,
        indexer: tabId,
        category: FILE_ID_CATEGORIES.OPENED,
      }),
    );

    return true;
  },
);

export const removeOpenedCat = createAsyncThunk(
  'files/removeOpenedCat',
  async ({ fileId, tabId = fileId }, { dispatch, getState }) => {
    try {
      if (!fileId) {
        console.error('invalid id to unregister', fileId);
        return { success: false, fileId, tabId };
      }

      const state = getState();
      const openedForIndexers = selectOpenedIndexersForFile(state, fileId);

      if (openedForIndexers.includes(tabId)) {
        await dispatch(
          unlinkFileFromCategory({
            fileId,
            indexer: tabId,
            category: FILE_ID_CATEGORIES.OPENED,
          }),
        );
        dispatch(fileActions.setOpenState({ id: fileId, openState: OPEN_STATES.CLOSED }));
        console.log('unlinked and closed', fileId);
      } else {
        console.error(`File ${fileId} is not opened tab for ${tabId}`);
        return { success: false, fileId, tabId };
      }

      return { success: true, fileId, tabId };
    } catch (error) {
      console.error('Failed remove opened category form file', fileId);
      return { success: false, fileId, tabId };
    }
  },
);

export const deindexPreview = createAsyncThunk(
  'files/unlinkPreview',
  async ({ packageId, fileId }, { dispatch, getState }) => {
    const state = getState();
    const previewForIndexers = selectPreviewIndexersForFile(state, fileId);

    if (previewForIndexers.includes(packageId)) {
      dispatch(
        unlinkFileFromCategory({
          fileId,
          indexer: packageId,
          category: FILE_ID_CATEGORIES.PREVIEW,
        }),
      );
    } else {
      console.error(`File ${fileId} is not linked as preview in package ${packageId}`);
    }

    return { packageId, fileId };
  },
);

export const indexPreview = createAsyncThunk(
  'files/linkPreview',
  async ({ packageId, fileId }, { dispatch }) => {
    dispatch(linkFileToCategory({ indexer: packageId, fileId, category: FILE_ID_CATEGORIES.PREVIEW }));

    return { packageId, fileId };
  },
);

export const indexToPackage = createAsyncThunk(
  'files/indexToPackage',
  async ({ packageId, fileId }, { dispatch }) => {
    dispatch(linkFileToCategory({ indexer: packageId, fileId, category: FILE_ID_CATEGORIES.PACKAGE }));

    return { packageId, fileId, category: FILE_ID_CATEGORIES.PACKAGE };
  },
);

export const checkFileEntry = createAsyncThunk(
  'files/checkFileEntry',
  async (fileId, { getState }) => {
    const isPresent = isFileInState(getState(), fileId);
    return isPresent;
  },
);
