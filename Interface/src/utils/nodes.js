import { DETECTOR_TYPES, SERVICE_NODE_NAMES } from '../constants/constants';

export const displaySafeNodeName = (serial, name) => {
  if (SERVICE_NODE_NAMES.includes(name)) return '';
  return serial ?? name ?? '';
};

// Maps any incoming instrument code to a canonical detector type

export const NORMALIZE_INSTRUMENT = {
  // SPF family

  panorama: DETECTOR_TYPES.PANORAMA,
  spf: DETECTOR_TYPES.PANORAMA,
  panorama2: DETECTOR_TYPES.PANORAMA2,
  spf2: DETECTOR_TYPES.PANORAMA2,

  // SPHD family
  sphd: DETECTOR_TYPES.SPHDETECTOR,
  sphdetector: DETECTOR_TYPES.SPHDETECTOR,
  sphdetector2: DETECTOR_TYPES.SPHDETECTOR2,
  sphd2: DETECTOR_TYPES.SPHDETECTOR2,

  // Fluorat
  fluorat: DETECTOR_TYPES.FLUORAT,

  // RID
  rid: DETECTOR_TYPES.RID,
};

export function normalizeInstrument(name) {
  if (!name) return null;
  return NORMALIZE_INSTRUMENT[name.toLowerCase()] ?? null;
}
