import { isNumber } from 'lodash';
import {
  INVALID_FORMAT, IPV4_REGEX, IPV6_REGEX, PARTIAL_IP_REGEX,
  PLACEHOLDER_REGEX,
} from '../constants/constants';

export const safeToFixed = (value, maxDecimals = 5) => {
  if (value === null || value === undefined) return '';

  const num = typeof value === 'number'
    ? value
    : typeof value === 'string'
      ? Number(value)
      : NaN;

  if (!Number.isFinite(num)) return '';

  // fix to N decimals, then trim zeros + optional dot
  return num
    .toFixed(maxDecimals)
    .replace(/\.?0+$/, '');
};

export const clampValue = (value, min = null, max = null) => {
  let result = value;

  if (min !== null) {
    result = Math.max(result, min);
  }

  if (max !== null) {
    result = Math.min(result, max);
  }

  return result;
};

export const isConvertableToNumber = (value) => {
  // This regex matches integers, floating point numbers, including leading/trailing decimal points
  const regex = /^\d+\.?\d*$/;
  return regex.test(value);
};

export const isConvertableToFloatWithMaxDecimal = (value, maxDecimals = 2) => {
  if (typeof value !== 'string') return false;
  const normalized = value.replace(',', '.');

  // Allow digits, optional dot, and optional decimals
  if (!/^\d*\.?\d*$/.test(normalized)) return false;

  const [, decimal = ''] = normalized.split('.');
  return decimal.length <= maxDecimals;
};

export const formatValueString = (value) => {
  // If string is all zeroes, collapse to "0"
  if (/^0+$/.test(value)) {
    return '0';
  }
  // Otherwise strip leading zeroes
  return value.replace(/^0+(?=\d)/, '');
};

export const getExtraKeys = (obj, defaultObj) => {
  let extraKeys = [];

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        // Recursive check for nested objects
        const nestedExtraKeys = getExtraKeys(obj[key], defaultObj[key] || {});
        extraKeys = extraKeys.concat(nestedExtraKeys);
      } else if (!defaultObj.hasOwnProperty(key)) {
        // If the key is not in the default object
        extraKeys.push(key);
      }
    }
  }

  return extraKeys;
};

export function isValidIp(ip) {
  if (typeof ip !== 'string') return false;
  return IPV4_REGEX.test(ip) || IPV6_REGEX.test(ip);
}

export const isValidPartialIp = (input) => PARTIAL_IP_REGEX.test(input);

export const isFloatWithinLimits = (value, maxDigits = 3, maxDecimals = 3) => {
  // enforce at least 1 digit
  const digitPart = maxDigits === null ? '\\d*' : `\\d{1,${maxDigits}}`;
  const decimalPart = maxDecimals === null ? '\\d*' : `\\d{0,${maxDecimals}}`;
  const regex = new RegExp(`^${digitPart}(?:\\.(${decimalPart})?)?$`);
  return regex.test(value);
};

/**
 * Clamps a numeric string if min/max provided, returns clamped string if changed, else original
 *
 * @param {string} formattedValue - the numeric string to clamp
 * @param {number|null} min
 * @param {number|null} max
 * @returns {string} clamped string or original string
 */
export const clampStringifiedValueIfNeeded = (formattedValue, min, max) => {
  if (min === null && max === null) {
    return formattedValue;
  }

  const numericValue = Number(formattedValue);
  if (isNaN(numericValue)) {
    console.warn(`Cannot clamp: ${formattedValue} is not a valid number`);
    return formattedValue; // or INVALID_FORMAT or null depending on your app logic
  }
  const clampedValue = clampValue(numericValue, min, max);

  if (numericValue !== clampedValue) {
    return String(clampedValue);
  }

  return formattedValue;
};

