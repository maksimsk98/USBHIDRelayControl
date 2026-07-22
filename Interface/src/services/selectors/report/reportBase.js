export const selectSourceIdOfReport = (state) => state.reportReducer.sourceIdOfReport;

export const selectChromaReportCheckboxes = (state, tabId) => state.reportReducer[tabId]?.checkboxes;

export const selectChromaPeaksCheckboxes = (state, tabId) => state.reportReducer[tabId]?.peakTableParams;

export const selectReportData = (state, tabId) => state.reportReducer[tabId];

export const selectReportFreezePlots = (state, parentId) => state.reportReducer[parentId]?.freezePlots ?? false;

export const selectFreezePending = (state, parentId) => state.reportReducer[parentId]?.freezePending ?? 0;

export const selectNoiseEvalParams = (state, parentId) => state.reportReducer[parentId]?.reportCalcParams?.noiseEval ?? null;

export const selectReportCalcParams = (state, parentId) => state.reportReducer[parentId]?.reportCalcParams ?? null;

export const selectReportCalcs = (state, parentId) => state.reportReducer[parentId]?.reportCalcs ?? null;

export const selectNoiseEvalCalc = (state, parentId) => state.reportReducer[parentId]?.reportCalcs?.noiseEval ?? null;
