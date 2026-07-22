export const selectPassportData = (state, measurementId) => state.passportReducer[measurementId];

export const selectSampleName = (state, tabId) => state.passportReducer[tabId]?.sampleName ?? '';
