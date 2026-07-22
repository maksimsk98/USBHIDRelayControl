import { DockviewReact } from 'dockview';
import { useDispatch, useSelector } from 'react-redux';
import { Allotment } from 'allotment';

import ControlPanel from './menu/ControlPanel.jsx';
import ThermostatTab from './menu/mainMenu/chromatograph/ThermostatTab.jsx';
import MainIsocratTab from './menu/mainMenu/chromatograph/pumps/MainIsocratTab.jsx';
import ChromatographicMesurements from './chromotograph/ChromatographicMeasurements.jsx';
import Sidebar from './menu/sideBar/Sidebar.jsx';
import MainTabHeader from './MainTabHeader.jsx';
import Toasts from './menu/Toasts.jsx';
import Watermark from './custom/VersionWatermark.jsx';
import CalibrationTab from './calibrationView/CalibrationTab.jsx';
import UserPanel from './UserPanel.jsx';

import 'bootstrap/dist/css/bootstrap.min.css';
import './styleDockviewAsBootstrap.css';
import 'allotment/dist/style.css';

import 'react-bootstrap-typeahead/css/Typeahead.css';
import 'react-complex-tree/lib/style-modern.css';

// globals must be later than other css imports to override properly
import '../styles/globals.css';

import logo from '../assets/logo.png';

import {
  selectChosenDetector, selectDetectorSerial, selectDetectorType, selectStreamedMeasName, tabActions,
} from '../services/reduxImportDispatcher.js';
import { useConfirmOnExit } from '../hooks/confirmCloseOfApp.js';
import MainGradientTab from './menu/mainMenu/chromatograph/pumps/MainGradientTab.jsx';
import DegasserTab from './menu/mainMenu/chromatograph/pumps/DegasserTab.jsx';
import AutosamplerTab from './autosampler/AutosamplerTab.jsx';
import PackageTab from './menu/mainMenu/package/PackageTab.jsx';
import { UTILITY_GROUP_NAMES, DETECTOR_FULL_NAMES } from '../constants/constants.js';

import { displaySafeNodeName } from '../utils/nodes.js';
import { TernaryForkModal } from '../hooks/useTernaryFork.js';
import { closeAndSaveChangeThunk } from '../services/thunks/closeAndSaveChanged.js';
import { useDockviewAutoLayout } from '../hooks/useDockviewAutoLayout.js';
import SpectroscropicMesurements from './spectroscopic/SpectroscopicMeasurement.jsx';
import {
  createContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { useGlobalHotkeys } from '../hooks/useGlobalHotkeys.js';
import { registerSession, unregisterSession } from '../services/thunks/session/sessionThunks.js';
import { sessionActions } from '../services/slices/sessionSlice.js';

const components = {
  ThermostatTab,
  MainIsocratTab,
  MainGradientTab,
  ChromatographicMesurements,
  SpectroscropicMesurements,
  CalibrationTab,
  DegasserTab,
  AutosamplerTab,
  PackageTab,
  Default: (props) => (
    <div>
      default
    </div>
  ),
};

function LumexLogo(props) {
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'blue',
        background: 'white',
      }}
    >
      <img src={logo} alt="Lumex" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
    </div>
  );
}

export const TabStateContext = createContext(); // DO i even need it anymore?

const headerComponents = {
  default: MainTabHeader,
};

