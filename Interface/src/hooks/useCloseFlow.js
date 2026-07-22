import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { fetchLatestTabState } from '../services/thunks/tabs/tabsThunk';
import { closeTabAndCleanup } from '../services/thunks/closeTabThunk';
import { UTILITY_GROUP_NAMES, CLOSING_MODALS_MESSAGES } from '../constants/constants';
import { updateMethodByTabId } from '../services/thunks/method/methodThunks';

/**
 * Единственный close-flow для таба
 * - шаги декларативные
 * - useEffect = интерпретатор action-шагов
 * - async-флаг + детект await
 */

export function useCloseFlow({
  tabId,
  panelAPI,
  dispatch,
  containerApi,

  canCreateMethod = false, // no permission flag
}) {
  const [steps, setSteps] = useState([]);
  const [index, setIndex] = useState(-1);

  const stepsRef = useRef([]);
  const indexRef = useRef(-1);

  const currentStep = steps[index] ?? null;

  // sync refs
  useEffect(() => {
    /* console.log('current flow', steps, index) */
    stepsRef.current = steps;
    indexRef.current = index;
  }, [steps, index]);

  /* ============================
   * low-level utils
   * ============================ */

  const reset = useCallback(() => {
    setSteps([]);
    setIndex(-1);
    console.log('reset flow');
  }, []);

  const closeTab = useCallback(
    (needsToSave, alteredData = null, closeMethod = null) => {
      if (!panelAPI) return;

      const isUtility = UTILITY_GROUP_NAMES.includes(tabId);
      const options = { removeEmptyGroup: true, skipDispose: false };

      /**
     * IMPORTANT TIMING NOTE
     * ---------------------
     *
     * Dockview's `removePanel()` is an imperative API call that removes the panel
     * from the layout immediately, but React does NOT unmount the corresponding
     * component synchronously.
     *
     * What actually happens on close:
     *   1. removePanel() mutates Dockview internal state
     *   2. React still finishes the current render/commit phase
     *   3. passive effects (`useEffect`) are flushed later
     *
     * If we clean Redux state immediately after `removePanel()`,
     * React may still perform one or more renders of the tab component,
     * causing selectors to read already-deleted data → runtime crashes.
     *
     * To avoid this, we intentionally delay Redux cleanup by TWO
     * requestAnimationFrame() ticks:
     *
     *   - first RAF: lets React finish the current commit
     *   - second RAF: lets React flush passive effects and unmount
     *
     * This is a TEMPORARY safety barrier, not a final architectural solution.
     * The proper fix is a two-phase close protocol:
     *   1) mark tab as closing (UI guard)
     *   2) remove panel
     *   3) cleanup Redux state in component unmount
     */

      panelAPI.accessor?.removePanel(panelAPI.panel, options);

      if (isUtility) return;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          dispatch(
            closeTabAndCleanup({
              tabId,
              closeMethod,
              needsToSave,
            }),
          );
        });
      });
    },
    [dispatch, panelAPI, containerApi, tabId],
  );

  /* ============================
   * build steps (INSIDE HOOK)
   * ============================ */

  const buildSteps = useCallback(
    (latestState) => {
      const steps = [];

      // 1. measurement running
      if (latestState.isRunning) {
        steps.push({
          type: 'prompt',
          id: 'measurementRunning',
          modal: {
            title: CLOSING_MODALS_MESSAGES.CLOSE_CONFIRM_TITLE,
            body: CLOSING_MODALS_MESSAGES.CLOSE_CONFIRM_BODY,
            primaryLabel: CLOSING_MODALS_MESSAGES.CLOSE_PRIMARY_LABEL,
            secondaryLabel: CLOSING_MODALS_MESSAGES.CLOSE_SECONDARY_LABEL,
          },
          onConfirm: () => {},
          onCancel: () => {
            throw new Error('ABORT_CLOSE');
          },
        });
      }

      // 2. method diff
      if (latestState.methodDiff?.diff === true && canCreateMethod) {
        const methodName = latestState.methodDiff.currentMethod;

        steps.push({
          type: 'prompt',
          id: 'methodTemplate',
          modal: {
            title: 'Сохранить изменения метода?',
            body: methodName
              ? `Вы изменили параметры метода "${methodName}". Сохранить изменения в метод?`
              : 'Вы изменили параметры метода. Сохранить изменения в метод?',
            primaryLabel: 'Сохранить',
            secondaryLabel: 'Не сохранять',
          },
          onConfirm: async () => {
            await dispatch(updateMethodByTabId({ tabId }));
          },
          onCancel: () => {},
        });
      }

      // 3. save tab data
      if (latestState.needsPrompt) {
        steps.push({
          type: 'prompt',
          id: 'saveTabData',
          modal: {
            title: CLOSING_MODALS_MESSAGES.SAVE_CONFIRM_TITLE,
            body: CLOSING_MODALS_MESSAGES.SAVE_CONFIRM_BODY,
            primaryLabel: CLOSING_MODALS_MESSAGES.SAVE_PRIMARY_LABEL,
            secondaryLabel: CLOSING_MODALS_MESSAGES.SAVE_SECONDARY_LABEL,
          },
          onConfirm: () => {
            closeTab(
              true,
              latestState.closeMethod,
            );
          },
          onCancel: () => {
            closeTab(false, null, latestState.closeMethod);
          },
        });
      }

      // 4. final close (если saveTabData не было)
      const hasSaveStep = steps.some((s) => s.id === 'saveTabData');

      if (!hasSaveStep) {
        steps.push({
          type: 'action',
          id: 'finalClose',
          async: false,
          run: () => {
            closeTab(false, null, latestState.closeMethod);
          },
        });
      }

      return steps;
    },
    [closeTab],
  );

  /* ============================
   * public API
   * ============================ */

  const start = useCallback(async () => {
    try {
      const latestState = await dispatch(
        fetchLatestTabState(tabId),
      ).unwrap();

      const built = buildSteps(latestState);
      console.log('latestState', latestState);

      setSteps(built);
      setIndex(built.length > 0 ? 0 : -1);
    } catch (err) {
      if (err?.message === 'ABORT_CLOSE') return;
      console.error('[close-flow] failed to start', err);
      reset();
    }
  }, [dispatch, tabId, buildSteps, reset]);

  const advance = useCallback(
    async (kind = 'auto') => {
      const step = stepsRef.current[indexRef.current];
      if (!step) return;

      try {
        if (step.type === 'prompt') {
          if (kind === 'confirm') {
            await step.onConfirm?.();
          } else if (kind === 'cancel') {
            await step.onCancel?.();
          }
        }
      } catch (err) {
        if (err?.message === 'ABORT_CLOSE') {
          reset();
          return;
        }
        console.error('[close-flow] prompt failed:', step.id, err);
        reset();
        return;
      }

      setIndex((i) => i + 1);
    },
    [reset],
  );

  /* ============================
   * ACTION STEP INTERPRETER
   * ============================ */

  useEffect(() => {
    if (!currentStep) return;
    if (currentStep.type !== 'action') return;

    let cancelled = false;

    const execute = async () => {
      try {
        const { id, async: declaredAsync, run } = currentStep;

        if (declaredAsync) {
          await run();
        } else {
          const result = run();

          if (result instanceof Promise) {
            console.warn(
              `[close-flow] Action "${id}" returned Promise but async=false. Forcing await.`,
            );
            await result;
          }
        }

        if (!cancelled) {
          advance('auto');
        }
      } catch (err) {
        console.error('[close-flow] action failed:', currentStep.id, err);
        reset();
      }
    };

    execute();

    return () => {
      cancelled = true;
    };
  }, [currentStep, advance, reset]);

  return {
    start,
    currentStep,
    advance,
    reset,
    isActive: index >= 0,
  };
}
