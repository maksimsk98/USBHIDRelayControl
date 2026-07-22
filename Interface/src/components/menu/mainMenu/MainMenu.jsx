import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { v1 as uuidv1 } from 'uuid';
import {
  Menu, MenuItem, SubMenu, MenuButton,
} from '@szhsin/react-menu';

import NodeConfigModal from './chromatograph/NodeConfigModal';
import CalibrationMenu from './calibration/CalibrationMenu';
import MethodsMenu from './methods/MethodsMenu';
import AutoMarkModal from './calculation/AutoMarkModal';

import '@szhsin/react-menu/dist/index.css';
import styles from './MainMenu.module.css';

import { openHashedFilesByPath } from '../../../services/thunks/file/fileUploadThunk';
import addChromaThunk from '../../../services/thunks/addChromaThunk';
import { viewCalibration } from '../../../services/thunks/calibration/calibrationThunks';
import {
  calibrationActions, selectSelectedMethod, selectSelectedCalibration, selectActiveTab, selectTabCalibOriginFile, selectIsTabInitialized, selectSaveProtocol, selectSaveJournal, selectIsActiveTabFinished, selectPumpsCount, peaksActions, selectIsPeaksEmpty, selectPeakWorkMode, selectTabType, selectIsMarkedForClose, selectIsMainStreaming, selectIsPlotEmpty, selectWithoutControl, selectMeasurementEntriesToOpen, selectDoShowBackground, measurementActions, chromaPlotsActions, selectMeasurementEntriesToClose, selectIsPeakFuncsDisabled, selectFilesToOpen, fileActions, selectPackagesToOpen, selectActiveSubTabByTab, selectCalibEntriesToFocus, selectCalibrationHashToId, selectAllPackagesCount, selectMeasCount, selectAutosamplerType, selectAutosamplerIpAddress, selectAutosamplerAutoIp, selectIsAutosamplerAvailable, errorsActions, selectTabMeasurementType, selectReportFreezePlots, selectFileEntriesToFocus,
  packageActions,
  selectIsActCalculatedEmpty,
  selectAutosamplerComPort,
} from '../../../services/reduxImportDispatcher';
import { chooseMethod } from '../../../services/thunks/method/chooseMethodThunk';

import {
  BLOCKED_TABS_ON_WITHOUT_CONTROL, CALIB_TYPES, MEASUREMENT_TYPES, OPEN_STATES, PEAK_WORK_MODES, TAB_TYPES, UTILITY_TABS, UTILITY_TABS_MAP,
} from '../../../constants/constants';
import PumpParamsModal from './chromatograph/pumps/PumpParamsModal';
import { saveOperationalData } from '../../../services/thunks/config/configThunks';
import AboutModal from './information/aboutModal';
import { deleteAllPeaks } from '../../../services/thunks/peaks/peaksThunks';
import FirmwareModal from './chromatograph/FirmwareModal';
import { getFirmwareVersions } from '../../../services/thunks/nodes/nodesThunks';
import SmoothingModal from './calculation/SmoothingModal';
import PeakIdModal from './calculation/PeakIdModal';
import { fetchAutoConfig } from '../../../services/thunks/autosampler/autosamplerThunk';

import { initPackage } from '../../../services/thunks/package/packageThunks';
import { computeCalibKey } from '../../../utils/calib';
import StartStopControl from '../StartStopControl';
import StepTableControl from '../StepTableControl';
import PeakControl from '../PeakControl';
import { printCommandRegistry } from '../../../utils/classes/CommandRegistry';
import { useCommandAvailability } from '../../../hooks/useCommandAvailability';
import { downloadConsoleLog } from '../../custom/DownloadLogButton';
import { logBuffer } from '../../../utils/profiling';
import { addSpectroThunk } from '../../../services/thunks/addSpectroThunk';
import { plotExportRegistry } from '../../../utils/classes/PlotExportRegistry';
import { mergeSignalAOAs } from '../../../utils/plotUtils';
import { saveAsRequested } from '../../../services/thunks/saveAsThunk';
import { selectNameById } from '../../../services/selectors/selectNames';
import FoldersModal from './miscModals/FoldersModal';
import ConcentrationParamsModal from './miscModals/ConcentrationParamsModal';
import { selectCalibConcType } from '../../../services/selectors/calibConc/calibConcBase';
import { usePermissions } from '../../../hooks/usePermissions';
import useElectronAPI from '../../../hooks/useElectronAPI';

export const mockXY_AOA = [
  ['Calculated X', 'Calculated Y'], // Header row
  [0.2, 0.001656126],
  [0.4, 0.001656241],
  [0.6, 0.001656355],
  [0.8, 0.001656466],
  [1.0, 0.001656575],
  [1.2, 0.001656682],
  [1.4, 0.001656787],
  [1.6, 0.001656889],
  [1.8, 0.001656989],
  [2.0, 0.001657087],
  [2.2, 0.001657183],
  [2.4, 0.001657275],
  [2.6, 0.001657366],
  [2.8, 0.001657454],
  [3.0, 0.001657539],
  [3.2, 0.001657622],
  [3.4, 0.001657702],
  [3.6, 0.001657779],
  [3.8, 0.001657853],
  [4.0, 0.001657924],
  [4.2, 0.001657993],
  [4.4, 0.001658058],
  [4.6, 0.001658121],
  [4.8, 0.001658181],
  [5.0, 0.001658237],
  [5.2, 0.001658291],
  [5.4, 0.001658341],
  [5.6, 0.001658388],
  [5.8, 0.001658432],
  [6.0, 0.001658473],
  [6.2, 0.001658510],
  [6.4, 0.001658545],
];

