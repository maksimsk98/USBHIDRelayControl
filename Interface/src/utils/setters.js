import { INVALID_FORMAT } from '../constants/constants';
import {
  clampValue, formatFloatStr, isNonNegIntStr, isWithinDigitLimit,
} from './validation';

/**
 * Generic float input handler utility
 *
 * @param {Object} options
 * @param {string} options.name - Field name from event.target
 * @param {string} options.value - Field value from event.target
 * @param {Object} options.rangesMap - Map of field name to [maxDigits, maxDecimals]
 * @param {Object} options.setterDispatch - Map of field name to setter functions
 * @param {Object} [options.formatConfig] - Optional format config for formatFloatStr
 */

export const floatSetter = ({
  name,
  value,
  rangesMap = {},
  setterDispatch = {},
  formatConfig = {},
}) => {
  const setter = setterDispatch[name];

  if (!setter) {
    console.warn(`No setter configured for ${name}`);
    return;
  }

  const [maxDigits, maxDecimals, min, max] = rangesMap[name] || [];

  const formatedValue = formatFloatStr(value, {
    maxDigits,
    maxDecimals,
    min,
    max,
    ...formatConfig,
  });

  if (formatedValue === INVALID_FORMAT) {
    /* console.warn(`Invalid format for ${name}: "${value}"`); */
    return INVALID_FORMAT;
  }

  return setter(formatedValue);
};

/**
 * Generic integer input handler utility
 *
 * @param {Object} options
 * @param {string} options.name - Field name (from event.target.name)
 * @param {string} options.value - Field value (from event.target.value)
 * @param {Record<string, number>} options.maxDigitsMap - Map of field name to max digits allowed
 * @param {Record<string, Function>} options.setterDispatch - Map of field name to setter functions
 */
export const intSetter = ({
  name,
  value,
  rangesMap = {},
  setterDispatch = {},
  config = {},
}) => {
  const {
    minOnEmpty = false,
  } = config;
  const setter = setterDispatch[name];
  if (!setter) {
    console.warn(`No setter configured for ${name}`);
    return;
  }

  const {
    isSetAsNum = false,
    isMinOnEmpty = false,
  } = config; // default to setting str for ease of inputs cause they are strs

  const [maxDigits, min, max] = rangesMap[name] || [];

  if (value === null || value === '') {
    if (isMinOnEmpty) {
      setter(min != null ? min : 0); // default to 0 on undef for less clutter
    } else {
      setter(null);
    }
    return;
  }

  let valueToAssign = value;
  if (isNonNegIntStr(valueToAssign)) {
    if (min != null || max != null) {
      let numeric = Number(valueToAssign);
      if (Number.isNaN(numeric)) return;
      numeric = clampValue(numeric, min, max);
      valueToAssign = String(numeric);
    }

    if (!isWithinDigitLimit(valueToAssign, maxDigits)) return;

    if (isSetAsNum) {
      valueToAssign = Number(valueToAssign);
      if (!Number.isNaN(valueToAssign)) {
        setter(valueToAssign);
      }
    } else {
      setter(valueToAssign);
    }
  }
};

export const clampingBlur = ({
  name,
  value,
  rangesMap = {},
  setterDispatch = {},
  returnAs = 'string',
}) => {
  const [, min, max] = rangesMap[name] || [];
  const setter = setterDispatch[name];

  if (!setter) {
    console.warn(`No setter configured for ${name}`);
    return { wasClamped: false };
  }

  const getValue = (val) => {
    if (val == null) return null;
    return returnAs === 'string' ? String(val) : val;
  };

  if (value === null || value === '') {
    // Empty input reset to min if defined, otherwise null
    console.log('1', getValue(min));
    setter(getValue(min));
    return { wasClamped: true };
  }

  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    setter(null);
    return { wasClamped: true };
  }

  // Clamp if out of bounds
  if ((min != null && numeric < min) || (max != null && numeric > max)) {
    const clamped = clampValue(numeric, min, max);
    setter(getValue(clamped));
    return { wasClamped: true };
  }
  setter(getValue(numeric));
  return { wasClamped: false };
};
