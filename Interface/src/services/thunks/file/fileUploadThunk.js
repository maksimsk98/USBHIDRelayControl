import { createAsyncThunk } from '@reduxjs/toolkit';
import addChromaThunk from '../addChromaThunk';

// base
import {
  selectAllFiles, errorsActions, fileActions, selectAllFilesIds, selectAllFullFilesIds,
} from '../../reduxImportDispatcher';
import {
  FILE_ID_CATEGORIES, FILE_TYPES, PURE_GET_CATEGORIES,
} from '../../../constants/constants';
import { hashBlobSHA256 } from '../../../utils/hash';
import { fileIdGenerator } from '../../../utils/shared/fileIdGenerator';
import { getDifAndInter } from '../../../utils/lodashish';
import { addPackageAndFilesEntriesThunk } from '../package/packageThunks';
import { addOpenedCatAndSetShouldOpen, indexPreview, indexToPackage } from './fileThunks';
import { addSpectroThunk } from '../addSpectroThunk';
import { axiosSession } from '../../axiosConfig';

const { OPENED } = FILE_ID_CATEGORIES;

export const processUploadedFilesThunk = createAsyncThunk(
  'files/processUploaded',
  async (
    {
      filesData,
      config = {}, // { shouldOpen }
      meta = {}, // { category, packageId }
    },
    { dispatch, rejectWithValue },
  ) => {
    try {
      const { shouldOpen = false } = config;
      const { category = OPENED, packageId = null } = meta;

      const processedFiles = [];
      const rejectedFiles = [];

      for (const dataItem of filesData) {
        const {
          fileName, data, hash, path, fileType, resolverKey,
        } = dataItem;
        if (dataItem.status === 'fulfilled') {
          if (fileType === FILE_TYPES.unsupported) {
            console.warn('Unsupported file opened', dataItem);
            rejectedFiles.push({
              fileName,
              data,
              hash,
              fileType,
              path,
              resolverKey,
            });
            continue;
          }

          processedFiles.push({
            fileName,
            data,
            hash,
            path,
            fileType,
            resolverKey,
          });
        } else {
          rejectedFiles.push({
            fileName,
            data,
            hash,
            path,
            fileType,
            resolverKey,
          });
        }
      }

      for (const file of processedFiles) {
        const {
          fileName,
          data: loadedData,
          hash: fileHash,
          path,
          fileType = FILE_TYPES.chroma,
          resolverKey,
        } = file;

        const actualType = loadedData?.type ?? fileType;

        if (actualType === FILE_TYPES.chroma) {
          const preId = fileName || 'chromatographicFile';
          await dispatch(
            addChromaThunk({
              preId,
              loadedData,
              shouldOpen,
              fileCategory: category,
              fileHash,
              packageId,
              path,
            }),
          );
        } else if (actualType === FILE_TYPES.package) {
          console.log(loadedData);
          await dispatch(
            addPackageAndFilesEntriesThunk({
              packageId: resolverKey,
              packageName: fileName,
              packageHash: fileHash,
              filesData: loadedData,
            }),
          );
        } else if (actualType === 'spectroscopic') {
          const preId = fileName || 'spectroscopicFile';
          await dispatch(addSpectroThunk({
            preId,
            loadedData,
            shouldOpen,
            fileCategory: category,
            path,
            fileHash,
            packageId,
          }));
        }
      }

      return { processedFiles, rejectedFiles };
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to process uploaded files');
    }
  },
);

export const uploadFilesAndAddEntries = createAsyncThunk(
  'files/uploadFilesAndAddEntries',
  async (
    {
      files,
      descriptors = [], // purer route just use descriptor avoiding side effects AMAP
      config: { shouldOpen = false } = {},
      meta: { category = OPENED, packageId = null } = {},
    },
    { dispatch, getState },
  ) => {
    const state = getState();
    const toUpload = [];
    const uploadHashes = [];
    const repeatedIds = new Set(); // de-dup

    if (!descriptors.length) {
      const existingIds = new Set(
        selectAllFiles(state).map((f) => f.id),
      );
      const incoming = Array.from(files);
      const incomingHashes = await Promise.all(incoming.map(hashBlobSHA256));

      for (let i = 0; i < incoming.length; i += 1) {
        const file = incoming[i];
        const hash = incomingHashes[i];
        const id = fileIdGenerator.getId(file.name, hash);

        if (existingIds.has(id)) {
          repeatedIds.add(id);
        } else {
          toUpload.push(file);
          uploadHashes.push(hash);
        }
      }

      if (repeatedIds.size) {
        console.log('repeat upload of some files by name+hash', { repeatedIds: [...repeatedIds] });
        if (shouldOpen) {
          for (const id of repeatedIds) {
            dispatch(fileActions.setOpenState({ id }));
          }
        }
      }

      if (toUpload.length === 0) {
        console.log('no new files by hash, repeated name+hashes', [...repeatedIds]);
        return [];
      }
    } else {
      descriptors.forEach((d) => {
        toUpload.push(d.file);
        uploadHashes.push(d.hash);
      });
    }

    // Build FormData only for new files
    const formData = new FormData();
    toUpload.forEach((f) => formData.append('files', f));
    formData.append('hashes', JSON.stringify(uploadHashes));

    const headers = {
      'Content-Type': 'multipart/form-data',
    };
    const axiosOpts = { headers, params: { packageId } };

    try {
      let response;
      if (category === FILE_ID_CATEGORIES.OPENED) {
        response = await axiosSession.post(
          '/api/files/upload',
          formData,
          axiosOpts,
        );
      } else if (PURE_GET_CATEGORIES.includes(category)) {
        response = await axiosSession.post(
          '/api/files/pureGetFilesData',
          formData,
          axiosOpts,
        );
      }

      if (!response) throw new Error('no response for upload or get pure');

      const { processedFiles, rejectedFiles } = await dispatch(processUploadedFilesThunk({
        filesData: response.data.responseData,
        config: { shouldOpen },
        meta: { packageId, category },
      })).unwrap();
      return { processedFiles, rejectedFiles };
    } catch (error) {
      console.error('Error uploading file:', error);
      return { processedFiles: [], rejectedFiles: [] };
    }
  },
);

