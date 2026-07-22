import { createSelector } from '@reduxjs/toolkit';
import { AUTOSAMPLER_TYPES, EMPTY_OBJECT } from '../../../constants/constants';

export const selectAvailablePumps = (state) => state.nodesReducer.data.pumps.availablePumps;
export const selectAvailableThermostats = (state) => state.nodesReducer.data.thermostat.availableThermostats;
export const selectAvailableAutosamplerIps = (state) => state.nodesReducer.data.autosampler.availableAutosamplerIps;
export const selectAvailableComPorts = (state) => state.nodesReducer.data.comPortList;
export const selectAvailableDetectors = (state) => state.nodesReducer.data.detector.availableDetectors;
export const selectAvailableDegassers = (state) => state.nodesReducer.data.degasser.availableDegassers;

export const selectAvailableNodes = createSelector(
  [
    selectAvailablePumps,
    selectAvailableThermostats,
    selectAvailableAutosamplerIps,
    selectAvailableDetectors,
    selectAvailableDegassers,
    selectAvailableComPorts
  ],
  (
    availablePumps,
    availableThermostats,
    availableAutosamplerIps,
    availableDetectors,
    availableDegassers,
    availableComPorts
  ) => ({
    pumps: availablePumps,
    thermostats: availableThermostats,
    autosamplerIps: availableAutosamplerIps,
    detectors: availableDetectors,
    degassers: availableDegassers,
    comPorts: availableComPorts
  }),
);

export const selectPumpsCount = (state) => state.nodesReducer.data.pumps.count;
export const selectChosenPumps = (state) => state.nodesReducer.data.pumps.chosenPumps;
export const selectDetectorType = (state) => state.nodesReducer.data.detector.type;
export const selectChosenDetector = (state) => state.nodesReducer.data.detector.chosenDetector;
export const selectNodesPortType = (state) => state.nodesReducer.data.nodesPort;
export const selectChosenThermostat = (state) => state.nodesReducer.data.thermostat.chosenThermostat;
export const selectAutosamplerType = (state) => state.nodesReducer.data.autosampler.type;
export const selectAutosamplerIpAddress = (state) => state.nodesReducer.data.autosampler.ip;
export const selectAutosamplerAutoIp = (state) => state.nodesReducer.data.autosampler.getIpAuto;
export const selectAutosamplerComPort = (state) => state.nodesReducer.data.autosampler.comPort
export const selectChosenDegasser = (state) => state.nodesReducer.data.degasser.chosenDegasser;
export const selectWithoutControl = (state) => state.nodesReducer.data.withoutControl;

// Unified selector using createSelector
export const selectNodeData = createSelector(
  [
    selectPumpsCount,
    selectChosenPumps,
    selectDetectorType,
    selectChosenDetector,
    selectNodesPortType,
    selectChosenThermostat,
    selectAutosamplerType,
    selectAutosamplerIpAddress,
    selectAutosamplerAutoIp,
    selectAutosamplerComPort,
    selectChosenDegasser,
    selectWithoutControl,
  ],
  (
    pumpsCount,
    chosenPumps,
    detectorType,
    chosenDetector,
    nodesPortType,
    chosenThermostat,
    autosamplerType,
    autosamplerIpAddress,
    autosamplerAutoIp,
    autoPort,
    chosenDegasser,
    withoutControl,
  ) => ({
    pumpsCount,
    chosenPumps,
    detectorType,
    chosenDetector,
    nodesPortType,
    chosenThermostat,
    autosamplerType,
    autosamplerIpAddress,
    autosamplerAutoIp,
    autoPort,
    chosenDegasser,
    withoutControl,
  }),
);

const checkPumpsChosen = (pumpsCount, chosenPumps) => {
  const pumpsToChoose = {
    1: ['A1'],
    2: ['A1', 'B1'],
    4: ['A1', 'A2', 'B1', 'B2'],
  }[pumpsCount];

  const pumps = {};

  for (const pump of pumpsToChoose) {
    if (chosenPumps[pump] === '') pumps[pump] = false;
    else pumps[pump] = true;
  }
  const notSet = Object.entries(pumps).filter(([pump, status]) => !status);
  const missingKeys = notSet.map(([pump, status]) => pump);
  const missingCount = missingKeys.length;
  const hasMissing = missingCount !== 0;
  return { hasMissing, missingCount, missingKeys };
};

export const selectIsAllNodesChosen = createSelector(
  [
    selectPumpsCount,
    selectChosenPumps,
    selectChosenDetector,
    selectChosenThermostat,
    selectAutosamplerType,
    selectAutosamplerIpAddress,
  ],
  (
    pumpsCount,
    chosenPumps,
    chosenDetector,
    chosenThermostat,
    autosamplerType,
    autosamplerIpAddress,
  ) => {
    if (chosenDetector === '' || chosenThermostat === '') {
      return false;
    }

    const { hasMissing } = checkPumpsChosen(pumpsCount, chosenPumps);
    if (hasMissing) return false;

    if (autosamplerType !== 'none' && autosamplerIpAddress === '') {
      return false;
    }

    return true;
  },
);

export const selectAreAllPumpsChosen = createSelector(
  [
    selectPumpsCount,
    selectChosenPumps,
  ],
  (pumpsCount, chosenPumps) => checkPumpsChosen(pumpsCount, chosenPumps),
);

export const selectFirmwareVersions = (state) => state.nodesReducer.data?.firmwareVersions ?? EMPTY_OBJECT;

export const selectIsThermostatChosen = (state) => {
  const { chosenThermostat } = state.nodesReducer.data.thermostat;

  if (
    chosenThermostat === null
    || chosenThermostat === undefined
    || chosenThermostat === '') return false;

  return true;
};

export const selectPumpsMeta = (state) => state.nodesReducer.data.pumps.pumpsMeta;

export const selectPumpsTypes = createSelector(
  [selectPumpsMeta],
  (pumpsMeta) => Object.keys(pumpsMeta).map((pumpKey) => pumpsMeta[pumpKey].type),
);

export const selectIsAutosamplerChosen = createSelector(
  [selectAutosamplerType],
  (autosamplerType) => autosamplerType && autosamplerType !== AUTOSAMPLER_TYPES.none,
);

export const selectNodesIsLoading = (state) => state.nodesReducer.isLoading;

export const selectDetectorSerial = (state) => state.nodesReducer.data?.detector?.detectorSerialNumber;

export const selectOwnersSnapshot = (state) => state.nodesReducer.ownersSnapshot ?? null;

// Base selector: just returns nodes data
export const selectNodesData = (state) => state.nodesReducer.data;
