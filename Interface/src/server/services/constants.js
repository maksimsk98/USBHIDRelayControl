const DETECTOR_TYPES = {
  PANORAMA: 'Panorama',
  PANORAMA2: 'Panorama2',
  SPHDETECTOR: 'SPhDetector',
  SPHDETECTOR2: 'SPhDetector2',
  FLUORAT: 'Fluorat',
  RID: 'RID',
  DAD: 'DAD',
};

const NODE_STATUSES = {
  CONNECTED: 'connected',
  NOT_CONNECTED: 'notConnected',
  NOT_RESPONSIVE: 'notResponsive',
};

const PUMP_STATES = [
  'FillAirInCamera',
  'FillFinished',
  'DischargeFinished',
  'PressureRelease',
  'PressureIncrease',
  'Wait',
  'Work',
  'Fill',
  'Discharge',
  'FillWait',
  'FillWork',
  'FillFinished',
  'GradientStart',
  'GradientConditioning',
  'GradientWait',
  'GradientStage',
  'NotConnected',
];

/* const PUMP_STATUSES = {
  CONNECTED: 'connected',
  NOT_CONNECTED: 'notConnected',
};
const DETECTOR_STATUSES = {
  CONNECTED: 'connected',
  NOT_CONNECTED: 'notConnected',
};
const THERMOSTAT_STATUSES = {
  CONNECTED: 'connected',
  NOT_CONNECTED: 'notConnected',
}; */

const ESSENTIAL_QUEUE_NAMES = [
  'termostat_reqv', 'termostat_set',
  'pumps_reqv', 'pumps_set',
  'main_reqv', 'main_set',
  'nodes_set', 'nodes_reqv',
  'detector_set', 'detector_reqv',
  'configure_set', 'configure_reqv',
  'errors_reqv',
  'autosampler_set', 'autosampler_reqv',
  'pureData_reqv',
];

const RESETING_SPECTO_OPERATIONS = Object.freeze([
  'changeCorrection', // requires clearing measured & processed
]);

// Temporary constants — backend API currently uses a typo “termostat”.
const THERMOSTAT = 'termostat'  // WATCHLIST TODO it is with typo in api, i can change quickly, backend not so much so i will keep this for ease of future fix
const THERMOSTAT_STATE = 'termostatState'

const MODULE_BASES = [
  'main',
  'pumps',
  'nodes',
  'detector',
  'configure',
  'errors',
  'autosampler',
  'pureData',
  THERMOSTAT
];

const SESSION_CHROMATOGRAPH_NAME = "_sessionTemp";

const SESSION_TEMP_CHROMATOGRAPH = {
  autosampler: {
    comPort: "",
    ip: "",
    isGetIpAuto: false,
    type: "none",
  },
  degasser: {
    name: "",
  },
  detector: {
    name: "",
    portType: "usb",
    type: "SPhDetector2",
  },
  portType: "usb",
  pumpCount: 1,
  pumps: {
    A1: "",
    A2: "",
    B1: "",
    B2: "",
  },
  thermostat: {
    name: "",
  },
  withoutControl: false,
};

const SERVICE_CHROMATOGRAPH_NAMES = [SESSION_CHROMATOGRAPH_NAME];
const DEFAULT_CHROMATOGRAPH_NAME = 'chromatographDefault'

module.exports = {
  DETECTOR_TYPES,
  NODE_STATUSES,
  PUMP_STATES,
  ESSENTIAL_QUEUE_NAMES,
  RESETING_SPECTO_OPERATIONS,
  MODULE_BASES,
  THERMOSTAT,
  THERMOSTAT_STATE,
  SERVICE_CHROMATOGRAPH_NAMES,
  SESSION_CHROMATOGRAPH_NAME,
  DEFAULT_CHROMATOGRAPH_NAME

  /* PUMP_STATUSES,
  DETECTOR_STATUSES,
  THERMOSTAT_STATUSES, */

};

