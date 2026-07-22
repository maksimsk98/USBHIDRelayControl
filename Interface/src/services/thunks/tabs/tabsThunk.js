import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  isThisTabMeasurementRunning, selectCloseHandlers, selectCloseMethod,
  selectMeasurementMethodDeviation,
  selectTabMeasurementType,
  selectTabType,
  selectUnifiedChromaSnapshotDiff,
  selectUnifiedMethodDeviation,
} from '../../reduxImportDispatcher';
import { selectChangedNames, selectTabHasAlteredData } from '../../selectors/changeTrack/changeComposite';
import { selectConfirmCloseIsReq } from '../../selectors/selectCanClose';

/**
 * This thunk must NEVER break the close-flow.
 * Any error here is treated as "no actionable changes".
 * Closing must always proceed.
 */

export const fetchLatestTabState = createAsyncThunk(
  'tabs/fetchLatestTabState',
  async (tabId, { getState }) => {
    try {
      const state = getState();

      const tabType = selectTabType(state, tabId);
      const measurementType = selectTabMeasurementType(state, tabId);

      let methodDiff = null;

      // строго ограничиваем область
      if (measurementType === 'chroma') {
        methodDiff = selectUnifiedMethodDeviation(state, tabId);
      }

      let needsPrompt;

      if (measurementType === 'chroma') {
        const diff = selectUnifiedChromaSnapshotDiff(state, tabId);
        needsPrompt = diff?.hasChanges;
      } else {
        const dirtyCheck = selectTabHasAlteredData(state, tabId);
        needsPrompt = dirtyCheck;
      }

      return {
        isRunning: isThisTabMeasurementRunning(state, tabId),
        needsPrompt,
        closeMethod: selectCloseMethod(state, tabId),

        // новое, опциональное
        methodDiff,
      };
    } catch (err) {
      /**
       * Defensive containment:
       * This thunk is used in close-flow orchestration.
       * It must NEVER throw, even if some selector is temporarily unsafe
       * (e.g. missing snapshot domain during tab teardown).
       *
       * Fallback strategy:
       * - assume no running measurement
       * - assume no prompt needed
       * - preserve closeMethod if possible
       */
      console.warn(
        '[fetchLatestTabState] failed, returning safe fallback',
        err,
      );

      const state = getState();

      return {
        isRunning: false,
        needsPrompt: false,
        closeMethod: selectCloseMethod(state, tabId),
        methodDiff: null,
      };
    }
  },
);

export const runAllCloseHandlersThunk = createAsyncThunk(
  'tab/runAllCloseHandlers',
  async (_, { getState }) => {
    const closeHandlers = selectCloseHandlers(getState());

    console.log('Running all close handlers...', closeHandlers);

    // Run all handlers and collect results (true = allow close, false = block close)
    const handlerResults = await Promise.all(
      Object.values(closeHandlers).map((handler) => handler()),
    );
    console.log(handlerResults);

    // If any handler returns false, prevent closing
    const canClose = !handlerResults.includes(false);
    return canClose;
  },
);

export const getFreshNeedsToConfirm = createAsyncThunk(
  'tab/getFreshNeedsToConfirm',
  async (_, { getState }) => {
    const state = getState();
    const changedNames = selectChangedNames(state);
    const needsConfirmation = selectConfirmCloseIsReq(state);
    return { needsConfirmation, changedNames };
  },
);
