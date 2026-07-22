import { EMPTY_ARRAY } from '../../../constants/constants';

export const selectTabWarnings = (state, tabId) => state.warningsReducer[tabId] ?? EMPTY_ARRAY;
