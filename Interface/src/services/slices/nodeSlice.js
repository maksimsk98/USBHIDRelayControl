import { createSlice } from '@reduxjs/toolkit';
import { merge } from 'lodash';
import { DETECTOR_TYPES } from '../../constants/constants';
import { testTagger } from '../../utils/classes/TestTagger';



const initialState = {
  data: {
    firmwareVersions: {},
    nodesPort: 'usb',
    withoutControl: false,
    pumps: {
      count: 1,
      chosenPumps: {
        A1: '',
        A2: '',
        B1: '',
        B2: '',
      },
      availablePumps: [],
      pumpsMeta: {
        A1: {
          type: null,
        },
        A2: {
          type: null,
        },
        B1: {
          type: null,
        },
        B2: {
          type: null,
        },
      },
    },
    degasser: {
      chosenDegasser: '',
      availableDegassers: [],
    },
    thermostat: {
      chosenThermostat: '',
      availableThermostats: [],
    },
    autosampler: {
      ip: '',
      getIpAuto: false,
      type: 'none',
      availableAutosamplerIps: [],
    },
    detector: {
      type: DETECTOR_TYPES.SPHDETECTOR2,
      portType: 'usb',
      chosenDetector: '',
      detectorSerialNumber: null,
      availableDetectors: {
        [DETECTOR_TYPES.SPHDETECTOR2]: [],
        [DETECTOR_TYPES.PANORAMA2]: [],
        [DETECTOR_TYPES.SPHDETECTOR]: [],
        [DETECTOR_TYPES.PANORAMA]: [],
        [DETECTOR_TYPES.FLUORAT]: [],
      },
    },
    comPortList: [],
  },
  isLoading: false,
  error: null,
  ownersSnapshot: null,
};

const assignConfigData = (state, chromatographToSet, setIfNotAvailable = true) => {
  const storedAutosampler = state.data.autosampler;
  const storedDetector = state.data.detector;
  const storedPumps = state.data.pumps;
  const storedThermostat = state.data.thermostat;
  const storedDegasser = state.data.degasser

  const allow = (available, value) =>
    setIfNotAvailable || available?.includes?.(value);

  // Autosampler update
  const newAutosampler = chromatographToSet.autosampler;
  if (newAutosampler) {
    storedAutosampler.ip = newAutosampler.ip;
    storedAutosampler.getIpAuto = newAutosampler.isGetIpAuto;
    storedAutosampler.type = newAutosampler.type;
    storedAutosampler.comPort = newAutosampler.comPort
  }

  // Detector update
  const newDetector = chromatographToSet.detector;
  if (newDetector) {
    const { type: newDetectorType, name: newDetectorName, portType: newPortType } = newDetector;
    if (storedDetector.availableDetectors.hasOwnProperty(newDetectorType)) {
      if (allow(storedDetector.availableDetectors[newDetectorType], newDetectorName)) {
        storedDetector.chosenDetector = newDetectorName;
      } else {
        storedDetector.chosenDetector = '';
      }
    }
    storedDetector.portType = newPortType;
    storedDetector.type = newDetectorType;
  }

  // Pumps update
  const newPumps = chromatographToSet.pumps;
  if (newPumps) {
    Object.keys(newPumps).forEach((pumpKey) => {
      const pumpName = newPumps[pumpKey];

      if (allow(storedPumps.availablePumps, pumpName)) {
        storedPumps.chosenPumps[pumpKey] = pumpName;
      } else {
        storedPumps.chosenPumps[pumpKey] = '';
      }
    });
  }

  // Thermostat update
  const newThermostat = chromatographToSet.thermostat;
  if (newThermostat) {
    if (allow(storedThermostat.availableThermostats, newThermostat.name)) {
      storedThermostat.chosenThermostat = newThermostat.name;
    } else {
      storedThermostat.chosenThermostat = '';
    }
  }

  const newDegasser = chromatographToSet.degasser;
  if (newDegasser) {
    if (allow(storedDegasser.availableDegassers, newDegasser.name)) {
      storedDegasser.chosenDegasser = newDegasser.name;
    } else {
      storedDegasser.chosenDegasser = '';
    }
  }

  // Direct updates for nodesPort and pumpCount
  state.data.nodesPort = chromatographToSet.portType;
  state.data.pumps.count = chromatographToSet.pumpCount;
  state.data.withoutControl = chromatographToSet.withoutControl;
};

/* eslint-disable no-param-reassign */
const nodeSlice = createSlice({
  name: 'nodes',
  initialState,
  reducers: {
    updateNodesParams: (state, action) => {
      const newConfig = action.payload;
      merge(state.data, newConfig);
    },
    updateNodesFromConfig: (state, action) => {
      const chromatographToSet = action.payload;
      if (chromatographToSet) {
        assignConfigData(state, chromatographToSet);

        testTagger.setFlag('nodesFromConfig')
        testTagger.addLog(`[TEST] set ${chromatographToSet} config`);
      }
    },
    setAvailableNodes: (state, action) => {
      const {
        pumps, thermostats, autosamplerIps, detectors, degassers, comPortList
      } = action.payload;

      state.data.pumps.availablePumps = pumps;
      state.data.thermostat.availableThermostats = thermostats;
      state.data.autosampler.availableAutosamplerIps = autosamplerIps;      
      state.data.detector.availableDetectors = detectors;
      state.data.degasser.availableDegassers = degassers;
      state.data.comPortList = comPortList
    },
    setOwnersSnapshot: (state, action) => {
      const ownersSnapshot = action.payload;
      state.ownersSnapshot = ownersSnapshot;
    },
    setFirmwareVersions: (state, action) => {
      const versions = action.payload;
      if (versions) state.data.firmwareVersions = versions;
    },
    setPumpsMeta: (state, action) => {
      const { pumpsMeta } = action.payload;
      state.data.pumps.pumpsMeta = pumpsMeta;
    },
    setDetectorSerialNum: (state, action) => {
      const serialNumber = action.payload;
      state.data.detector.detectorSerialNumber = serialNumber;
    },
    setIsLoading: (state, action) => {
      const status = action.payload;
      state.isLoading = status;
    },
  },
});
/* eslint-disable no-param-reassign */

export default nodeSlice.reducer;
export const nodeActions = nodeSlice.actions;
