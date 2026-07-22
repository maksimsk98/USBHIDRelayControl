import { REAL_METHOD_KEYS } from '../constants/constants';

export function pickRealMethodData(raw) {
  const result = {};

  for (const key of REAL_METHOD_KEYS) {
    if (key in raw) {
      // copy exact raw value, including null, undefined, objects, arrays
      result[key] = raw[key];
    }
  }

  return result;
}
