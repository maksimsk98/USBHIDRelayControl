import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';

import {
  fileActions, selectCategoriesForFile, selectFileEntry,
} from '../reduxImportDispatcher';
import { combinedDeleteChromaIfPermited } from '../thunks/combinedDeleteChromaThunk';
import { combinedDeleteSpectroIfPermited } from '../thunks/combinedDeleteSpectroThunk';

const { editIndexedCategories } = fileActions;

export const filesGCListener = createListenerMiddleware();

filesGCListener.startListening({
  matcher: isAnyOf(editIndexedCategories),
  effect: async (action, { getState, dispatch }) => {
    const { id, edit } = action.payload;
    if (!id || edit !== 'remove') return;

    const state = getState();
    const file = selectFileEntry(state, id);
    if (!file) return;
    const measurementType = file.type;

    // Current active categories (keys only, filtered for non-empty arrays)
    const categories = selectCategoriesForFile(state, id);

    console.groupCollapsed('file gc');
    console.log(categories);

    // If no categories left → file can be GC’d
    if (categories.length === 0) {
      if (!measurementType) {
        console.error(`File with id ${id} has no measurement type defined, skipping GC.`);
        console.groupEnd();
        return;
      }

      if (measurementType === 'chroma') {
        dispatch(combinedDeleteChromaIfPermited(id));
      } else if (measurementType === 'spectro') {
        dispatch(combinedDeleteSpectroIfPermited(id));
      }
    }

    console.groupEnd();
  },
});
