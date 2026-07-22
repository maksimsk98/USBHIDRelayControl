import { createSlice } from '@reduxjs/toolkit';
import { SESSION_CHROMATOGRAPH_NAME, SESSION_TEMP_CHROMATOGRAPH } from '../../constants/fallbacks';

const initialState = {
  files: {
    lastDirectory: 'C:/Users/BondarevBE/Desktop/Retinol',
  },
  folders: {
    results: 'C:/Lumex/PeakExpert/DataFiles',
    templates: 'C:/Lumex/PeakExpert/Templates',
    temporary: 'C:/Lumex/PeakExpert/Temp',
  },
  recentFileList: {
    path: [
    ],
  },
  templates: {
    lastUsed: null,
  },
  thermostat: {
    targetTemp: 20,
  },
  chromatograph: {
    configs: {
      [SESSION_CHROMATOGRAPH_NAME]: SESSION_TEMP_CHROMATOGRAPH,
    }, // Holds the actual chromatograph data
    selectedChromatograph: null, // Currently selected chromatograph
    ownership: {}
  },
  saveOperationalData: {
    saveProtocol: true,
    saveJournal: false,
  },
  buildInfo: {
    backendVersion: null,
    buildDate: null,
    buildTime: null,
    fullVersion: null,
  },

};

const configSlice = createSlice({
  name: 'config',
  initialState,
  reducers: {
    setLastDirectory: (state, action) => {
      state.files.lastDirectory = action.payload;
    },
    setResultsFolder: (state, action) => {
      state.folders.results = action.payload;
    },
    setTemplatesFolder: (state, action) => {
      state.folders.templates = action.payload;
    },
    setTemporaryFolder: (state, action) => {
      state.folders.temporary = action.payload;
    },
    addRecentFile: (state, action) => {
      state.recentFileList.path.push(action.payload);
    },
    setLastUsedTemplate: (state, action) => {
      state.templates.lastUsed = action.payload;
    },
    setTargetTemp: (state, action) => {
      state.thermostat.targetTemp = action.payload;
    },
    setSelectedChromatograph: (state, action) => {
      state.chromatograph.selectedChromatograph = action.payload;
    },
    setConfig: (state, action) => {
      const data = action.payload;

      state.chromatograph.configs = data.chromatographs;
      state.chromatograph.selectedChromatograph = data.lastUsedChromatograph;

      if (data.files && data.files.lastDirectory) {
        state.files.lastDirectory = data.files.lastDirectory;
      }

      if (data.folders) {
        if (data.folders.results) {
          state.folders.results = data.folders.results;
        }
        if (data.folders.templates) {
          state.folders.templates = data.folders.templates;
        }
        if (data.folders.temporary) {
          state.folders.temporary = data.folders.temporary;
        }
      }

      if (data.recentFileList && data.recentFileList.path) {
        state.recentFileList.path = data.recentFileList.path;
      }

      if (data.templates && data.templates.lastUsed) {
        state.templates.lastUsed = data.templates.lastUsed;
      }

      if (data.thermostat && data.thermostat.targetTemp !== undefined) {
        state.thermostat.targetTemp = data.thermostat.targetTemp;
      }

      if (data.backendVersion !== undefined) {
        state.buildInfo.backendVersion = data.backendVersion;
      }
      if (data.fullVersion !== undefined) {
        state.buildInfo.fullVersion = data.fullVersion;
      }
      if (data.buildDate !== undefined) {
        state.buildInfo.buildDate = data.buildDate;
      }
      if (data.buildTime !== undefined) {
        state.buildInfo.buildTime = data.buildTime;
      }
      if (data.Settings) {
        const { saveJournal, saveExchangeProtocol } = data.Settings;
        if (saveJournal !== undefined) state.saveOperationalData.saveJournal = data.Settings.saveJournal;
        if (saveExchangeProtocol !== undefined) state.saveOperationalData.saveProtocol = data.Settings.saveExchangeProtocol;
      }
    },
    toggleSaveOperationalData: (state, action) => {
      const type = action.payload;
      if (state.saveOperationalData.hasOwnProperty(type)) {
        state.saveOperationalData[type] = !state.saveOperationalData[type];
      }
    },
    annotateChromatographs: (state, action) => {
      const { sessions } = action.payload;

      const ownership = {};

      for (const sessionId of Object.keys(sessions)) {
        const chromaName = sessions[sessionId]?.chromatographName;
        if (!chromaName) continue;

        ownership[chromaName] = sessionId;
      }

      state.chromatograph.ownership = ownership;
    },

  },
});

export const configActions = configSlice.actions;

export default configSlice.reducer;