const closeConterpart = (api, counterId) => {
  const counterpartPanel = api.panels.find((panel) => panel.id === counterId);
  const counterpartGroup = counterpartPanel?.group;
  if (counterpartGroup?.panels && counterpartGroup?.panels.length > 1) {
    counterpartPanel?.api?.close();
  } else {
    counterpartPanel?.group?.api?.close();
  }
};

const assertPanel = (api, options) => {
  const preexistPanel = api.panels.find((panel) => panel.id === options.id);
  if (!preexistPanel) {
    api.addPanel(options);
  } else {
    preexistPanel.api.setActive();
  }
};

function MainMenu(props) {
  const { api } = props;
  const dispatch = useDispatch();
  const { isElectron, getElectronAPI, hasMock } = useElectronAPI();
  const { hasDiagnosticsAccess } = usePermissions();

  const [showNodeModal, setShowNodeModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showAutoMarkModal, setShowAutoMarkModal] = useState(false);
  const [showPumpParamsModal, setShowPumpParamsModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showFirmwareModal, setShowFirmwareModal] = useState(false);
  const [showSmoothingModal, setShowSmoothingModal] = useState(false);
  const [showPeakIdModal, setShowPeakIdModal] = useState(false);
  const [showFoldersModal, setShowFoldersModal] = useState(false);
  const [showConcentrationModal, setShowConcentrationModal] = useState(false);

  const modalSetters = {
    node: setShowNodeModal,
    report: setShowReportModal,
    autoMark: setShowAutoMarkModal,
    pumpParams: setShowPumpParamsModal,
    about: setShowAboutModal,
    firmware: setShowFirmwareModal,
    smoothing: setShowSmoothingModal,
    peakId: setShowPeakIdModal,
    folders: setShowFoldersModal,
    concentration: setShowConcentrationModal,
  };

  const activeTab = useSelector(selectActiveTab);
  const activeSubTab = useSelector((state) => selectActiveSubTabByTab(state, activeTab));
  const selectedMethod = useSelector(selectSelectedMethod);
  const selectedCalib = useSelector(selectSelectedCalibration);

  const calibConcDisabled = useSelector((state) => selectCalibConcType(state, selectedCalib)) !== CALIB_TYPES.inStandart;

  const calibOriginFile = useSelector((state) => selectTabCalibOriginFile(state, {
    calibration: selectedCalib,
    tabId: activeTab,
  }));
  const doesSaveProtocol = useSelector(selectSaveProtocol);
  const doesSaveJournal = useSelector(selectSaveJournal);
  const pumpsCount = useSelector(selectPumpsCount);

  const isPeaksEmpty = useSelector((state) => selectIsPeaksEmpty(state, activeTab));
  const peakWorkMode = useSelector((state) => selectPeakWorkMode(state, activeTab));
  const withoutControl = useSelector(selectWithoutControl);

  const [lastNFgroup, setLastNFgroup] = useState(null); // NF = nonFloat, we keep last active NF group to add new panels to it

  const isMarkedForClose = useSelector((state) => selectIsMarkedForClose(state, activeTab));
  const tabType = useSelector((state) => selectTabType(state, activeTab));
  const tabMeasurementType = useSelector((state) => selectTabMeasurementType(state, activeTab));

  const isFinsished = useSelector(selectIsActiveTabFinished);
  const isNotPeakSubTab = activeSubTab !== 'peaks';

  const measurementsToAdd = useSelector(selectMeasurementEntriesToOpen);
  const measurementsToClose = useSelector(selectMeasurementEntriesToClose);
  const filesToOpen = useSelector(selectFilesToOpen);
  const packagesToOpen = useSelector(selectPackagesToOpen);

  const calibsToFocus = useSelector(selectCalibEntriesToFocus);
  const filesToFocus = useSelector(selectFileEntriesToFocus);

  const hashToIdMap = useSelector(selectCalibrationHashToId);

  const packagesCount = useSelector(selectAllPackagesCount);
  const measurementsCount = useSelector(selectMeasCount);

  const isAutosamplerChosen = useSelector(selectAutosamplerType) !== 'none';
  const isCustomAutoIpSet = !!useSelector(selectAutosamplerIpAddress);
  const isAutoIpAutoGet = useSelector(selectAutosamplerAutoIp);

  const isAutosamplerAvailable = useSelector(selectIsAutosamplerAvailable);
  const isAutoIpSet = isCustomAutoIpSet || isAutoIpAutoGet;
  const isAutoPortSet = useSelector(selectAutosamplerComPort)
  const isAutoConfigSet = isAutoIpSet || isAutoPortSet
  const isAutosamplerReady = isAutosamplerChosen && isAutoConfigSet && isAutosamplerAvailable;

  const measurementType = useSelector((state) => selectTabMeasurementType(state, activeTab));

  const isChroma = measurementType === MEASUREMENT_TYPES.chroma;

  const isActCalcEmpty = useSelector(state => selectIsActCalculatedEmpty(state, { tabId: activeTab }))
  const isInitialised = useSelector((state) => selectIsTabInitialized(state, activeTab));

  const FSBlocked = !isElectron && !hasMock

  const [exportRegistryVersion, setExportRegistryVersion] = useState(
    plotExportRegistry.getVersion(),
  );

  useEffect(() => plotExportRegistry.subscribe(setExportRegistryVersion), []);

  const activeTabName = useSelector((state) => selectNameById(state, activeTab));

  const tabReportPlotsMustFreeze = useSelector((state) => selectReportFreezePlots(state, activeTab));

  const exportIsDisabled = useMemo(() => {
    const tabId = activeTab;
    const plotId = activeSubTab ?? tabType;

    if (plotId === 'signals') {
      return plotExportRegistry.getAllSignals(tabId).length === 0;
    }

    return !plotExportRegistry.get(tabId, plotId);
  }, [
    exportRegistryVersion,
    activeTab,
    activeSubTab,
    tabType,
    tabReportPlotsMustFreeze,
  ]);

  useEffect(() => {
    if (api && withoutControl) {
      BLOCKED_TABS_ON_WITHOUT_CONTROL.forEach((tab) => {
        api.getPanel(tab)?.api?.close();
      });
    }
  }, [api, withoutControl]);

  const isMeasurementRunning = useSelector(selectIsMainStreaming);

  useEffect(() => {
    if (api && isMeasurementRunning) {
      api.getPanel(UTILITY_TABS.THERMOSTAT.id)?.api?.close();
      api.getPanel(UTILITY_TABS.GRADIENT.id)?.api?.close(); // order was to close it too PEW-1260
      api.getPanel(UTILITY_TABS.ISOCRAT.id)?.api?.close(); // order was to close it too PEW-1260
    }
  }, [api, isMeasurementRunning]);

  useEffect(() => {
    if (api && calibsToFocus.length) {
      calibsToFocus.forEach((calibEntry) => {
        const sameDataTab = api?.panels?.find((tab) => tab.id === calibEntry.id) ?? null;

        if (sameDataTab) {
          console.warn(calibEntry.id, 'already exist');
          sameDataTab.api.setActive(); // higlight already existing no reopens
          dispatch(calibrationActions.setShouldFocus({ id: calibEntry.id, shouldFocus: false }));
        }
      });
    }
  }, [api, calibsToFocus]);

  useEffect(() => {
    if (api && filesToFocus.length) {
      filesToFocus.forEach((fileEntry) => {
        const existing = api?.panels?.find((tab) => tab.id === fileEntry.id) ?? null;

        if (existing) {
          console.warn('[FILE FOCUS]', fileEntry.id, 'already exists, refocusing');
          existing.api.setActive();
          dispatch(fileActions.setShouldFocus({ id: fileEntry.id, shouldFocus: false }));
          return;
        }

        // ─────────── Unexpected state logging ───────────
        console.error(
          '[FILE FOCUS][UNEXPECTED] Focus requested but panel does NOT exist!',
          {
            id: fileEntry.id,
            name: fileEntry.name,
            reduxEntry: fileEntry,
            currentPanels: api?.panels?.map((p) => p.id) ?? 'NO PANELS',
          },
        );

        // ensure flag doesn’t get stuck forever
        dispatch(fileActions.setShouldFocus({ id: fileEntry.id, shouldFocus: false }));
      });
    }
  }, [api, filesToFocus]);

  useEffect(() => {
    if (api && measurementsToClose.length) {
      measurementsToClose.forEach((measurementEntry) => {
        api.getPanel(measurementEntry.id)?.api?.close();
      });
    }
  }, [api, measurementsToClose]);

  const isBackgroundMeasuredEmpty = useSelector((state) => selectIsPlotEmpty(state, {
    tabId: activeTab,
    pointType: 'measuredChromatogram',
    plotState: 'background',
  }));

  const doShowBackground = useSelector((state) => selectDoShowBackground(state, activeTab)) && !isBackgroundMeasuredEmpty;

  useEffect(() => {
    if (isMarkedForClose && tabType === TAB_TYPES.CALIBRATION) {
      const tabToClose = activeTab;

      // Trigger panel close (synchronously)
      api.getPanel(tabToClose)?.api?.close();
      setTimeout(() => {
        dispatch(calibrationActions.deleteCalibTabData({ calibrationTabId: tabToClose }));
      }, 0); // Allow React one tick to unmount cleanly
    }
  }, [isMarkedForClose, activeTab, tabType, api, dispatch]);

  useEffect(() => {
    if (api) {
      api.onDidActiveGroupChange(((eventApi) => {
        const nonFloatingGroups = api.groups.filter((group) => group.api.location.type !== 'floating');

        if (nonFloatingGroups.includes(eventApi)) { // if not floating and changed to existing group
          setLastNFgroup(eventApi);
        } else if (!eventApi || nonFloatingGroups.length === 0) { // if changed to no groups exist or all floating
          setLastNFgroup(null);
        }
      }));

      api.onDidLayoutChange(() => {
        for (const group of api.groups) {
          if (group.api.location?.type === 'floating') {
            for (const panel of group.panels) {
              const {
                minFloatingWidth,
                minFloatingHeight,
                maxFloatingWidth,
                maxFloatingHeight,
              } = panel.params;

              const w = group.api.width;
              const h = group.api.height;
              const clampedW = Math.min(w, maxFloatingWidth);
              const clampedH = Math.min(h, maxFloatingHeight);
              if (clampedW !== w || clampedH !== h) {
                group.api.setSize({ width: clampedW, height: clampedH });
              }
            }
          }
        }
      });
    }
  }, [api]);

  // generic to allow programmatic add
  const addTab = ({
    id, title, tabType, measurementType, component, renderer = 'always',
  }) => {
    const options = {
      id,
      component,
      title,
      renderer,
      position: {
        referenceGroup: lastNFgroup,
        direction: 'within',
      },
      params: {
        tabId: id,
        ...(measurementType && { measurementType }),
        tabType,
        floatingInitialWidth: 480,
        floatingInitialHeight: 385,
        minFloatingHeight: 380,
        minFloatingWidth: 380,
      },
    };
    assertPanel(api, options);
  };

  const componentNameMap = {
    chroma: 'ChromatographicMesurements',
    spectro: 'SpectroscropicMesurements',
    package: 'PackageTab',
  };

  const countRefForBatch = useRef(measurementsCount);

  useEffect(() => {
    countRefForBatch.current = measurementsCount;
  }, [measurementsCount]);

  useEffect(() => {
    if (!measurementsToAdd.length) return;

    let counter = countRefForBatch.current; // snapshot before batch

    measurementsToAdd.forEach((entry) => {
      const { id, name, type: measurementType } = entry;
      const component = componentNameMap[measurementType];
      let title = name;
      if (title == null) {
        counter += 1;
        title = `Хроматографическое измерение [${countRefForBatch.current + 1}]`;
      }
      addTab({
        id,
        title,
        tabType: TAB_TYPES.MEASUREMENT,
        measurementType,
        component,
      });
      dispatch(measurementActions.markAsOpened({ tabId: id }));
    });
  }, [measurementsToAdd]);

  useEffect(() => {
    filesToOpen.forEach((entry) => {
      const { id, name, type: measurementType } = entry;
      const component = componentNameMap[measurementType];
      const title = name;

      addTab({
        id,
        title,
        tabType: TAB_TYPES.FILE,
        measurementType,
        component,
      });
      dispatch(fileActions.setOpenState({ id, openState: OPEN_STATES.OPENED }));
    });
  }, [filesToOpen]);

  const addChromaMeasurement = async (/* fileData */) => {
    let id;
    let title;
    let newMeasurementData;

    /*     if (!fileData) { */
    id = `chromatographicMeasurement_${uuidv1()}`;
    title = `Хроматографическое измерение [${measurementsCount + 1}]`;
    const addChromaActionResult = await dispatch(addChromaThunk({ preId: id }));
    newMeasurementData = addChromaActionResult.payload;
    /*     } else {
      const { fileName } = fileData;
      id = fileName || `chromatographicMeasurement${uuidv1()}`;
      title = fileName || `Хроматографическое измерение [${measurementsCount + 1}]`;
    }  */

    const options = {
      id,
      component: 'ChromatographicMesurements',
      title,
      renderer: 'onlyWhenVisible',
      position: {
        referenceGroup: lastNFgroup,
        direction: 'within',
      },
      params: {
        tabId: id,
        measurementType: 'chroma',
        tabType: /* fileData ? TAB_TYPES.FILE : */ TAB_TYPES.MEASUREMENT,
        floatingInitialWidth: 480,
        floatingInitialHeight: 385,
        minFloatingHeight: 380,
        minFloatingWidth: 380,
      },

    };

    assertPanel(api, options);

    /* if (!fileData) {  */
    /* we have to fetch method data and force templates on new measurement,
      because only last chooseMethod data is kept */
    await dispatch(chooseMethod({ selectedMethod: newMeasurementData.method }));
    /*     } */
  };

  const handleChromaClick = (event) => {
    addChromaMeasurement(null);
  };

  const addSpectroMeasurement = async (/* fileData */) => {
    let id;
    let title;
    let newMeasurementData;

    /*     if (!fileData) { */
    id = `spectroscopicMeasurement_${uuidv1()}`;
    title = `Спектральное измерение [${measurementsCount + 1}]`;
    const addChromaActionResult = await dispatch(addSpectroThunk({ preId: id }));
    newMeasurementData = addChromaActionResult.payload;
    /*     } else {
      const { fileName } = fileData;
      id = fileName || `spectroscopicMeasurement_${uuidv1()}`;
      title = fileName || `Спектральное измерение [${measurementsCount + 1}]`;
    }  */

    const options = {
      id,
      component: 'SpectroscropicMesurements',
      title,
      renderer: 'onlyWhenVisible',
      position: {
        referenceGroup: lastNFgroup,
        direction: 'within',
      },
      params: {
        tabId: id,
        measurementType: 'spectro',
        tabType: /* fileData ? TAB_TYPES.FILE : */ TAB_TYPES.MEASUREMENT,
        floatingInitialWidth: 480,
        floatingInitialHeight: 385,
        minFloatingHeight: 380,
        minFloatingWidth: 380,
      },

    };

    assertPanel(api, options);

    /*     if (!fileData) {  */
    // we have to fetch method data and force templates on new measurement,
    // because only last chooseMethod data is kept
    await dispatch(chooseMethod({ selectedMethod: newMeasurementData.method }));
    /*     } */
  };

  const handleSpectroClick = (event) => {
    addSpectroMeasurement(null);
  };

  const handleThermostatClick = () => {
    const maxWidth = 420;
    const minWidth = 370;
    const maxHeight = 300;
    const minHeight = 185;
    const initialHeight = 410;
    const initialWidth = 290;

    const options = {
      id: UTILITY_TABS_MAP.THERMOSTAT,
      component: 'ThermostatTab',
      title: 'Термостат',
      floating: {
        width: initialWidth, height: initialHeight, x: 250, y: 50,
      },
      params: {
        maxFloatingWidth: maxWidth,
        maxFloatingHeight: maxHeight,
        minFloatingHeight: minHeight,
        minFloatingWidth: minWidth,
        floatingInitialWidth: initialHeight,
        floatingInitialHeight: initialWidth,
      },
    };
    assertPanel(api, options);
  };

  const handleIsocratClick = () => {
    closeConterpart(api, UTILITY_TABS_MAP.GRADIENT);

    const maxWidth = 450;
    const minWidth = 282;
    const maxHeight = 800;
    const minHeight = 220;
    const options = {
      id: UTILITY_TABS_MAP.ISOCRAT,
      component: 'MainIsocratTab',
      title: 'Изократический режим',
      floating: {
        width: 450, height: 680, x: 250, y: 0,
      },
      params: {
        maxFloatingWidth: maxWidth,
        maxFloatingHeight: maxHeight,
        minFloatingHeight: minHeight,
        minFloatingWidth: minWidth,
      },
    };

    assertPanel(api, options);
  };

  const handleGradientClick = () => {
    closeConterpart(api, UTILITY_TABS_MAP.ISOCRAT);

    const maxWidth = 740;
    const minWidth = 410;
    const maxHeight = 830;
    const minHeight = 225;
    const options = {
      id: UTILITY_TABS_MAP.GRADIENT,
      component: 'MainGradientTab',
      title: 'Градиентный режим',
      floating: {
        width: 740, height: 680, x: 250, y: 0,
      },
      params: {
        maxFloatingWidth: maxWidth,
        maxFloatingHeight: maxHeight,
        minFloatingHeight: minHeight,
        minFloatingWidth: minWidth,
      },
    };
    assertPanel(api, options);
  };

  const handleAutosamplerClick = async () => {
    dispatch(fetchAutoConfig());
    const options = {
      id: 'autosampler',
      component: 'AutosamplerTab',
      title: 'Автосамплер',
      params: {
        floatingInitialWidth: 480,
        floatingInitialHeight: 385,
        minFloatingHeight: 380,
        minFloatingWidth: 380,
      },
    };
    assertPanel(api, options);
  };

  const handleViewCalibrationClick = async (event) => {
    if (selectedCalib === null) return; // disallow null calib viewing
    const newCalibrationTabHash = computeCalibKey(selectedMethod, selectedCalib, calibOriginFile); // WATCHLIST HACK naive but logical
    const existingId = hashToIdMap[newCalibrationTabHash];
    if (api) {
      const sameDataTab = api?.panels?.find((tab) => tab.id === existingId) ?? null;
      if (sameDataTab) {
        console.warn(existingId, newCalibrationTabHash, 'already exist');
        sameDataTab.api.setActive(); // higlight already existing no reopens
        return;
      }
    }

    const newTabId = uuidv1();

    try {
      await dispatch(viewCalibration({
        calibrationTabId: newTabId,
        openedOnfileId: activeTab,
      })).unwrap(); // <- THIS will throw if rejected
    } catch (error) {
      console.error('Failed to view calibration', error);
      return;
    }

    dispatch(calibrationActions.addCalibrationTab({
      tabId: newTabId,
      calibration: selectedCalib,
      // we need to keep calibration that is loaded from file in list options for this viewCalib tab
      originFile: calibOriginFile,
      method: selectedMethod,
      activeComponentIndex: 0,
    }));

    const options = {
      id: newTabId,
      component: 'CalibrationTab',
      title: `Градуировка [${selectedCalib}]`,
      renderer: 'always',
      position: {
        referenceGroup: lastNFgroup,
        direction: 'within',
      },
      params: {
        tabId: newTabId,
        tabType: TAB_TYPES.CALIBRATION,
        measurementType: 'chroma',
        floatingInitialWidth: 640,
        floatingInitialHeight: 640,
        minFloatingHeight: 480,
        minFloatingWidth: 540,
      },
    };

    assertPanel(api, options);
  };

  useEffect(() => {
    packagesToOpen.forEach((entry) => {
      const { id, name } = entry;
      const title = name;

      addTab({
        id,
        title,
        tabType: TAB_TYPES.PACKAGE,
        component: componentNameMap.package,
        renderer: 'onlyWhenVisible',
      });
      dispatch(packageActions.setShouldOpen({ id, shouldOpen: false, hasOpened: true }));
    });
  }, [packagesToOpen]);

  const handlePackageClick = async (event) => {
    const id = `package_${uuidv1()}`;
    const name = `Пакетная обработка [${packagesCount + 1}]`;

    await dispatch(initPackage({ id, name }));
  };

  const handleShowModal = (name) => {
    const setter = modalSetters[name];
    if (setter) {
      setter(true);
    } else {
      console.warn(`No modal setter found for: ${name}`);
    }
  };

  const handleCloseModal = (name) => {
    const setter = modalSetters[name];
    if (setter) {
      setter(false);
    } else {
      console.warn(`No modal setter found for: ${name}`);
    }
  };

  /*   const handleFileChange = async (event) => {
    const files = Array.from(event.target.files);

    const valid = files.filter(f => f.name.toLowerCase().endsWith(".mdfx"));
    const invalid = files.filter(f => !f.name.toLowerCase().endsWith(".mdfx"));

    if (invalid.length > 0) {
      dispatch(
        errorsActions.addError({
          errorId: 'ui_extensionInvalid',
        })
      );
    }

    if (valid.length > 0) {
      await dispatch(uploadFilesAndAddEntries({
        files: valid,
        config: {shouldOpen: true}
      })).unwrap();;
    }
    event.target.value = null;  // Reset input value after processing
  }; */

  const handleDegasserClick = () => {
    const maxWidth = 450;
    const minWidth = 320;
    const maxHeight = 90;
    const minHeight = 90;
    const options = {
      id: UTILITY_TABS_MAP.DEGASSER,
      component: 'DegasserTab',
      title: 'Дегазатор',
      floating: {
        width: maxWidth, height: maxHeight, x: 250, y: 0,
      },
      params: {
        maxFloatingWidth: maxWidth,
        maxFloatingHeight: maxHeight,
        minFloatingHeight: minHeight,
        minFloatingWidth: minWidth,
      },
    };

    assertPanel(api, options);
  };

  const handleSaveOperationalData = (type) => (e) => {
    dispatch(saveOperationalData({ type, save: e.checked }));
  };

  const handleAddPeak = () => {
    dispatch(peaksActions.setPeakWorkMode({ tabId: activeTab, workMode: PEAK_WORK_MODES.ADD }));
  };

  const handleDeletePeak = () => {
    dispatch(peaksActions.setPeakWorkMode({ tabId: activeTab, workMode: PEAK_WORK_MODES.DELETE }));
  };

  const handleDeleteAllPeaks = () => {
    dispatch(deleteAllPeaks(activeTab));
  };

  const handleClickFirmware = () => {
    dispatch(getFirmwareVersions());
    handleShowModal('firmware');
  };

  useEffect(() => {
    if (peakWorkMode === PEAK_WORK_MODES.DELETE && isPeaksEmpty) {
      // on no peaks left deactivate delete
      dispatch(peaksActions.setPeakWorkMode({ tabId: activeTab, workMode: null }));
    }
  }, [peakWorkMode, isPeaksEmpty]);

  const isDisabledPeakFuncs = useSelector((state) => selectIsPeakFuncsDisabled(state, activeTab));

  const handleShowBackgroundChroma = () => dispatch(chromaPlotsActions.setDisplayOptions({
    parentId: activeTab,
    displayOptions: {
      showBackground: !doShowBackground,
    },
  }));

  const printPdfHandlerId   = `report.export.pdf.${activeTab}`;
  const exportDocxHandlerId = `report.export.docx.${activeTab}`;
  const printDirectHandlerId = `report.print.direct.${activeTab}`;

  
  const isPdfAvailable = useCommandAvailability(printCommandRegistry, printPdfHandlerId);

  const handleExportPdf = () => {
    printCommandRegistry.execute(printPdfHandlerId);
  };

  const isDocxAvailable = useCommandAvailability(
    printCommandRegistry,
    exportDocxHandlerId,
  );

  const handleExportDocx = () => {
    printCommandRegistry.execute(exportDocxHandlerId);
  };

  const isPrintDirectAvailable = useCommandAvailability(
    printCommandRegistry,
    printDirectHandlerId,
  );

  const handlePrintDirect = () => {
    printCommandRegistry.execute(printDirectHandlerId);
  };


  async function uploadMdfx() {
    if (FSBlocked) {
      console.warn('Electron API not available: upload disabled');
      return;
    }

    const eAPI = getElectronAPI();
    console.log('eAPI', eAPI)
    const hashedPaths = await eAPI.openMdfx();
    console.log('Result of electron select file for open', hashedPaths)
    if (!hashedPaths) return;

    await dispatch(openHashedFilesByPath({ entries: hashedPaths }));
    const recent = await eAPI.getRecentFiles();
    setRecentFiles(recent);
  }

  const [recentFiles, setRecentFiles] = useState([]);

  useEffect(() => {
    if (!isElectron) return;
    getElectronAPI().getRecentFiles().then(setRecentFiles);
  }, [isElectron, getElectronAPI]);

  async function handleOpenRecent(recentEntry) {
    if (!recentEntry?.path) {
      console.warn('[RECENT OPEN] Invalid entry:', recentEntry);
      return;
    }

    if (!isElectron) {
      console.warn('[RECENT OPEN] Electron API not available');
      return;
    }

    const eAPI = getElectronAPI();
    const { isFullAccess, exists, readable } = await eAPI.checkFile(recentEntry.path);

    if (!isFullAccess) {
      console.warn('[RECENT OPEN] Access denied:', {
        path: recentEntry.path,
        exists,
        readable,
      });

      dispatch(
        errorsActions.addError({
          fetchedError: {
            message: 'Файл не найден или недоступен. Возможно, он был перемещён или удалён.',
          },
        }),
      );

      // self-healing refresh
      const list = await getElectronAPI().getRecentFiles();
      setRecentFiles(list);
      return;
    }

    // SAFE PATH
    await dispatch(openHashedFilesByPath({ entries: [recentEntry] }));

    const list = await eAPI.getRecentFiles();
    setRecentFiles(list);
  }

  /*   const handleCloseAll = useCallback(() => {
    // Dockview API гарантирует, что api.panels — это актуальный список
    for (const panel of api.panels) {
      closeCommandRegistry.execute(panel.id);
    }
  }, [api]); */

  const activeTabRef = useRef(activeTab);
  const activeSubTabRef = useRef(activeSubTab);
  const tabTypeRef = useRef(tabType);

  useEffect(() => {
    activeTabRef.current = activeTab;
    activeSubTabRef.current = activeSubTab;
    tabTypeRef.current = tabType;
  }, [activeTab, activeSubTab, tabType]);

  const exportXlsx = useCallback(() => {
    if (!api) return;

    const tabId = activeTabRef.current;
    const tabType = tabTypeRef.current;
    const plotId = activeSubTabRef.current ?? tabType;

    const panel = api.activePanel;
    const rawTitle = panel?.title || 'export';
    const safeTitle = `${rawTitle.replace(/[<>:"/\\|?*]/g, '_')} (${plotId})${'.xlsx'}`;

    console.log('registry props', tabId, plotId);

    let aoa;

    if (plotId !== 'signals') {
      // normal case
      const extractor = plotExportRegistry.get(tabId, plotId);
      if (!extractor) return console.warn('No extractor registered');
      aoa = extractor({ aoa: true, tsv: false }).aoa;
    } else {
      // SIGNALS TAB MULTI-EXPORT
      const all = plotExportRegistry.getAllSignals(tabId);
      if (!all.length) return console.warn('No signal plots registered');

      // Merge all AOAs side-by-side
      aoa = mergeSignalAOAs(all);
    }

    const hasData = Array.isArray(aoa)
      && aoa.length > 1 // more than header
      && aoa.slice(1).some((row) => // at least one non-empty row
        Array.isArray(row) && row.some((cell) => cell !== '' && cell != null));

    if (!hasData) {
      console.warn('Nothing to export — all traces empty or invisible');
      return;
    }
    if (!isElectron) {
      console.warn('Electron API not available: cannot export xlsx');
      return;
    }

    getElectronAPI().generateXLSX({
      rows: aoa,
      filePlaceholderName: safeTitle,
    });
  }, [api]);

  const handleSaveAs = async () => {
    if (!isElectron) {
      console.warn('saveAs API not available');
      return;
    }

    const result = await getElectronAPI().saveAs(activeTabName);

    if (!result || result.canceled || !result.filePath) {
      return;
    }

    console.log('Main menu save as', result.filePath, tabType, tabMeasurementType, activeTab);
    dispatch(
      saveAsRequested({
        filePath: result.filePath,
        tabId: activeTab,
        tabType,
        measurementType: tabMeasurementType,
      }),
    );
  };

  return (
    <div>

      <NodeConfigModal show={showNodeModal} onClose={() => handleCloseModal('node')} />

      <AutoMarkModal
        show={showAutoMarkModal}
        onClose={() => handleCloseModal('autoMark')}
        noPost={isDisabledPeakFuncs}
      />

      <PumpParamsModal show={showPumpParamsModal} onClose={() => handleCloseModal('pumpParams')} />

      <AboutModal show={showAboutModal} onClose={() => handleCloseModal('about')} />

      <FirmwareModal show={showFirmwareModal} onClose={() => handleCloseModal('firmware')} />

      <SmoothingModal
        show={showSmoothingModal}
        onClose={() => handleCloseModal('smoothing')}
        activeTab={activeTab}
      />

      <PeakIdModal
        show={showPeakIdModal}
        onClose={() => handleCloseModal('peakId')}
        activeTab={activeTab}
      />

      <FoldersModal
        show={showFoldersModal}
        onClose={() => handleCloseModal('folders')}
      />

      <ConcentrationParamsModal
        tabId={activeTab}
        show={showConcentrationModal}
        onClose={() => handleCloseModal('concentration')}
      />

      <div id='main-menu' className={styles.mainMenuContainer}>
        <div className={styles.menuAndControlsContainer}>
          <div className="btn-group" role="group">
            {/* File Menu */}
            <Menu
              className={`${styles.menuZFix}`}
              menuButton={(
                <MenuButton
                  className={`btn btn-primary btn-sm dropdown-toggle ${styles.btn}`}
                  disabled={FSBlocked}
                >
                  Файл
                </MenuButton>
              )}
            >
              <MenuItem onClick={uploadMdfx} disabled={FSBlocked}>Открыть</MenuItem>
              <MenuItem onClick={handleSaveAs} disabled={!isFinsished || FSBlocked}>Сохранить как</MenuItem>

              <MenuItem onClick={handlePackageClick} disabled={FSBlocked}>Пакетная обработка</MenuItem>
              {/* <MenuItem onClick={handleCloseAll}>Закрыть все</MenuItem> */}
              <MenuItem onClick={() => setShowFoldersModal(true)} disabled={FSBlocked}>Папки</MenuItem>

              <MenuItem
                onClick={handlePrintDirect}
                disabled={!isPrintDirectAvailable || FSBlocked}
              >
                Печать отчета
              </MenuItem>

              <MenuItem onClick={handleExportPdf} disabled={!isPdfAvailable || FSBlocked}>Экспорт отчета в PDF</MenuItem>
              <MenuItem onClick={handleExportDocx} disabled={!isDocxAvailable || FSBlocked}>Экспорт отчета в DOCX</MenuItem>
              <MenuItem onClick={exportXlsx} disabled={exportIsDisabled || FSBlocked}>Экспорт текущего графика в xlsx</MenuItem>

              {isElectron && recentFiles.length > 0 && (
                <SubMenu label="Недавние файлы">
                  {recentFiles.map((r) => (
                    <MenuItem key={r.id} onClick={() => handleOpenRecent(r)}>
                      {r.fileName}
                    </MenuItem>
                  ))}
                </SubMenu>
              )}
            </Menu>

            {/* Measurements Menu */}
            <Menu className={`${styles.menuZFix}`} menuButton={<MenuButton className={`btn btn-primary btn-sm dropdown-toggle ${styles.btn}`}>Измерения</MenuButton>}>
              <MenuItem onClick={handleChromaClick}>Хроматографические</MenuItem>
              <MenuItem onClick={handleSpectroClick}>Спектральные</MenuItem>
              <SubMenu label="Фоновая хроматограмма">
                <MenuItem
                  type="checkbox"
                  checked={doShowBackground}
                  onClick={handleShowBackgroundChroma}
                  disabled={isBackgroundMeasuredEmpty}
                >
                  Показать
                </MenuItem>
              </SubMenu>
            </Menu>

            {/* Calculation Menu */}
            <Menu className={`${styles.menuZFix}`} menuButton={<MenuButton className={`btn btn-primary btn-sm dropdown-toggle ${styles.btn}`}>Расчет</MenuButton>}>
              <MenuItem onClick={() => handleShowModal('autoMark')} disabled={!isChroma}>Автоматическая разметка</MenuItem>
              <MenuItem
                onClick={handleAddPeak}
                disabled={isDisabledPeakFuncs || isNotPeakSubTab}
                className={peakWorkMode === PEAK_WORK_MODES.ADD ? 'bg-primary-subtle' : ''}
              >
                Добавить пик
              </MenuItem>
              <MenuItem
                onClick={handleDeletePeak}
                disabled={isDisabledPeakFuncs || isPeaksEmpty || isNotPeakSubTab}
                className={peakWorkMode === PEAK_WORK_MODES.DELETE ? 'bg-primary-subtle' : ''}
              >
                Удалить пик
              </MenuItem>
              <MenuItem
                onClick={handleDeleteAllPeaks}
                disabled={isDisabledPeakFuncs || isPeaksEmpty || isNotPeakSubTab}
              >
                Удалить все пики
              </MenuItem>

              <SubMenu label="Параметры">
                <MenuItem
                  onClick={() => handleShowModal('smoothing')}
                  disabled={!isChroma}
                >
                  Сглаживание
                </MenuItem>
                <MenuItem
                  onClick={() => handleShowModal('peakId')}
                  disabled={!isChroma}
                >
                  Идентификация пиков
                </MenuItem>
              </SubMenu>

              <MenuItem
                onClick={() => handleShowModal('concentration')}
                disabled={!isChroma || calibConcDisabled}
              >
                Параметры расчёта концентраций
              </MenuItem>
            </Menu>

            {/* Chromatograph Menu with Submenu */}
            <Menu className={`${styles.menuZFix}`} menuButton={<MenuButton className={`btn btn-primary btn-sm dropdown-toggle ${styles.btn}`}>Хроматограф</MenuButton>}>
              <MenuItem onClick={() => handleShowModal('node')}>Подключение узлов</MenuItem>
              <SubMenu label="Насосы" disabled={withoutControl || isMeasurementRunning}>
                <MenuItem onClick={handleIsocratClick} disabled={withoutControl || isMeasurementRunning}>Изократический</MenuItem>
                <MenuItem onClick={handleGradientClick} disabled={pumpsCount < 2 || withoutControl || isMeasurementRunning}>Градиентный</MenuItem>
                <MenuItem onClick={() => handleShowModal('pumpParams')} disabled={withoutControl || isMeasurementRunning}>Параметры</MenuItem>
              </SubMenu>
              <MenuItem onClick={handleThermostatClick} disabled={isMeasurementRunning || withoutControl}>Термостат</MenuItem>
              <MenuItem onClick={handleAutosamplerClick} disabled={!isAutosamplerReady}>Автосамплер</MenuItem>
              <MenuItem onClick={handleDegasserClick} disabled={withoutControl}>Дегазатор</MenuItem>
              <MenuItem
                type="checkbox"
                checked={doesSaveJournal}
                onClick={handleSaveOperationalData('saveJournal')}
              >
                Сохранять журнал
              </MenuItem>
              <MenuItem
                type="checkbox"
                checked={doesSaveProtocol}
                onClick={handleSaveOperationalData('saveProtocol')}
              >
                Сохранять протокол обмена
              </MenuItem>
              <MenuItem onClick={() => downloadConsoleLog(logBuffer)}>
                Скачать лог консоли
              </MenuItem>

              <SubMenu label="Диагностика" disabled={!hasDiagnosticsAccess()}>
                <MenuItem onClick={handleClickFirmware}>Прошивки</MenuItem>
              </SubMenu>
            </Menu>

            <Menu className={`${styles.menuZFix}`} menuButton={<MenuButton className={`btn btn-primary btn-sm dropdown-toggle ${styles.btn}`}>Информация</MenuButton>}>
              <MenuItem onClick={() => handleShowModal('about')}>О программе</MenuItem>
            </Menu>
          </div>
          <div className="d-flex  align-items-center">
            <StartStopControl api={api} />
            <StepTableControl />
            <PeakControl />
          </div>
        </div>

        <div className={styles.calibrationAndMetodsContainer}>
          <MethodsMenu />
          <CalibrationMenu onViewClick={handleViewCalibrationClick} />
        </div>
      </div>
    </div>
  );
}

export default MainMenu;