export const openHashedFilesByPath = createAsyncThunk(
  'files/openHashedFilesByPath',
  async ({ entries }, { dispatch, getState }) => {
    try {
      console.groupCollapsed('open by abs path');
      console.log('[openHashedFilesByPath] incoming entries:', entries);

      const state = getState();
      const allFiles = selectAllFiles(state);
      const existingIdsArr = selectAllFullFilesIds(state);
      const existingIds = new Set(existingIdsArr);

      console.log('[openHashedFilesByPath] existing file IDs (hashes):', Array.from(existingIds));

      // Dedupe step
      const unique = [];
      const seen = new Set();

      for (const entry of entries) {
        const {
          path, fileName, hash, id,
        } = entry;

        if (!hash || !id) {
          console.warn('[openHashedFilesByPath] skip: missing hash/id →', entry);
          continue;
        }

        if (existingIds.has(id)) {
          console.log(`[openHashedFilesByPath] skip already opened id=${id}, path=${path}`);
          dispatch(fileActions.setShouldFocus({ id }));
          continue;
        }
        if (seen.has(id)) {
          console.log(`[openHashedFilesByPath] skip duplicate in batch id=${id}, path=${path}`);
          continue;
        }

        seen.add(id);
        unique.push(entry);
      }

      console.log('[openHashedFilesByPath] unique entries to upload:', unique);

      // Nothing to upload
      if (unique.length === 0) {
        console.log('[openHashedFilesByPath] nothing new to upload → early return []');
        return [];
      }

      // Extract only paths for legacy rails
      const filePathsToOpen = unique.map((e) => e.path);

      console.log('[openHashedFilesByPath] delegating to openFileByPath with paths:', filePathsToOpen);

      // Reuse old backend flow
      const result = await dispatch(
        openFileByPath({ filePathsToOpen }),
      ).unwrap();

      console.log('[openHashedFilesByPath] result from openFileByPath:', result);

      console.groupEnd();
      return result;
    } catch (error) {
      console.error('[openHashedFilesByPath] ERROR:', error);
      console.groupEnd();
      return [];
    }
  },
);

export const openFileByPath = createAsyncThunk(
  'files/uploadFilesByPath',
  async ({ filePathsToOpen }, { dispatch, getState, rejectWithValue }) => {
    try {
      const state = getState();

      const dataTosend = {
        filePathsToOpen,
        parseNameFromPath: true,
      };

      const response = await axiosSession.post('/api/files/upload', dataTosend);

      const { processedFiles, rejectedFiles } = await dispatch(processUploadedFilesThunk({
        filesData: response.data.responseData,
        config: { shouldOpen: true },
        meta: { category: FILE_ID_CATEGORIES.OPENED },
      })).unwrap();
      return processedFiles; // WATCHLIST no need for rejected here atm, but watch the shape
    } catch (error) {
      console.error('Error uploading file:', error);
      return [];
    }
  },
);

// One function to open 1 or many
// Accepts: handle | handle[] | [{ relPath, handle }, ...]

