import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { DockviewReact, DockviewDefaultTab } from 'dockview';

import { selectActiveTab, selectCalibTabCalibration, tabActions } from '../../services/reduxImportDispatcher';

import ComponentsTab from './components/ComponentsTab';
import PassportTab from './passport/PassportTab';
import ReportTab from './report/ReportTab';
import useResizeConstraints from '../../hooks/useResizeConstraints';
import { BottomPaneProvider } from './sharedComponents/BottomPaneContext';

const headerComponents = {
  default: (props) => <DockviewDefaultTab hideClose {...props} />,
};

function CalibrationTab(props) {
  const dispatch = useDispatch();
  const [subTabApi, setSubTabApi] = useState();
  const tabApi = props.api;
  const parentId = props.api.id;

  const activeTab = useSelector(selectActiveTab);
  const calibrationName = useSelector((state) => selectCalibTabCalibration(state, parentId));

  const disposables = [];

  const [splitSizes, setSplitSizes] = useState([50, 50]);

  const components = {
    ComponentsTab,
    PassportTab,
    ReportTab,
  };

  useEffect(() => {
    tabApi.setTitle(`Градуировка [${calibrationName}]`);
  }, [calibrationName]);

  const onReady = (event) => {
    setSubTabApi(event.api);

    event.api.addPanel({
      id: 'calibComponents',
      component: 'ComponentsTab',
      title: 'Компоненты',
      renderer: 'always',
      params: {
        parentId,
      },
    });
    event.api.addPanel({
      id: 'calibPassport',
      component: 'PassportTab',
      title: 'Паспорт',
      renderer: 'always',
      params: {
        parentId,
      },
    });
    event.api.addPanel({
      id: 'calibReport',
      component: 'ReportTab',
      renderer: 'always',
      title: 'Отчет',
      params: {
        parentId,
      },
    });

    const firstActiveSubTab = 'calibComponents';
    event.api.getPanel(firstActiveSubTab).api.setActive();
    dispatch(tabActions.setActiveSubTab({ tabId: parentId, subTab: firstActiveSubTab }));
  };

  useEffect(() => {
    if (!subTabApi) {
      return () => {
        // noop
      };
    }

    disposables.push(subTabApi.onDidActivePanelChange((panel) => {
      dispatch(tabActions.setActiveSubTab({ tabId: parentId, subTab: panel.id }));
    }));

    return () => {
      disposables.forEach((disposable) => disposable.dispose());
    };
  }, [subTabApi]);

  useResizeConstraints({
    panelApi: props.api,
    minHeight: props.params.minFloatingHeight,
    minWidth: props.params.minFloatingWidth,
    initialWidth: props.params.floatingInitialWidth,
    initialHeight: props.params.floatingInitialHeight,
  });

  return (
    <BottomPaneProvider value={{
      parentId, splitSizes, setSplitSizes, activeTab,
    }}
    >
      <DockviewReact
        onReady={onReady}
        components={components}
        className="CalibrationView"
        defaultTabComponent={headerComponents.default}
      />
    </BottomPaneProvider>
  );
}

export default CalibrationTab;
