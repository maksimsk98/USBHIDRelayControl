import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';

import {
  passportActions, changeTrackerActions, selectIsOpened, chromaMiscActions, peaksActions, reportActions,
} from '../reduxImportDispatcher';

import {
  addPeak, autoMarkPeaks, changePeakProperty, deleteAllPeaks, deletePeak, fetchPeakTable,
} from '../thunks/peaks/peaksThunks';
import { deleteSpectroCurve } from '../thunks/spectroPlots/spectroPlotsThunks';

const changeOpenedTrackerMiddleware = createListenerMiddleware();

const openedTriggerActions = [
  fetchPeakTable.fulfilled,
  autoMarkPeaks.fulfilled,
  passportActions.updateField,
  passportActions.updateSampleName,
  addPeak.fulfilled,
  deletePeak.fulfilled,
  deleteAllPeaks.fulfilled,
  changePeakProperty.fulfilled,
  deleteSpectroCurve.fulfilled,

  chromaMiscActions.updateSmoothingParams,
  chromaMiscActions.updatePeakIdParams,
  peaksActions.setPeaksParams,
  reportActions.updateReportChecks,
  reportActions.updatePeakTableParam,

  reportActions.setNoiseEvalParams,
];

changeOpenedTrackerMiddleware.startListening({
  matcher: isAnyOf(...openedTriggerActions),
  effect: (action, listenerApi) => {
    const tabId = action.payload?.tabId
      ?? action.payload?.parentId
      ?? action.payload?.id;

    const state = listenerApi.getState();
    const isOpenedFile = selectIsOpened(state, tabId);
    if (isOpenedFile) {
      listenerApi.dispatch(changeTrackerActions.setHasAlteredData(tabId));
    }
  },
});

export default changeOpenedTrackerMiddleware;
