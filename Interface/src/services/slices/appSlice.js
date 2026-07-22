import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  rootPath: null, // Full or display path of selected root
  error: null, // Any global error to show in top-level UI
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setRootPath(state, action) {
      state.rootPath = action.payload ?? null;
    },
    setAppError(state, action) {
      state.error = action.payload;
    },
    clearAppError(state) {
      state.error = null;
    },
    resetAppState() {
      return initialState;
    },
  },
});

export default appSlice.reducer;
export const appActions = appSlice.actions;
