import { MEASUREMENT_TYPES_TITLES } from '../constants/constants';

export const getMeasurementName = (template, values = {}) => {
  const now = new Date();
  const type = MEASUREMENT_TYPES_TITLES[values.measurementType];

  const replacements = {
    '%y': now.getFullYear(), // Year
    '%m': String(now.getMonth() + 1).padStart(2, '0'), // Month (01-12)
    '%d': String(now.getDate()).padStart(2, '0'), // Day (01-31)
    '%H': String(now.getHours()).padStart(2, '0'), // Hours (00-23)
    '%M': String(now.getMinutes()).padStart(2, '0'), // Minutes (00-59)
    '%S': String(now.getSeconds()).padStart(2, '0'), // Seconds (00-59)
    '%s': values.sampleName ?? '', // Sample Name
    '%t': values.methodName ?? '', // Method Name
  };

  let formatted = template.replace(/%\w/g, (match) => replacements[match] ?? match);
  // Remove trailing underscores (_) and spaces
  formatted = formatted.replace(/[_\s]+$/, '');
  return `${type} [${formatted}]`;
};
