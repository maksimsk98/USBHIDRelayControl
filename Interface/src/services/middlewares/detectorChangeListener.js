import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import {
  nodeActions, selectActiveTabMethod, selectDetectorType, selectGeneralMethods, selectLastUsedMethod,
  selectUninitializedMeasurementIds,
} from '../reduxImportDispatcher';
import { chooseMethod } from '../thunks/method/chooseMethodThunk';
import { fetchMethods } from '../thunks/method/methodThunks';
import { revalidateAutosamplerProgram } from '../thunks/autosampler/autosamplerThunk';

export const detectorChangeListener = createListenerMiddleware();

const detectorChangeActions = [
  nodeActions.updateNodesFromConfig,
  nodeActions.updateNodesParams,
];

detectorChangeListener.startListening({
  matcher: isAnyOf(...detectorChangeActions),
  effect: async (action, { getState, dispatch, getOriginalState }) => {
    const oldState = getOriginalState();
    const state = getState();

    const previousDetectorType = selectDetectorType(oldState);
    const newDetectorType = selectDetectorType(state);

    const isDetectorSame = newDetectorType === previousDetectorType;

    const activeTabMethod = selectActiveTabMethod(state) ?? null;
    const lastUsedMethod = selectLastUsedMethod(state);

    await dispatch(fetchMethods());
    const availableMethods = selectGeneralMethods(getState()); // we need fresh methods in case chromatograph change switch the detector keep the getState call here

    if (isDetectorSame) {
      const adjustedMethod = (lastUsedMethod === '') || (lastUsedMethod === null)
        ? null : lastUsedMethod;
      if (availableMethods.includes(adjustedMethod) || adjustedMethod === null) {
        await dispatch(chooseMethod({ selectedMethod: adjustedMethod }));
      }
    } else {
      const allUnitializedMeasurements = selectUninitializedMeasurementIds(state);

      allUnitializedMeasurements.forEach((measurementId) => {
/*         dispatch(detectorSwapThunk({ // it is sync thunk, no need to await
          measurementId,
          newDetectorType: newDetectorType,
          oldDetectorType: previousDetectorType,
        })); */
      });

      if (availableMethods.includes(activeTabMethod)) {
        await dispatch(chooseMethod({ selectedMethod: activeTabMethod }));
      } else {
        await dispatch(chooseMethod({ selectedMethod: null }));
      }

      // auto revalidation
      await dispatch(revalidateAutosamplerProgram());
    }

  },
});
