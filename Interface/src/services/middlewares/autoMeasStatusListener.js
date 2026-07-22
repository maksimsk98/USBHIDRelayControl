import { createListenerMiddleware } from '@reduxjs/toolkit';

import { MEASUREMENT_STATUSES } from '../../constants/constants';
import { selectMainMeasurementStatus } from '../reduxImportDispatcher';
import { fetchAutoMeasurementData, handleAutoMeasurementFinished } from '../thunks/autosampler/autoMeasurementThunks';

export const autoMeasurementListener = createListenerMiddleware();

autoMeasurementListener.startListening({
  actionCreator: fetchAutoMeasurementData.fulfilled,
  effect: async (action, { getState, dispatch }) => {
    const { sessionId, status: newStatus } = action.payload;

    const prevStatus = selectMainMeasurementStatus(getState());
    const transitionedToFinished = newStatus === MEASUREMENT_STATUSES.MEASUREMENT_FINISHED
        && prevStatus !== MEASUREMENT_STATUSES.MEASUREMENT_FINISHED;

    if (transitionedToFinished) {
      dispatch(handleAutoMeasurementFinished(sessionId));
    }
  },
});
