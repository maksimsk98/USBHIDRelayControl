/**
 * Convert array of values to options format with same value and label
 * @param {Array} values - Array of values (numbers or strings)
 * @returns {Array} Array of option objects with value and label
 */
export const toOptions = (values) => {
  return values.map(value => ({ value, label: String(value) }));
};