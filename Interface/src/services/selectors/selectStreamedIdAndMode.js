import { createSelector } from '@reduxjs/toolkit';
import { selectAutoControlSessionId, selectStreamedMeasurementId } from '../reduxImportDispatcher';

export const selectStreamedIdAndMode = createSelector(
  [selectStreamedMeasurementId, selectAutoControlSessionId],
  (streamedId, autoSession) => {
    if (!streamedId) {
      return {
        mode: null,
        streamedId,
      };
    }

    const isAuto = streamedId === autoSession;

    return {
      mode: isAuto ? 'auto' : 'manual',
      streamedId: isAuto ? autoSession : streamedId,
    };
  },
);
