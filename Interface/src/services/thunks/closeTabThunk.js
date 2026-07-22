import { createAsyncThunk } from '@reduxjs/toolkit';

import { closeChromaWithApiCall, closeSpectroWithApiCall } from './measurement/measurementThunks';
import { closeFileWithApiCall } from './file/fileThunks';
import { closeCalibWithApiCall } from './calibration/calibrationThunks';
import { combinedDeleteChromaIfPermited } from './combinedDeleteChromaThunk';
import { TAB_TYPES } from '../../constants/constants';
import { closePackage } from './package/packageThunks';
import { selectTabAlteredData } from '../selectors/changeTrack/changeComposite';
import { changeTrackerActions, selectCloseMethod, selectTabMeasurementType } from '../reduxImportDispatcher';
import { combinedDeleteSpectroIfPermited } from './combinedDeleteSpectroThunk';

// Toggleable logging for this module
const LOG_CLOSE = true;
function logClose(...args) {
  if (LOG_CLOSE) console.log(...args);
}

export const closeTabAndCleanup = createAsyncThunk(
  'cleanup/closeTab',
  async ({
    tabId, closeMethod = null, needsToSave, alteredData,
  }, { dispatch, getState, rejectWithValue }) => {
    const state = getState();
    let actualAlteredData = alteredData;
    if (actualAlteredData === undefined) {
      actualAlteredData = selectTabAlteredData(state, tabId);
    }

    const actualCloseMethod = closeMethod || selectCloseMethod(state, tabId);

    // WATCHLIST optimistic detracking to not have 2 close pop ups stack
    dispatch(changeTrackerActions.resetHasAlteredData(tabId));

    logClose('[closeTabAndCleanup] start', {
      tabId, closeMethod: actualCloseMethod, needsToSave, alteredData: actualAlteredData,
    });

    try {
      if (actualCloseMethod === 'startedClose') {
        const measurementType = selectTabMeasurementType(state, tabId);
        logClose('[closeTabAndCleanup] branch=startedClose', { tabId, measurementType, needsToSave });
        if (measurementType === 'chroma') { // WATCHLIST ensure chroma measurement type before closing as chroma
          logClose('[closeTabAndCleanup] closing chroma', { measurementId: tabId, needsToSave });
          await dispatch(closeChromaWithApiCall({ measurementId: tabId, needsToSave, alteredData: actualAlteredData }));
        } else if (measurementType === 'spectro') {
          logClose('[closeTabAndCleanup] closing spectro', { measurementId: tabId, needsToSave });
          await dispatch(closeSpectroWithApiCall({ measurementId: tabId, needsToSave }));
        } else {
          console.error(`[closeTabAndCleanup] Unknown measurement type "${measurementType}" for tabId: ${tabId} during close.`);
        }
      } else if (actualCloseMethod === 'openedClose') {
        logClose('[closeTabAndCleanup] branch=openedClose', { fileId: tabId, needsToSave });
        await dispatch(closeFileWithApiCall({ fileId: tabId, needsToSave, alteredData: actualAlteredData }));
      } else if (actualCloseMethod === 'calibClose') {
        logClose('[closeTabAndCleanup] branch=calibClose', { calibrationTabId: tabId });
        await dispatch(closeCalibWithApiCall({ calibrationTabId: tabId }));
      } else if (actualCloseMethod === TAB_TYPES.PACKAGE) {
        logClose('[closeTabAndCleanup] branch=package', { id: tabId, needsToSave });
        await dispatch(closePackage({ id: tabId, needsToSave, alteredData: actualAlteredData }));
      } else if (actualCloseMethod === 'uninitialized') {
        console.warn(`[closeTabAndCleanup] Attempted to close an uninitialized tab with tabId: ${tabId}`);
      }

      const measurementType = selectTabMeasurementType(state, tabId);
      logClose('[closeTabAndCleanup] performing combined delete cleanup', { tabId, measurementType });
      if (measurementType === 'chroma') {
        logClose('[closeTabAndCleanup] dispatch combinedDeleteChromaIfPermited', { tabId });
        dispatch(combinedDeleteChromaIfPermited(tabId));
      } else if (measurementType === 'spectro') {
        logClose('[closeTabAndCleanup] dispatch combinedDeleteSpectroIfPermited', { tabId });
        dispatch(combinedDeleteSpectroIfPermited(tabId));
      } else {
        console.error(`[closeTabAndCleanup] Unknown measurement type "${measurementType}" for tabId: ${tabId} during cleanup, treat as chroma for now`); // WATCHLIST TODO check all tabs have measurement type
        dispatch(combinedDeleteChromaIfPermited(tabId));
      }

      return true;
    } catch (error) {
      console.error('Failed closing tab and cleanup for', tabId, error);
      return rejectWithValue(error.message);
    }
  },
);