const getFilesFromHandles = async (inputHandle) => {
  const settled = await Promise.allSettled(
    (Array.isArray(inputHandle) ? inputHandle : [inputHandle]).map(async (it) => {
      const handle = it?.handle ?? it;
      if (typeof handle?.getFile !== 'function') {
        return Promise.reject(new Error('Bad handler: missing getFile()'));
      }

      let result;
      try {
        result = await handle.getFile();
      } catch (err) {
        console.error('Error in getFile():', err);
        throw err;
      }

      // ---- Environment-aware reconstruction ----
      // Browser: returns a real File already
      if (result instanceof File) return result;

      // Electron: our virtual result has arrayBuffer + metadata
      if (result?.arrayBuffer && result?.name) {
        const {
          arrayBuffer, name, type, lastModified,
        } = result;
        const reconstruct = new File([arrayBuffer], name, { type, lastModified });
        return reconstruct;
      }

      throw new Error('Unrecognized getFile() result shape');
    }),
  );

  const files = settled
    .filter((r) => r.status === 'fulfilled')
    .map((r) => r.value);

  const errors = settled
    .filter((r) => r.status === 'rejected')
    .map((r) => r.reason);

  return { files, errors, settled };
};

const thunkMapPerIndexingCategory = {
  [FILE_ID_CATEGORIES.PACKAGE]: indexToPackage,
  [FILE_ID_CATEGORIES.PREVIEW]: indexPreview,
};

export const openFromHandle = createAsyncThunk(
  'files/openFromHandle',
  async (
    {
      inputHandle,
      config: { shouldOpen = false } = {},
      meta: { category = FILE_ID_CATEGORIES.OPENED, packageId = null, initiator = null } = {},
    },
    { dispatch, getState },
  ) => {
    const { files, errors } = await getFilesFromHandles(inputHandle);
    if (errors.length) {
      console.error('Some errors occurred while getting files from handles:', errors);
      dispatch(errorsActions.logError({ message: 'Some files could not be accessed.', details: errors.map((e) => e.message) }));
    }

    if (files.length === 0) return [];

    const incoming = Array.from(files);
    const incomingHashes = await Promise.all(incoming.map(hashBlobSHA256));

    console.log('openFromHandle: metadata:', initiator ? { initiator } : {}, 'files to process:', incoming);

    const descriptors = incoming.map((file, i) => ({
      file,
      name: file.name,
      hash: incomingHashes[i],
      id: fileIdGenerator.getId(file.name, incomingHashes[i]),
    }));
    const toProcessIds = descriptors.map((d) => d.id);

    const state = getState();
    const allFileIds = selectAllFilesIds(state);

    let newIds = [];
    let registeredRepeats = [];

    if (category === FILE_ID_CATEGORIES.OPENED) {
      const allFullFileIds = selectAllFullFilesIds(state);
      const { dif: newFullFileIdsForStore, inter: alreadyPresentInStore } = getDifAndInter(toProcessIds, allFullFileIds);

      alreadyPresentInStore.forEach((id) => dispatch(addOpenedCatAndSetShouldOpen({ fileId: id })));

      newIds = newFullFileIdsForStore;
      registeredRepeats = alreadyPresentInStore;
    } else if (PURE_GET_CATEGORIES.includes(category) && packageId) {
      const { dif: newNonFullFileIdsForStore, inter: alreadyPresentInStore } = getDifAndInter(toProcessIds, allFileIds);

      alreadyPresentInStore.forEach((id) => {
        const thunk = thunkMapPerIndexingCategory[category];
        if (!thunk) console.error(`No handler for category ${category}. Id ${id} not processed`);
        else dispatch(thunk({ packageId, fileId: id }));
      });

      newIds = newNonFullFileIdsForStore;
      registeredRepeats = alreadyPresentInStore;
    }

    const newIdsSet = new Set(newIds);

    const toUpload = descriptors.filter((d) => newIdsSet.has(d.id));
    if (!toUpload.length) {
      return { uploaded: [], registeredRepeats, rejectedFiles: [] };
    }
    const { processedFiles, rejectedFiles } = await dispatch(uploadFilesAndAddEntries({
      descriptors: toUpload,
      config: { shouldOpen },
      meta: { category, packageId },
    })).unwrap();
    // we need to map handles to keys in tab
    return { uploaded: processedFiles, registeredRepeats, rejectedFiles };
  },
);

export const openFilesByAbsolutePathWithHash = createAsyncThunk(
  'files/openByAbsolutePath',
  async ({ paths }, { dispatch, rejectWithValue }) => {
    try {
      if (!paths || (Array.isArray(paths) && paths.length === 0)) {
        return [];
      }

      const list = Array.isArray(paths) ? paths : [paths];

      const prepared = [];

      for (const p of list) {
        const res = await window.electronAPI.prepareEntryFromPath(p);

        if (!res?.ok || !res.entry) {
          console.warn('[openByAbsolutePath] failed to prepare', p, res);
          continue;
        }

        prepared.push(res.entry);
      }

      if (!prepared.length) {
        console.warn('[openByAbsolutePath] nothing valid to open');
        return [];
      }

      const result = await dispatch(
        openHashedFilesByPath({ entries: prepared }),
      ).unwrap();

      return result ?? [];
    } catch (err) {
      console.error('[openByAbsolutePath] fatal', err);
      return rejectWithValue(err?.message || 'openByAbsolutePath failed');
    }
  },
);