export const formatFloatStr = (value, config = {}) => {
  const {
    ifEmptyNull = false,
    ifInvalidFormatNull = true,
    maxDigits = null,
    maxDecimals = null,
    min = null,
    max = null,
    onEmptyValue = '0',
  } = config;

  const trimmedValue = value.trim().replace(',', '.');
  let formattedValue = formatValueString(trimmedValue);

  if (formattedValue === '') {
    return ifEmptyNull ? null : onEmptyValue;
  }
  if (!isFloatWithinLimits(formattedValue, maxDigits, maxDecimals)) {
    return ifInvalidFormatNull ? null : INVALID_FORMAT;
  }

  formattedValue = clampStringifiedValueIfNeeded(formattedValue, min, max);
  return formattedValue;
};

export const tryConvertTimeTo = (value, timeUnit) => {
  if (!isNumber(value)) return value;
  if (timeUnit === 'min') return value / 60;
  return value;
};

export const tryConvertTimeFrom = (value, timeUnit) => {
  if (!isNumber(value)) return value;
  if (timeUnit === 'min') return value * 60;
  return value;
};

export const roundTo = (value, digits = 0) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

export const formatFloatSmart = (value, maxDecimals = 2) => {
  const num = parseFloat(value);
  if (Number.isNaN(num)) return '';

  const rounded = Math.round(num * 10 ** maxDecimals) / 10 ** maxDecimals;
  return rounded.toString();
};

export const isNonNegIntStr = (value) => /^\d+$/.test(value);

export const isWithinDigitLimit = (value, maxDigits = 3) => {
  if (maxDigits == null) return true;
  return value.length <= maxDigits;
};

export const isNonNegIntStrWithinLimits = (value, maxDigits = 3) => isNonNegIntStr(value) && isWithinDigitLimit(value, maxDigits);

export const isValidFromToRange = (from, to) => {
  const fromNum = parseFloat(from);
  const toNum = parseFloat(to);

  if (isNaN(fromNum) || isNaN(toNum)) return false;
  return toNum > fromNum;
};

export const hasMissingRequiredFields = (rows, fields, showTooltip) => {
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    for (const field of fields) {
      const val = row[field];
      if (val === '' || val === null || val === undefined) {
        showTooltip(index, field, 'Заполните поле');
        return true;
      }
    }
  }
  return false;
};

export const formatIntegerString = (value) => {
  // Remove all leading zeroes, but ensure at least one digit remains (0 if empty)
  const formatted = value.replace(/^0+/, '');
  return formatted === '' ? null : formatted;
};

export const formatNumberForOutput = (value, locale = 'en', options = {}) => {
  if (typeof value !== 'number') return '';

  const formatter = new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US', {
    useGrouping: false,
    ...options,
  });

  return formatter.format(value);
};

export function sanitize(filename, replacement = '_') {
  // Forbidden characters: \ / : * ? " < > |
  const forbiddenChars = /[\\/:*?"<>|]/g;
  return filename.replace(forbiddenChars, replacement);
}

export function checkIsPlaceholder(name) {
  if (!name) return false;
  return PLACEHOLDER_REGEX.test(name);
}

export const extractAndFormatMethodAndCalib = (loadedData) => {
  if (!loadedData) return { selectedTemplateNam: null, archiveCalibrationName: null, selectedCalibrationName: null };
  const selectedTemplateName = loadedData.selectedTemplateName === ''
    ? null
    : loadedData.selectedTemplateName ?? null;
  const archiveCalibrationName = loadedData.archiveCalibrationName === ''
    ? null
    : loadedData.archiveCalibrationName ?? null;
  const selectedCalibrationName = loadedData.selectedCalibrationName === ''
    ? null
    : loadedData.selectedCalibrationName ?? null;
  return { selectedTemplateName, archiveCalibrationName, selectedCalibrationName };
};

export const normalizeDecimalInput = (e) => {
  const raw = e
    && typeof e === 'object'
    && e.target
    && typeof e.target.value !== 'undefined'
    ? e.target.value
    : e;

  if (typeof raw === 'string') {
    return raw.replace(/,/g, '.');
  }

  return raw;
};
