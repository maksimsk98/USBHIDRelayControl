import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
  selectActiveTab,
  selectActiveSubTabByTab,
  selectMainMeasurementStatus,
  selectIsPeaksRedacting,
  peaksActions,
} from '../services/reduxImportDispatcher';

import { MEASUREMENT_STATUSES } from '../constants/constants';
import { passPressedButtonToStart } from '../services/thunks/measurement/measurementThunks';
import { toggleRedactingByType } from '../services/thunks/setIsRedactingThunk';
import { selectIsMeasurementSubTabRedacting } from '../services/reduxImportDispatcher';
import { selectStreamedIdAndMode } from '../services/selectors/selectStreamedIdAndMode';

import { printCommandRegistry } from '../utils/classes/CommandRegistry';
import { ZOOM } from '../constants/uiPolicy';

/**
 * Global keyboard dispatcher.
 * Zero-arg, plug-and-play.
 */
export const useGlobalHotkeys = () => {
  const dispatch = useDispatch();

  /* ───────────── selectors ───────────── */
  const activeTab = useSelector(selectActiveTab);
  const activeSubTab = useSelector((state) => (activeTab ? selectActiveSubTabByTab(state, activeTab) : null));

  const isMeasurementSubTab = activeSubTab === 'measurement' || activeSubTab === 'spectroMeasurement';
  const isPeaksSubTab = activeSubTab === 'peaks';

  const isMeasurementRedacting = useSelector((state) => selectIsMeasurementSubTabRedacting(state, activeTab));

  const isPeaksRedacting = useSelector((state) => selectIsPeaksRedacting(state, activeTab));

  const measurementStatus = useSelector(selectMainMeasurementStatus);
  const { mode } = useSelector(selectStreamedIdAndMode);

  /* ───────────── derived flags ───────────── */

  const isPrestart = measurementStatus === MEASUREMENT_STATUSES.PRESTART
    && mode === 'manual';

  /* ───────────── keydown dispatcher ───────────── */

  useEffect(() => {
    const handler = (e) => {
      const { code } = e;
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      /* 0 App zoom — consume */
      if (ctrl && window.electronZoom?.getFactor) {
        const current = window.electronZoom.getFactor();

        if (code === 'Equal' || code === 'NumpadAdd') {
          e.preventDefault();
          window.electronZoom.setFactor(
            Math.min(ZOOM.MAX, current + ZOOM.STEP),
          );
          return;
        }

        if (code === 'Minus' || code === 'NumpadSubtract') {
          e.preventDefault();
          window.electronZoom.setFactor(
            Math.max(ZOOM.MIN, current - ZOOM.STEP),
          );
          return;
        }

        if (code === 'Digit0') {
          e.preventDefault();
          window.electronZoom.setFactor(ZOOM.DEFAULT);
          return;
        }
      }

      /* 1 Report shortcuts — consume */
      if (/* isReportTab && */ ctrl && shift) {
        if (code === 'KeyP') {
          e.preventDefault();
          e.stopPropagation();
          printCommandRegistry.execute(`report.print.${activeTab}`);
          return;
        }

        if (code === 'KeyE') {
          e.preventDefault();
          e.stopPropagation();
          printCommandRegistry.execute(`report.export.${activeTab}`);
          return;
        }
      }

      /* 2 Redacting toggle — consume */
      if (code === 'F4') {
        e.preventDefault();
        e.stopPropagation();

        if (isPeaksSubTab) {
          dispatch(peaksActions.togglePeaksRedacting(activeTab));
          if (isPeaksRedacting) document.activeElement?.blur();
          return;
        }

        if (isMeasurementSubTab) {
          dispatch(
            toggleRedactingByType({
              tabId: activeTab,
              value: !isMeasurementRedacting,
            }),
          );
          if (isMeasurementRedacting) document.activeElement?.blur();
          return;
        }
      }

      /* 3 PRESTART — ANY KEY FALLTHROUGH */
      if (isPrestart) {
        dispatch(passPressedButtonToStart());
      }
    };

    const wheelHandler = (e) => {
      // Only trigger if Ctrl (or Cmd) is pressed **alone**
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const alt = e.altKey;

      if (!ctrl || shift || alt || !window.electronZoom?.getFactor) return;

      e.preventDefault();

      const current = window.electronZoom.getFactor();
      const delta = Math.sign(e.deltaY) * -ZOOM.STEP;

      window.electronZoom.setFactor(
        Math.min(ZOOM.MAX, Math.max(ZOOM.MIN, current + delta)),
      );
    };

    window.addEventListener('keydown', handler);
    window.addEventListener('wheel', wheelHandler, { passive: false });
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('wheel', wheelHandler);
    };
  }, [
    activeTab,
    activeSubTab,
    /* isReportTab, */
    isMeasurementSubTab,
    isMeasurementRedacting,
    isPeaksSubTab,
    isPeaksRedacting,
    isPrestart,
    dispatch,
  ]);
};
