import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  packages: [],
  settings: {
    isSavingPackageOnClose: false,
  },
};

const packagesSlice = createSlice({
  name: 'packages',
  initialState,
  reducers: {
    createPackageEntry: (state, action) => {
      const {
        id,
        name = '',
        shouldOpen = false,
        hash = null,
        isOpened = false,
        packageFilesIdsOnInit = [],
      } = action.payload;

      if (!state.packages.some((file) => file.id === id)) {
        state.packages.push({
          id, name, shouldOpen, hash, isOpened, packageFilesIdsOnInit,
        });
      } else {
        console.warn('duplication of opened');
      }
    },
    setShouldOpen: (state, action) => {
      const { id, shouldOpen = true, hasOpened = false } = action.payload;

      const packageEntry = state.packages.find((p) => p.id === id);
      if (packageEntry) {
        if (packageEntry?.isOpened) return;
        packageEntry.shouldOpen = shouldOpen;
        if (hasOpened) packageEntry.isOpened = hasOpened;
      } else {
        console.error('No files to mark shouldPpen');
      }
    },
    deletePackageEntry: (state, action) => {
      const { id } = action.payload;
      state.packages = state.packages.filter((p) => p.id !== id);
    },
    setIsSavingPackageOnClose: (state, action) => {
      const bool = action.payload;
      if (bool == null) console.error('Nullish value instead of bool');
      state.settings.isSavingPackageOnClose = bool;
    },
  },
});

export const packageActions = packagesSlice.actions;
export default packagesSlice.reducer;
