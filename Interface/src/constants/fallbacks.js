export const DEFAULT_CALUB_CONC_UNITS = 'нг/мл'

export const SESSION_CHROMATOGRAPH_NAME = "_sessionTemp";

export const SESSION_TEMP_CHROMATOGRAPH = {
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

export const SERVICE_CHROMATOGRAPH_NAMES = [SESSION_CHROMATOGRAPH_NAME];

export const DEFAULT_CHROMATOGRAPH_NAME = 'chromatographDefault'