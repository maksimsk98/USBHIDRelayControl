import { createAsyncThunk } from '@reduxjs/toolkit';
import { selectCloseMethod } from '../reduxImportDispatcher';
import { closeTabAndCleanup } from './closeTabThunk';
import { selectAllChangedIds } from '../selectors/changeTrack/changeComposite';

export const closeAndSaveChangeThunk = createAsyncThunk(
  'app/closeAndSaveChanged',
  async (_, { dispatch, getState }) => {
    const state = getState();
    const changedIds = selectAllChangedIds(state);
    console.log(`changedIds to save and close: ${changedIds}`);

    for (const id of changedIds) {
      const closeMethod = selectCloseMethod(state, id);
      await dispatch(closeTabAndCleanup({ tabId: id, closeMethod, needsToSave: true }));
    }
    console.log(`changedIds saved and closed: ${changedIds}`);
    return true;
  },
);
