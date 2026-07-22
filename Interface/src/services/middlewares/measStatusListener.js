import { createListenerMiddleware } from '@reduxjs/toolkit';
import {
  measurementActions, selectMainMeasurementStatus, selectStreamedMeasurementId, selectTabMeasurementType,
} from '../reduxImportDispatcher';
import { handleChromaMeasurementFinished, handleMeasurementStarted, handleSpectroMeasurementFinished } from '../thunks/measurement/measurementThunks';

export const measurementListener = createListenerMiddleware();

measurementListener.startListening({
  actionCreator: measurementActions.changeCurStreamStatus,
  effect: async (action, { getOriginalState, getState, dispatch }) => {
    const newStatus = action.payload;

    const prevState = getOriginalState();
    const prevStatus = selectMainMeasurementStatus(prevState);
    const parentId = selectStreamedMeasurementId(prevState);

    const transitionedToFinished = newStatus === 'finished' && prevStatus !== 'finished';
    const transitionedToRunning = newStatus === 'measurementRunning' && prevStatus !== 'measurementRunning' && prevStatus;

    const state = getState();
    const measurementType = selectTabMeasurementType(state, parentId);

    console.log(measurementType, transitionedToRunning, transitionedToFinished)

    if (measurementType === 'chroma') {
      if (transitionedToFinished) {
        dispatch(handleChromaMeasurementFinished(parentId));
      } else if (transitionedToRunning) {
        dispatch(handleMeasurementStarted(parentId));
      }
    } else if (measurementType === 'spectro') {
      if (transitionedToFinished) {
        console.log('transitionedToFinished')
        dispatch(handleSpectroMeasurementFinished(parentId));
      }
    }
  },
});
