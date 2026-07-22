export const selectSpectroMisc = (state, tabId) => state.spectroMiscReducer.entries[tabId];

export const selectSpectroThreshold = (state, tabId) => state.spectroMiscReducer.entries[tabId]?.threshold;

export const selectSpectroFactor = (state, tabId) => state.spectroMiscReducer.entries[tabId]?.factor;

export const selectSpectroHasSmoothing = (state, tabId) => state.spectroMiscReducer.entries[tabId]?.hasSmoothing;

export const selectSpectroHasScaling = (state, tabId) => state.spectroMiscReducer.entries[tabId]?.hasScaling;

export const selectSpectroSelectedBackgroundIndex = (state, tabId) => state.spectroMiscReducer.entries[tabId]?.selectedBackgroundIndex ?? null;
