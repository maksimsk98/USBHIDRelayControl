import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectDetectorType,
  selectUsedDetectorType,
  selectTabWarnings,
  warningActions,
  selectActiveTab,
} from '../services/reduxImportDispatcher';
import { WARNINGS } from '../constants/constants';

export function useDetectorMismatchWarning(tabId) {
  const dispatch = useDispatch();

  const activeTab = useSelector(selectActiveTab);
  const currentDetectorType = useSelector(selectDetectorType);

  const loadedDetectorType = useSelector((state) => selectUsedDetectorType(state, tabId));
  const nodesDetectorType = useSelector((state) => selectDetectorType(state, tabId));

  const effectiveDetectorType = loadedDetectorType ?? nodesDetectorType;
  const warnings = useSelector((state) => selectTabWarnings(state, tabId));

  const [show, setShow] = useState(false);

  useEffect(() => {
    const isTabActive = activeTab === tabId;

    // --- FALLBACK LOGGING ---
    if (loadedDetectorType == null && nodesDetectorType != null) {
      console.warn(
        '[DETECTOR FALLBACK] loadedDetectorType is null → '
        + `fallback to nodesDetectorType="${nodesDetectorType}" for tabId=${tabId}`,
      );
    }

    // --- CRUTCH: treat SPHDetector and SPHDetector2 as equal ---
    const isSPhFamilyEqual = (currentDetectorType === 'SPhDetector' && effectiveDetectorType === 'SPhDetector2')
      || (currentDetectorType === 'SPhDetector2' && effectiveDetectorType === 'SPhDetector');

    const shouldWarn = isTabActive
      && !warnings.includes(WARNINGS.detectorMismatch)
      && currentDetectorType !== effectiveDetectorType
      && !isSPhFamilyEqual;

    if (shouldWarn) {
      setShow(true);
      dispatch(
        warningActions.setWarning({
          tabId,
          warningType: WARNINGS.detectorMismatch,
        }),
      );
    }
  }, [
    currentDetectorType,
    effectiveDetectorType,
    warnings,
    activeTab,
    tabId,
    dispatch,
  ]);

  return {
    showWarning: show,
    closeWarning: () => setShow(false),
  };
}
