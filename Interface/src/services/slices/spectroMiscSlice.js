import { createSlice } from '@reduxjs/toolkit';
import { SPECTRO_MISC_WHITELIST } from '../../constants/constants';

const DEFAULTS = {
  threshold: 1,
  factor: 1.0,
  hasSmoothing: true,
  hasScaling: true,

  selectedBackgroundIndex: 0,
};

const initialState = {
  entries: {}, // { [tabId]: { threshold, factor, hasSmoothing, hasScaling } }
};

const ensureEntry = (state, tabId) => {
  if (!state.entries[tabId]) {
    state.entries[tabId] = { ...DEFAULTS };
  }
};

const spectroMiscSlice = createSlice({
  name: 'spectroMisc',
  initialState,
  reducers: {
    addSpectro(state, action) {
      const { tabId, initData = {} } = action.payload;

      const { selectedBackgroundIndex, ...toFilter } = initData;

      // Remove all nullish values (null or undefined)
      const filtered = Object.fromEntries(
        Object.entries(toFilter)
          .filter(([k, v]) => SPECTRO_MISC_WHITELIST.includes(k) && v != null),
      );

      if (!state.entries[tabId]) {
        state.entries[tabId] = { ...DEFAULTS, selectedBackgroundIndex, ...filtered };
      }
    },
    setThreshold(state, action) {
      const { tabId, value } = action.payload;
      ensureEntry(state, tabId);
      state.entries[tabId].threshold = value;
    },
    setFactor(state, action) {
      const { tabId, value } = action.payload;
      ensureEntry(state, tabId);
      state.entries[tabId].factor = value;
    },
    applyFactorAndThreshold(state, action) {
      const { tabId, threshold, factor } = action.payload;
      ensureEntry(state, tabId);
      state.entries[tabId].threshold = threshold;
      state.entries[tabId].factor = factor;
    },
    setHasSmoothing(state, action) {
      const { tabId, value } = action.payload;
      ensureEntry(state, tabId);
      state.entries[tabId].hasSmoothing = value;
    },

    setHasScaling(state, action) {
      const { tabId, value } = action.payload;
      ensureEntry(state, tabId);
      state.entries[tabId].hasScaling = value;
    },

    resetSpectroMisc(state, action) {
      const { tabId } = action.payload;
      ensureEntry(state, tabId);
      state.entries[tabId] = { ...DEFAULTS };
    },

    setSelectedBackgroundIndex(state, action) {
      const { tabId, value } = action.payload;
      ensureEntry(state, tabId);
      state.entries[tabId].selectedBackgroundIndex = value;
    },

    deleteEntry(state, action) {
      const tabId = action.payload;
      if (state.entries[tabId]) {
        delete state.entries[tabId];
      }
    },
  },
});

export const spectroMiscActions = spectroMiscSlice.actions;

export default spectroMiscSlice.reducer;
