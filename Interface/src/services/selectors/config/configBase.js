import { createSelector } from '@reduxjs/toolkit';
import { EMPTY_OBJECT } from '../../../constants/constants';

export const selectChromatographConfigs = (state) => state.config.chromatograph.configs;

export const selectChromatographOptions = createSelector(
  [selectChromatographConfigs],
  (configs) => Object.keys(configs), // Derive chromatograph options from object keys
);



export const selectSelectedChromatograph = (state) => state.config.chromatograph.selectedChromatograph;

export const selectSelectedChromatographData = createSelector(
  [selectChromatographConfigs, selectSelectedChromatograph],
  (configs, selectedChromatograph) => {
    // Return the chromatograph data based on selectedChromatograph
    const result = { ...configs[selectedChromatograph], chromatographName: selectedChromatograph } ?? null;
    return result;
  },
);

export const selectChromatographData = createSelector(
  [selectChromatographConfigs, (state, chromatograph) => chromatograph],
  (configs, chromatograph) =>
    // Return the chromatograph data based on selectedChromatograph
    configs[chromatograph] ?? EMPTY_OBJECT,

);

export const selectBuildInfo = (state) => state.config.buildInfo;

export const selectBackendVersion = (state) => state.config.buildInfo.backendVersion;

export const selectSaveProtocol = (state) => state.config.saveOperationalData.saveProtocol;

export const selectSaveJournal = (state) => state.config.saveOperationalData.saveJournal;

export const selectLastUsedMethod = (state) => state.config.templates.lastUsed ?? null;

export const selectConfigFolders = (state) => state.config.folders;

export const selectResultsFolder = (state) => state.config.folders.results;

export const selectTemplatesFolder = (state) => state.config.folders.templates;

export const selectTemporaryFolder = (state) => state.config.folders.temporary;

export const selectChromatographOwnership = state =>
  state.config.chromatograph.ownership;

export const selectChromatographOwner = (state, name) =>
  state.config.chromatograph.ownership[name] ?? null;

