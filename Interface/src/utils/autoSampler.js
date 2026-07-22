import { isString, isNumber } from 'lodash';

export const getEmptyControlRow = (vialIndex) => ({
  vialIndex,
  sampleName: '',
  method: '',
  injectionsCount: '',
});

export const isValidRow = (row) => isNumber(row.injectionsCount) && row.injectionsCount > 0
         && isString(row.method) && row.method.trim() !== '';

export const filterValidProgramSteps = (allRows) => allRows
  .filter((row) => row.injectionsCount !== ''
        && isString(row.method) && row.method !== '')
  .filter((row) => row.injectionsCount > 0);
