import { createListenerMiddleware } from '@reduxjs/toolkit';
import {
  calibrationActions, selectActiveTab, selectAllCalibrations, selectTabType,
} from '../reduxImportDispatcher';
import { EMPTY_ARRAY, TAB_TYPES } from '../../constants/constants';
import { closeCalibWithApiCall, selectCalibration, viewCalibration } from '../thunks/calibration/calibrationThunks';
import { chooseMethod } from '../thunks/method/chooseMethodThunk';

export const methodListener = createListenerMiddleware();

methodListener.startListening({
  actionCreator: chooseMethod.fulfilled,
  effect: async (action, { getOriginalState, getState, dispatch }) => {
    const { selectedMethod: newMethod, tabId, prevMethod } = action.payload;

    try {
      if (prevMethod === newMethod) {
        /* console.warn('equal methods change'); */
        return;
      }

      const newState = getState();
      const activeTab = selectActiveTab(newState);

      const actualTabId = tabId ?? activeTab;

      const tabType = selectTabType(newState, actualTabId);

      const availableCalibs = selectAllCalibrations(newState, {
        method: newMethod,
        tabId: actualTabId,
      }) ?? EMPTY_ARRAY;

      const firstValidOption = availableCalibs.filter((c) => c)?.[0] ?? null;

      if (tabType !== TAB_TYPES.CALIBRATION) {
        /* console.warn('not calib'); */
        return;
      }

      if (firstValidOption == null) {
        console.warn('no options');
        return;
      }

      await dispatch(closeCalibWithApiCall({ calibrationTabId: actualTabId, deleteEntry: false }));
      dispatch(selectCalibration(firstValidOption));
      dispatch(calibrationActions.changeCalibTabMethod({ id: actualTabId, method: newMethod }));
      await dispatch(viewCalibration({ calibrationTabId: actualTabId }));
    } finally {
      console.groupEnd(); // ensure it always closes, even on return or error
    }
  },
});
