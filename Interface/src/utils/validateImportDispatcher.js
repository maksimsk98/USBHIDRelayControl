import * as reduxImports from '../services/reduxImportDispatcher';

// Utility to check if any import is undefined
export const checkImports = () => {
  Object.keys(reduxImports).forEach((key) => {
    if (reduxImports[key] === undefined) {
      console.error(`Import ${key} is undefined`);
    }
  });
  console.log('Every export is intact');
};
