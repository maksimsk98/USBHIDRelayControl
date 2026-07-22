import { SERVICE_NODE_NAMES } from "../constants/constants";

const noneValuesSet = new Set(SERVICE_NODE_NAMES);

export const replaceNoneValues = (value) => noneValuesSet.has(value) ? '' : value;

export const processNodeConfig = (data, nodesForSession) => {
  const resetNodes = [];
  const cleaned = {
    autosampler: { ...data.autosampler },
    detector: { ...data.detector },
    pumps: { ...data.pumps },
    degasser: { ...data.degasser },
    thermostat: { ...data.thermostat },
  };

  const checkNode = (value, list, path) => {
    const cleanedValue = replaceNoneValues(value);
    if (!cleanedValue) return '';
    const node = list.find(n => n.value === cleanedValue);
    if (node && (node.isFree || node.isOwnedByMe)) {
      return cleanedValue;
    } else {
      resetNodes.push(path);
      return '';
    }
  };

  // Autosampler nodes
  cleaned.autosampler.ip = checkNode(
    data.autosampler.ip,
    nodesForSession.autosamplerIps || [],
    'autosampler.ip'
  );
  cleaned.autosampler.comPort = checkNode(
    data.autosampler.comPort,
    nodesForSession.comPortList || [],
    'autosampler.comPort'
  );

  // Detector node (list depends on detector type)
  const detectorType = data.detector.type;
  const detectorList = nodesForSession.detectors?.[detectorType] || [];
  cleaned.detector.chosenDetector = checkNode(
    data.detector.chosenDetector,
    detectorList,
    'detector.name'
  );

  // Pump nodes
  cleaned.pumps.chosenPumps = { ...data.pumps.chosenPumps };
  cleaned.pumps.chosenPumps.A1 = checkNode(
    data.pumps.chosenPumps.A1,
    nodesForSession.pumps || [],
    'pumps.A1'
  );
  cleaned.pumps.chosenPumps.A2 = checkNode(
    data.pumps.chosenPumps.A2,
    nodesForSession.pumps || [],
    'pumps.A2'
  );
  cleaned.pumps.chosenPumps.B1 = checkNode(
    data.pumps.chosenPumps.B1,
    nodesForSession.pumps || [],
    'pumps.B1'
  );
  cleaned.pumps.chosenPumps.B2 = checkNode(
    data.pumps.chosenPumps.B2,
    nodesForSession.pumps || [],
    'pumps.B2'
  );

  // Degasser node
  cleaned.degasser.chosenDegasser = checkNode(
    data.degasser.chosenDegasser,
    nodesForSession.degassers || [],
    'degasser.name'
  );

  // Thermostat node
  cleaned.thermostat.chosenThermostat = checkNode(
    data.thermostat.chosenThermostat,
    nodesForSession.thermostats || [],
    'thermostat.name'
  );

  return { cleanedData: cleaned, resetNodes };
};