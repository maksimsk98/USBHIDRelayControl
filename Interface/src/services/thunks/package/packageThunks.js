import { createAsyncThunk } from '@reduxjs/toolkit';

import {
  packageActions, selectFileEntry,
} from '../../reduxImportDispatcher';

import { FILE_ID_CATEGORIES } from '../../../constants/constants';
import addChromaThunk from '../addChromaThunk';
import { fileIdGenerator } from '../../../utils/shared/fileIdGenerator';
import { selectPackageChangesIfAltered } from '../../selectors/packages/packageComposite';
import { hashObjectSHA256 } from '../../../utils/hash';
import { axiosSession } from '../../axiosConfig';

export const initLocalPackage = ({
  id, name, hash = null, packageFilesIdsOnInit = [],
}) => (dispatch, getState) => {
  dispatch(packageActions.createPackageEntry({
    id,
    name,
    shouldOpen: true,
    hash,
    isOpened: false,
    packageFilesIdsOnInit,
  }));
};

export const initPackage = createAsyncThunk(
  'packages/init',
  async ({ id, name }, { dispatch, getState, rejectWithValue }) => {
    try {
      const response = await axiosSession.post(
        '/api/packages/createPackage',
        { packageId: id },
      );

      dispatch(initLocalPackage({ id, name }));

      return response.status >= 200 && response.status < 300;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  },
);

export const addPackageAndFilesEntriesThunk = createAsyncThunk(
  'packages/addPackageAndFilesEntries',
  async ({
    packageId, packageName, packageHash = null, filesData = [],
  }, thunkApi) => {
    const { dispatch, getState } = thunkApi;
    const state = getState();
    const packageFilesIdsOnInit = [];

    for (const file of filesData) {
      const fileName = file?.fileName ?? fileIdGenerator.getNoName();

      const fileHash = file?.hash
        ?? (await hashObjectSHA256(file))
        ?? fileIdGenerator.getNextNoHash();

      const fileId = fileIdGenerator.getId(fileName, fileHash);
      packageFilesIdsOnInit.push(fileId);

      const existing = selectFileEntry(state, fileId);
      if (existing != null) {
        console.warn('package internal file is already present in state', fileId);
        continue;
      }

      await dispatch(
        addChromaThunk({
          preId: fileName,
          loadedData: file,
          shouldOpen: false,
          fileCategory: FILE_ID_CATEGORIES.PACKAGE,
          fileHash,
          packageId,
        }),
      );
    }

    dispatch(
      packageActions.createPackageEntry({
        id: packageId,
        name: packageName,
        shouldOpen: true,
        hash: packageHash,
        isOpened: false,
        packageFilesIdsOnInit,
      }),
    );

    return { packageId, packageFilesIdsOnInit };
  },
);

export const savePackage = createAsyncThunk(
  'packages/save',
  async ({ id }, { dispatch, getState, rejectWithValue }) => {
    try {
      const state = getState();

      const changes = selectPackageChangesIfAltered(state, id);

      if (!changes) {
        console.log('Save on no changes');
        return true;
      }

      const { deletedFilesIndexes = [], filesIdsToAppend = [] } = changes;

      const response = await axiosSession.post(
        '/api/packages/savePackage',
        {
          packageId: id,
          deletedFilesIndexes,
    				filesIdsToAppend,
        },
      );

      return response.status >= 200 && response.status < 300;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  },
);

export const closePackage = createAsyncThunk(
  'packages/close',
  async ({ id, needsToSave }, { dispatch, getState, rejectWithValue }) => {
    try {
      const state = getState();

      if (needsToSave) {
        const hasSaved = await dispatch(savePackage({ id }));
        if (!hasSaved) throw new Error('failed saving on close');
      }

      dispatch(packageActions.deletePackageEntry({ id }));

      const response = await axiosSession.post(
        '/api/packages/closePackage',
        {
          packageId: id,
        },
      );

      return response.status >= 200 && response.status < 300;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  },
);
