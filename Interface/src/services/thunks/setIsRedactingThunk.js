import { createAsyncThunk } from '@reduxjs/toolkit';
import { selectTabMeasurementType, spectroStepsActions, selectEffectiveDetectorType } from '../reduxImportDispatcher';
import { detectorProgramThunks } from './detectorAwareBranched/detectorAwareStateThunks';

export const toggleRedactingByType = createAsyncThunk(
  'ui/toggleRedactingByType',
  async ({ tabId, value }, { getState, dispatch }) => {
    const state = getState();
    const measurementType = selectTabMeasurementType(state, tabId);

    if (measurementType === 'spectro') {
      dispatch(spectroStepsActions.setReadacting({ tabId, value }));
    } else if (measurementType === 'chroma') {
      const detectorType = selectEffectiveDetectorType(state, tabId );
      dispatch(detectorProgramThunks.setReadacting({ detectorType, tabId, value }));
    } else {
      console.warn(
        `toggleRedactingByType: unknown measurementType "${measurementType}" for tab ${tabId}`,
      );
    }
  },
);