function App(props) {
  const [api, setApi] = useState();
  const dispatch = useDispatch();

  const detectorType = useSelector(selectDetectorType);
  const detectorName = useSelector(selectChosenDetector);
  const streamedName = useSelector(selectStreamedMeasName);
  const detectorSerial = useSelector(selectDetectorSerial)

  useEffect(() => {
    if (window.electronAPI && typeof window.electronAPI.onDevMode === 'function') {
      window.electronAPI.onDevMode((value) => {
        console.log('Electron DEV mode:', value);
      });
    }
    if (window.electronAPI && typeof window.electronAPI.onTestingMode === 'function') {
      window.electronAPI.onTestingMode((value) => {
        console.log('Electron TESTING mode:', value);
      });
    }

    if (window.electronAPI && typeof window.electronAPI.getSessionId === 'function') {
      window.electronAPI.getSessionId((value) => {
        console.log('Electron sessionId:', value);
        dispatch(sessionActions.setSessionId(value))
        dispatch(registerSession(value))
      });
    }    
  }, []);

  useEffect(() => {
    const parts = ['PeakExpertWeb'];

    if (detectorType) parts.push(DETECTOR_FULL_NAMES[detectorType] || '');
    if (detectorName) parts.push(displaySafeNodeName(detectorSerial, detectorName));
    if (streamedName) parts.push(streamedName);

    document.title = parts.join(' - ');
  }, [detectorType, detectorName, streamedName, detectorSerial]);

  const {
    showConfirmModal,
    message,
    labels,
    handleConfirm,
    handleDecline,
    handleCancel,
  } = useConfirmOnExit({
    onSave: async () => dispatch(closeAndSaveChangeThunk()),
    onExit: () => {
      dispatch(unregisterSession())
    },
  });

  const onReady = (event) => {
    setApi(event.api);
  };

  useEffect(() => {
    const disableContextMenu = (event) => {
      event.preventDefault();
    };
    document.addEventListener('contextmenu', disableContextMenu);

    return () => {
      document.removeEventListener('contextmenu', disableContextMenu);
    };
  }, []);

  const lastActiveIdRef = useRef(null);
  const EXCLUDE = useMemo(() => new Set(UTILITY_GROUP_NAMES), []);

  useEffect(() => {
    if (!api) {
      return () => {
        // noop
      };
    }

    const setActiveFlag = (id, active) => {
      if (!id) return;
      const p = api.getPanel(id);
      if (p && p.api) {
        p.api.updateParameters({ active });
      }
    };

    const disposables = [
      api.onDidActivePanelChange((panel) => {
        const nextId = (panel && panel.id) ? panel.id : null;
        const prevId = lastActiveIdRef.current;

        if (prevId && prevId !== nextId) {
          setActiveFlag(prevId, false);
        }

        if (nextId && !EXCLUDE.has(nextId)) {
          setActiveFlag(nextId, true);
          lastActiveIdRef.current = nextId;

          dispatch(tabActions.setActiveTab(nextId));
        } else {
          lastActiveIdRef.current = null;
        }
      }),
      api.onDidRemovePanel((panel) => {
        dispatch(tabActions.checkAndNullActiveTab(panel.id));
      }),

    ];

    return () => {
      disposables.forEach((disposable) => disposable.dispose());
    };
  }, [api, dispatch]);

  useDockviewAutoLayout(api, 'working-area', 500);

  useGlobalHotkeys();

  return (
    <div
      className="App"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
      }}
    >
      <Watermark />
      <Toasts />
      <UserPanel />
      <TernaryForkModal
        show={showConfirmModal}
        message={message}
        labels={labels}
        onConfirm={handleConfirm}
        onDecline={handleDecline}
        onCancel={handleCancel}
      />

      <Allotment style={{ flex: 1, minHeight: 0 }}>
        <Allotment.Pane minSize={200} style={{ height: '100%' }}>
          <div
            id="working-area"
            style={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              overflowX: 'auto',
              scrollbarGutter: 'stable',
            }}
          >
            <ControlPanel api={api} />
            <DockviewReact
              onReady={onReady}
              components={components}
              noPanelsOverlay="emptyGroup"
              watermarkComponent={LumexLogo}
              defaultTabComponent={headerComponents.default}
              floatingGroupBounds="boundedWithinViewport"
              className={`${props.theme || 'dockview-theme-light'}`}
            />
          </div>
        </Allotment.Pane>
        <Allotment.Pane snap maxSize={300}>
          <Sidebar />
        </Allotment.Pane>
      </Allotment>
    </div>
  );
}

export default App;
