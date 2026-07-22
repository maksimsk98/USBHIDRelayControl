import React, {
  useState, useEffect, useRef, useLayoutEffect, useMemo,
} from 'react';
import { DockviewReact, DockviewDefaultTab } from 'dockview';
import { useDispatch, useSelector } from 'react-redux';
import MeasurementTab from './measurement/MeasurementTab.jsx';
import PassportTab from './passport/PassportTab.jsx';
import SignalsTab from './signals/SignalsTab.jsx';
import PeaksTab from './peaks/PeaksTab.jsx';
import ReportTab from './report/ReportTab.jsx';

import {
  tabActions, selectSourceIdOfReport, selectDetectorType, selectActiveTab, selectMeasurementName, warningActions, selectTabWarnings, selectUsedDetectorType, selectMeasStatusById, selectPeakWorkMode, selectActiveSubTabByTab,
} from '../../services/reduxImportDispatcher.js';
import useResizeConstraints from '../../hooks/useResizeConstraints.js';
import {
  MEASUREMENT_STATUSES, MEASUREMENT_TYPES, TAB_TYPES, WARNINGS,
} from '../../constants/constants.js';
import DetectorWarningModal from './DetectorWarningModal.jsx';
import { reaffirmAveraging } from '../../services/thunks/averangingChangeThunk.js';
import { useAutoActivatePanel } from '../../hooks/useAutoActivatePanel.js';

const headerComponents = {
  default: (props) => <DockviewDefaultTab hideClose {...props} />,
};

const components = {
  MeasurementTab,
  PassportTab,
  SignalsTab,
  PeaksTab,
  ReportTab,
};

const panelsConfig = (tabType) => ([
  {
    id: 'measurement',
    component: 'MeasurementTab',
    renderer: 'onlyWhenVisible',
    title: 'Измерение',
  },
  {
    id: 'peaks',
    component: 'PeaksTab',
    renderer: 'onlyWhenVisible',
    title: 'Пики',
    inactive: tabType !== TAB_TYPES.FILE,
  },
  {
    id: 'passport',
    component: 'PassportTab',
    renderer: 'onlyWhenVisible',
    title: 'Паспорт',
    inactive: true,
  },
  {
    id: 'report',
    component: 'ReportTab',
    renderer: 'onlyWhenVisible',
    title: 'Отчет',
    inactive: true,
  },
  {
    id: 'signals',
    component: 'SignalsTab',
    renderer: 'onlyWhenVisible',
    title: 'Сигналы',
    inactive: true,
  },
]);

function ChromatographicMesurements(props) {
  const dispatch = useDispatch();
  const [api, setApi] = React.useState();
  const parentId = props.api.id;
  const { tabType } = props.params;
  const activeTab = useSelector(selectActiveTab);
  const activeSubTab = useSelector((state) => selectActiveSubTabByTab(state, parentId));
  const usedDetector = useSelector((state) => selectUsedDetectorType(state, parentId));
  const currentDetectorType = useSelector(selectDetectorType);

  const isActive = parentId === activeTab;

  const measurementName = useSelector((state) => selectMeasurementName(state, parentId));

  const warnings = useSelector((state) => selectTabWarnings(state, parentId));
  const [showDetectorWarningModal, setShowDetectorWarningModal] = useState(false);

  const disposables = [];

  const measurementStatus = useSelector((state) => selectMeasStatusById(state, parentId));
  const peakWorkMode = useSelector((state) => selectPeakWorkMode(state, parentId));

  const statusToPanelMap = useMemo(() => ({
    [MEASUREMENT_STATUSES.MEASUREMENT_FINISHED]: 'peaks',
    [MEASUREMENT_STATUSES.AWAITING_BACKEND]: 'measurement',
  }), []);

  useAutoActivatePanel(api, measurementStatus, statusToPanelMap);

  useEffect(() => {
    if (measurementName) {
      props.api.setTitle(measurementName);
    }
  }, [measurementName]);

  const onReady = (event) => {
    panelsConfig(tabType).forEach((panel) => {
      event.api.addPanel({
        ...panel,
        params: { chromaTabId: parentId },
      });
    });

    const activeSubTab = tabType === TAB_TYPES.MEASUREMENT
      ? 'measurement'
      : tabType === TAB_TYPES.FILE
        ? 'peaks'
        : null;

    dispatch(tabActions.setActiveSubTab({ tabId: parentId, subTab: activeSubTab }));
    setApi(event.api);
  };

  const sourceIdOfReport = useSelector(selectSourceIdOfReport);

  useEffect(() => {
    if (!api) {
      return () => {
        // noop
      };
    }

    if (sourceIdOfReport === parentId) {
      api.getPanel('report').api.setActive();
      dispatch(tabActions.setActiveSubTab({ tabId: parentId, subTab: 'report' }));
    }
  }, [sourceIdOfReport]);

  const prevTabRef = useRef(null);

  useEffect(() => {
    if (!api) {
      return () => {
        // noop
      };
    }

    disposables.push(api.onDidActivePanelChange((panel) => {
      const newTab = panel.id;
      const prevTab = prevTabRef.current;

      dispatch(tabActions.setActiveSubTab({ tabId: parentId, subTab: newTab }));

      const switchedToSignals = newTab === 'signals';
      const switchedFromSignalsToImportantTab = prevTab === 'signals' && ['measurement', 'report', 'peaks', 'passport'].includes(newTab);

      if (switchedToSignals || switchedFromSignalsToImportantTab) {
        dispatch(reaffirmAveraging(parentId));
      }

      prevTabRef.current = newTab;
    }));

    return () => {
      disposables.forEach((disposable) => disposable.dispose());
    };
  }, [api]);

  useResizeConstraints({
    panelApi: props.api,
    minHeight: props.params.minFloatingHeight,
    minWidth: props.params.minFloatingWidth,
    initialWidth: props.params.floatingInitialWidth,
    initialHeight: props.params.floatingInitialHeight,
  });

  useLayoutEffect(() => {
    if (activeTab === parentId && !warnings.includes(WARNINGS.detectorMismatch) && currentDetectorType !== usedDetector && usedDetector) {
      setShowDetectorWarningModal(true);
      dispatch(warningActions.setWarning({ tabId: parentId, warningType: WARNINGS.detectorMismatch })); // We need this to avoid redundant warnings when one mismatched changes to other mismathced, if you want warnings each time new mismatch happens comment out dispatch and selector
    }
  }, [currentDetectorType, usedDetector, warnings, activeTab, parentId]);

  const modeClass = activeSubTab === 'peaks' && peakWorkMode ? `peak-mode-${peakWorkMode}` : null;

  return (
    <>
      <DetectorWarningModal
        show={showDetectorWarningModal}
        handleClose={() => setShowDetectorWarningModal(false)}
        measurementType={MEASUREMENT_TYPES.chroma}
      />

      <DockviewReact
        onReady={onReady}
        components={components}
        className={`chroma-tab ${isActive ? 'active-chroma-tab' : ''} ${modeClass ?? ''}`}
        defaultTabComponent={headerComponents.default}
        disableFloatingGroups
      />
    </>

  );
}

export default ChromatographicMesurements;
