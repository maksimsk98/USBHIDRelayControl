import React, { useEffect, useMemo } from 'react';
import { DockviewReact, DockviewDefaultTab } from 'dockview';
import { useDispatch, useSelector } from 'react-redux';

import {
  tabActions, selectActiveTab, selectMeasurementName, selectMeasStatusById, selectActiveSubTabByTab,
  selectEffectiveDetectorType,
} from '../../services/reduxImportDispatcher.js';
import useResizeConstraints from '../../hooks/useResizeConstraints.js';
import {
  DETECTOR_TYPES, MEASUREMENT_STATUSES, MEASUREMENT_TYPES, TAB_TYPES,
} from '../../constants/constants.js';
import { useAutoActivatePanel } from '../../hooks/useAutoActivatePanel.js';

import MeasurementTab from './measurement/MeasurementTab.jsx';
import ResultTab from './result/ResultTab.jsx';

import DetectorWarningModal from '../chromotograph/DetectorWarningModal.jsx';
import { useDetectorMismatchWarning } from '../../hooks/useDetectorMismatchWarning.js';

const headerComponents = {
  default: (props) => <DockviewDefaultTab hideClose {...props} />,
};

const components = {
  MeasurementTab,
  ResultTab,
};

const panelsConfig = (tabType) => ([
  {
    id: 'spectroMeasurement',
    component: 'MeasurementTab',
    renderer: 'onlyWhenVisible',
    title: 'Измерение',
  },
  {
    id: 'spectroResult',
    component: 'ResultTab',
    renderer: 'onlyWhenVisible',
    title: 'Результаты',
    inactive: tabType !== TAB_TYPES.FILE,
  },
]);

function SpectroscropicMesurements(props) {
  const dispatch = useDispatch();
  const [api, setApi] = React.useState();
  const tabId = props.api.id;
  const { tabType } = props.params;
  const activeTab = useSelector(selectActiveTab);
  const activeSubTab = useSelector((state) => selectActiveSubTabByTab(state, tabId));

  const { showWarning, closeWarning } = useDetectorMismatchWarning(tabId);

  const measurementName = useSelector((state) => selectMeasurementName(state, tabId));
  const effectiveDetectorType = useSelector((state) => selectEffectiveDetectorType(state, tabId ));

  const disposables = [];

  const measurementStatus = useSelector((state) => selectMeasStatusById(state, tabId));

  const statusToPanelMap = useMemo(() => ({
    [MEASUREMENT_STATUSES.MEASUREMENT_FINISHED]: 'result',
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
        params: { tabId },
      });
    });

    const activeSubTab = tabType === TAB_TYPES.MEASUREMENT
      ? 'spectroMeasurement'
      : tabType === TAB_TYPES.FILE
        ? 'spectroResult'
        : null;

    dispatch(tabActions.setActiveSubTab({ tabId, subTab: activeSubTab }));
    console.log('set api', event.api);
    setApi(event.api);
  };

  useResizeConstraints({
    panelApi: props.api,
    minHeight: props.params.minFloatingHeight,
    minWidth: props.params.minFloatingWidth,
    initialWidth: props.params.floatingInitialWidth,
    initialHeight: props.params.floatingInitialHeight,
  });

  useEffect(() => {
    if (!api) {
      return () => {
        // noop
      };
    }

    disposables.push(api.onDidActivePanelChange((panel) => {
      const newTab = panel.id;

      dispatch(tabActions.setActiveSubTab({ tabId, subTab: newTab }));
    }));

    return () => {
      disposables.forEach((disposable) => disposable.dispose());
    };
  }, [api]);

  if (effectiveDetectorType === DETECTOR_TYPES.FLUORAT) {
    return (
      <div style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.2rem',
        padding: '24px',
        textAlign: 'center',
        opacity: 0.8,
      }}
      >
        Детектор «Флюорат» не поддерживает спектральные измерения.
      </div>
    );
  }

  return (
    <>
      <DetectorWarningModal
        show={showWarning}
        handleClose={closeWarning}
        measurementType={MEASUREMENT_TYPES.spectro}
      />

      <DockviewReact
        onReady={onReady}
        components={components}
        defaultTabComponent={headerComponents.default}
        disableFloatingGroups
      />
    </>
  );
}

export default SpectroscropicMesurements;
