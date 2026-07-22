import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import {
  changeTrackerActions, chromaMiscActions, chromaPlotsActions, fileActions, measurementActions, passportActions, peaksActions, plotViewActions, pumpProgramActions, reportActions, spectroMiscActions, spectroPlotsActions, spectroStepsActions, stepActions, warningActions,
} from '../reduxImportDispatcher';

const logDeleteActions = false;

export const deleteMeasListenerMiddleware = createListenerMiddleware();

// --- список delete-action creators ---
const deleteActions = [
  stepActions.deleteMeasurement,
  chromaMiscActions.deleteMeasurement,
  passportActions.deleteMeasurement,
  chromaPlotsActions.deleteMeasurement,
  changeTrackerActions.deleteMeasurement,
  peaksActions.deleteMeasurement,
  plotViewActions.deleteMeasurement,
  pumpProgramActions.deleteMeasurement,
  reportActions.deleteMeasurement,
  measurementActions.closeMeasurement,
  fileActions.deleteEntryIfOrphan,
  warningActions.clearWarningsForTab,

  // spectro
  spectroStepsActions.deleteEntry,
  spectroPlotsActions.deleteEntry,
  spectroMiscActions.deleteEntry,
];

// --- слушаем ВСЕ delete actions ---
deleteMeasListenerMiddleware.startListening({
  matcher: isAnyOf(...deleteActions),
  effect: async (action, listenerApi) => {
    if (!logDeleteActions) return;

    console.log(
      `%c[DELETE ACTION] ${action.type}`,
      'color:#ff4444; font-weight:bold;',
      action,
    );
  },
});
