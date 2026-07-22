import { createSelector } from '@reduxjs/toolkit';

import { isArray, isString } from 'lodash';
import { NOT_GENERAL_METHOD } from '../../../constants/constants';

export const selectGeneralMethods = (state) => state.methodReducer.availableMethods;

export const selectActualGenMethods = createSelector(
  [selectGeneralMethods],
  (generalMethods) => generalMethods.filter((method) => isString(method) && method !== ''),
);

export const selectIsMethodGeneral = createSelector(
  [selectGeneralMethods, (state, props) => props.method],
  (generalMethods, methodToCheck) => {
    if (!isArray(generalMethods)) {
      console.error('general methods is not array', generalMethods);
      return false;
    }
    return generalMethods?.includes(methodToCheck);
  },
);

export const selectFilesMethodsObject = (state) => state.methodReducer.openedFilesMethods;

export const selectSelectedMethod = (state) => state.methodReducer.selectedMethod;

export const selectRawMethodData = (state, method) => state.methodReducer.methodsData[method];

export const selectRawMethodsData = (state) => state.methodReducer.methodsData;

/* export const selectMethodNameTemplate = (state, method) => state.methodReducer.methodsData[method]?.options?.name ?? '%y%m%d_%H%M_%s' */

export const selectMethodNameTemplate = createSelector(
  [
    (state, method) => selectRawMethodData(state, method),
  ],
  (methodData) => {
    if (methodData?.options?.name == null) console.error('Raw method data unaccessable');
    const template = methodData?.options?.name ?? '%y%m%d_%H%M_%s';

    return template;
  },
);

export const selectSelectedMethodIfGeneral = createSelector(
  [selectSelectedMethod, selectGeneralMethods],
  (selectedMethod, generalMethods) =>
    // Check if selectedMethod is in the list of generalMethods
    (generalMethods.includes(selectedMethod) ? selectedMethod : NOT_GENERAL_METHOD),

);
