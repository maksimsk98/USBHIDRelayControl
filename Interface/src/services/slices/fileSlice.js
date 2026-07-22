import { createSlice } from '@reduxjs/toolkit';
import {
  FILE_ID_CATEGORIES, INDEXING_CATEGORIES, INDX_BY_PACK_EDIT_MAP, OPEN_STATES, PURE_GET_CATEGORIES,
} from '../../constants/constants';
import { uniquePush } from '../../utils/baseUtils';

const initialState = {
  files: [], // This will now contain objects with { id, type, method, calibration, loadedDetectorType }
  snapshots: {
    data: {},   // [fileId]: { payload, takenAt }
    method: {}, // [fileId]: { payload, method, takenAt }
  },
};

const fileSlice = createSlice({
  name: 'files',
  initialState,
  reducers: {
    setShouldFocus: (state, action) => {
      const { id, shouldFocus = true } = action.payload;
      const foundFile = state.files.find((f) => f.id === id);
      if (foundFile) foundFile.shouldFocus = shouldFocus;
    },
    openFile: (state, action) => {
      const {
        id,
        name = '', type, method = null,
        calibration = null,
        archiveCalibration = null,
        detectorType,
        openState = OPEN_STATES.CLOSED, category = FILE_ID_CATEGORIES.OPENED,
        hash = null,
        packageId = null,
        isFull,
        path,
      } = action.payload;

      if (!category) return console.warn(`openFile: no category provided for file ${id}`);

      
      const actualFullness = isFull ?? !PURE_GET_CATEGORIES.includes(category);
      /* console.log('payload',action.payload) */
      const existing = state.files.find((file) => file.id === id);
      /* console.log('opening file', id, 'existing:', !!existing, 'isFull:', isFull, 'actualFullness:', actualFullness);
       */
      const isPackageIndexing = INDEXING_CATEGORIES.includes(category);
      const categoryIndex = isPackageIndexing ? packageId : id; // self reference on OPENED
      const indexedCategories = {};
      indexedCategories[category] = [categoryIndex];

      if (existing) {
        if (!existing.isFull && actualFullness) {
          console.log('upgrading existing to full', id);
          existing.isFull = true;
        }

        if (openState === OPEN_STATES.QUEUE) {
          if (existing.openState !== OPEN_STATES.OPENED ) {
            console.log('setting existing opened state', id);
            existing.openState = OPEN_STATES.QUEUE;   
            if (existing.indexedCategories[category]) { // registering additional indexer and category
              existing.indexedCategories[category].uniquePush(categoryIndex);
            } else {
              existing.indexedCategories[category] = [categoryIndex];
            }      
          } else if (existing.openState === OPEN_STATES.OPENED) {
            existing.shouldFocus = true;
            console.warn('duplication of opened refocus', id);
          }
        }
        
        return;
      }

      state.files.push({
        id,
        name,
        type,
        method,
        calibration,
        detectorType,
        hash,
        openState,
        isFull: actualFullness,
        indexedCategories,
        path,
        shouldFocus: false, // on open it is already focused
      });
    },
    editIndexedCategories: (state, action) => {
      const {
        id, category, indexer = id, edit = 'add',
      } = action.payload;
      const file = state.files.find((f) => f.id === id);
      if (!file) return console.warn(`No file for id ${id}`);

      const map = file.indexedCategories ??= {};

      if (edit === 'add') {
        if (!map[category]) map[category] = [];
        uniquePush(map[category], indexer);
      } else if (edit === 'remove') {
        if (!map[category]) return console.warn(`No category ${category} for ${id} to remove indexer ${indexer}`);
        map[category] = map[category]?.filter((i) => i !== indexer);
        if (map[category].length === 0) delete map[category];
      } else {
        console.warn(`Unsupported edit type "${edit}" for file ${id}`);
      }
    },

    editIndexedByPackages: (state, action) => {
      const { id, edit = INDX_BY_PACK_EDIT_MAP.ADD, packageId } = action.payload;

      if (packageId == null) return; // important no falsy ids, cause ids preserve package category from gc

      const foundFile = state.files.find((file) => file.id === id);

      if (!foundFile) return;

      if (edit === INDX_BY_PACK_EDIT_MAP.ADD) {
        uniquePush(foundFile.indexedByPackages, packageId);
      } else if (edit === INDX_BY_PACK_EDIT_MAP.REMOVE) {
        foundFile.indexedByPackages = foundFile.indexedByPackages.filter((id) => packageId !== id);
      }
    },
    removeCategory: (state, action) => {
      const { id, category } = action.payload;
      const file = state.files.find((f) => f.id === id);
      if (file?.indexedCategories?.[category]) {
        delete file.indexedCategories[category];
      }
    },
    setOpenState: (state, action) => {
      const { id, openState = OPEN_STATES.QUEUE } = action.payload;

      const foundFile = state.files.find((file) => file.id === id);
      if (!foundFile) {
        console.error('No file to set open state', id);
        return;
      }

      foundFile.openState = openState;
    },
    deleteEntryIfOrphan: (state, action) => {
      const { id, categoriesToIgnore = [] } = action.payload;
      const file = state.files.find((f) => f.id === id);
      if (!file) {
        console.warn(`No entry for ${id}`);
        return;
      }

      const remainingCategories = Object.keys(file.indexedCategories ?? {}).filter(
        (cat) => !categoriesToIgnore.includes(cat),
      );

      const isOrphan = remainingCategories.length === 0;
      if (isOrphan) {
        state.files = state.files.filter((f) => f.id !== id);
      }
    },
    changeCalibration: (state, action) => {
      const { id, calibration } = action.payload;
      const foundFile = state.files.find((file) => file.id === id);

      if (foundFile && calibration !== undefined) {
        foundFile.calibration = calibration;
      }
    },
    changeMethod: (state, action) => {
      const { id, method } = action.payload;
      const foundFile = state.files.find((file) => file.id === id);

      if (foundFile && method !== undefined) {
        foundFile.method = method;
        foundFile.calibration = null;
      }
    },
    deleteFileEntry: (state, action) => {
      const id = action.payload;
      state.files = state.files.filter((f) => f.id !== id);
      delete state.snapshots.data[id];
      delete state.snapshots.method[id];
    },

    setFileDataSnapshot: (state, action) => {
      const { id, payload, takenAt = Date.now() } = action.payload;

      state.snapshots.data[id] = {
        payload,
        takenAt,
      };
    },

    clearFileDataSnapshot: (state, action) => {
      const { id } = action.payload;
      delete state.snapshots.data[id];
    },

    setFileMethodSnapshot: (state, action) => {
      const {
        id,
        payload,
        method,
        takenAt = Date.now(),
      } = action.payload;

      state.snapshots.method[id] = {
        payload,
        method,
        takenAt,
      };
    },

    clearFileMethodSnapshot: (state, action) => {
      const { id } = action.payload;
      delete state.snapshots.method[id];
    },

  },
});

export const fileActions = fileSlice.actions;
export default fileSlice.reducer;
