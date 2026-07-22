import { createSelector } from '@reduxjs/toolkit';
import { selectIsOrphanFile, selectTabType } from '../reduxImportDispatcher';
import { PERMISSIVE_DELETE_TYPES, TAB_TYPES } from '../../constants/constants';

export const selectPermitedToDelete = createSelector(
  [
    (state, props) => selectTabType(state, props.id),
    (state, props) => selectIsOrphanFile(state, props.id),
  ],
  (tabType, isOrphanFile) => {
    if (tabType == null || tabType === TAB_TYPES.UNKNOWN) return true; // permit deletion of orpahns
    if (PERMISSIVE_DELETE_TYPES.includes(tabType)) return true;
    if (tabType === TAB_TYPES.FILE && isOrphanFile) {
      return true;
    }

    return false;
  },
);
