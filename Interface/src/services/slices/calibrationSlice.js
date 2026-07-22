import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  selectedCalibration: null, // this is needed in case when no measurement opened and there is nothing to bind selection to
  options: {
    null: [{ name: null, type: null }],
  }, // object that will hold calibrations for each method
  openedFileCalibrations: {}, // object that will hold file specific calibrations
  calibrationTabs: [],
  fetchedCalibrationData: {},
};

const calibrationSlice = createSlice({
  name: 'calibration',
  initialState,
  reducers: {
    setCalibrationOptions(state, action) {
      const { method, calibrationList } = action.payload;
      state.options[method] = calibrationList;
    },
    setSelectedCalibration: (state, action) => {
      state.selectedCalibration = action.payload;
    },
    addFileCalibrations: (state, action) => {
      const { fileId, newCalibrations } = action.payload;
      state.openedFileCalibrations[fileId] = newCalibrations;
    },
    addCalibrationTab: (state, action) => {
      const {
        tabId, calibration, originFile = null, method = null, activeComponentIndex = 0,
      } = action.payload;
      state.calibrationTabs.push({
        id: tabId, calibration, originFile, method, activeComponentIndex,
      });
    },
    changeCalibTabCalibration: (state, action) => {
      const { id, calibration } = action.payload;
      const foundTab = state.calibrationTabs.find((tab) => tab.id === id);
      if (foundTab && calibration !== undefined) {
        foundTab.calibration = calibration;
      }
    },
    changeCalibTabMethod: (state, action) => {
      const { id, method } = action.payload;
      const foundTab = state.calibrationTabs.find((tab) => tab.id === id);
      if (foundTab && method !== undefined) {
        foundTab.method = method;
      }
    },
    changeTabActiveComp: (state, action) => {
      const { id, activeComponentIndex } = action.payload;
      const foundTab = state.calibrationTabs.find((tab) => tab.id === id);
      if (foundTab && activeComponentIndex !== undefined) {
        foundTab.activeComponentIndex = activeComponentIndex;
      }
    },
    setFetchedCalibrationData(state, action) {
      const { calibrationTabId, fetchedCalibration } = action.payload;
      state.fetchedCalibrationData[calibrationTabId] = fetchedCalibration;
    },
    markTabForClosure(state, action) {
      const { calibrationTabId } = action.payload;
      const foundTab = state.calibrationTabs.find((tab) => tab.id === calibrationTabId);
      foundTab.markedForClosure = true;
    },
    deleteCalibTabData(state, action) {
      const { calibrationTabId } = action.payload;
      state.calibrationTabs = state.calibrationTabs.filter((tab) => tab.id !== calibrationTabId);
      delete state.fetchedCalibrationData[calibrationTabId];
      console.log('deleted', calibrationTabId);
    },
    setShouldFocus(state, action) {
      const { id, shouldFocus = true } = action.payload;
      const foundTab = state.calibrationTabs.find((tab) => tab.id === id);
      if (!foundTab) return;
      foundTab.shouldFocus = shouldFocus;
    },

  },
});

export const calibrationActions = calibrationSlice.actions;
export default calibrationSlice.reducer;
