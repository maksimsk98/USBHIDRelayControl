import React, {
  useState, useEffect, useRef,
  useMemo,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import _ from 'lodash';

import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';

import { Badge } from 'react-bootstrap';
import CustomSelectGroup from '../../../custom/CustomSelectGroup';
import CustomInputGroup from '../../../custom/CustomInputGroup';
import CustomCheckboxGroup from '../../../custom/CustomCheckboxGroup';

import {
  configActions, selectChromatographData, selectIsMainStreaming,
} from '../../../../services/reduxImportDispatcher';

// base
import {
  selectAvailableNodes, selectNodeData, selectChromatographOptions, selectSelectedChromatograph,
} from '../../../../services/reduxImportDispatcher';

import { fetchNodes, getDetectorSerial, postNodeConfig } from '../../../../services/thunks/nodes/nodesThunks';
import { fetchConfig, reaffirmChromatograph } from '../../../../services/thunks/config/configThunks';

import {
  AUTOSAMPLER_TYPES,
  COM_AUTOSAMPLERS,
  detectorPortMap, detectorTypeOptions, EMPTY_ARRAY, IP_AUTOSAMPLERS, pumpNamesPerNum, SERVICE_NODE_NAMES, WITHOUT_CONTROL_MAP,
} from '../../../../constants/constants';
import SaveChromatographModal from './SaveChromatographModal';

import styles from './NodeConfigModal.module.css';
import CustomTypeaheadGroup from '../../../custom/CustomTypeaheadGroup';
import { isValidIp, isValidPartialIp } from '../../../../utils/validation';
import { selectNodesForSession } from '../../../../services/selectors/nodes/nodesDerived';
import { selectChromatographConfigsForUI } from '../../../../services/selectors/config/configDerived';
import { SERVICE_CHROMATOGRAPH_NAMES, SESSION_CHROMATOGRAPH_NAME } from '../../../../constants/fallbacks';

const getFreeOrMyNodes = (nodes = []) => 
  nodes
    .filter(node => node.isFree || node.isOwnedByMe)
    .map(node => node.value ?? '');

const sessionTempChromaOption = (
  <option
    key={SESSION_CHROMATOGRAPH_NAME}
    value={SESSION_CHROMATOGRAPH_NAME}
    style={{
      backgroundColor: "#fff3cd", // bootstrap warning light
      color: "#856404",
      fontWeight: 600,
    }}
  >
    Сессия (временный)
  </option>
)

const generateChromatographOptionsWithOwner = (configs, selected) => {
  // filter out as valid option due to backend returning it
  const options = Object.entries(configs).filter(([name]) => !SERVICE_CHROMATOGRAPH_NAMES.includes(name)).map(([name, cfg]) => (
    <option
      key={name}
      value={name}
      disabled={cfg.isTaken}
      style={
        cfg.isTaken
          ? { color: "#adb5bd" }
          : cfg.isMine
          ? { fontWeight: 600 }
          : undefined
      }
    >
      {name}
      {cfg.isTaken && " (занят)"}
    </option>
  ));

  // Conditionally add _sessionTemp as a special fallback option only on fallback
  if (selected === SESSION_CHROMATOGRAPH_NAME) {
    options.unshift(sessionTempChromaOption);
  }

  return options;
};

const findDuplicatePumpKeys = (pumpValues) => {
  const valueToKeys = {};
  const duplicates = new Set();

  for (const [key, value] of Object.entries(pumpValues)) {
    if (!value || value === 'noneChosen') continue;
    if (valueToKeys[value]) {
      // already mapped once, now duplicate found
      duplicates.add(key);
      duplicates.add(valueToKeys[value]);
    } else {
      valueToKeys[value] = key;
    }
  }
  return Array.from(duplicates);
};

const mapPumpValuesForApi = (pumps) => {
  const mappedPumps = {};
  Object.keys(pumps).forEach((key) => {
    // Replace "noneChosen" or "noneAvailable" with an empty string to comply with api
    mappedPumps[key] = (pumps[key] === 'noneChosen' || pumps[key] === 'noneAvailable') ? '' : pumps[key];
  });
  return mappedPumps;
};

const validatePumps = (pumpValues) => {
  // check to ensure all pumps are unique and no repeating choice
  const pumpSet = new Set();
  const values = Object.values(pumpValues);
  for (const value of values) {
    if (pumpSet.has(value)) {
      return false;
    }
    if (value !== 'noneChosen' && value !== '') {
      pumpSet.add(value);
    }
  }
  return true;
};

const emptyPumps = {
  A1: '',
  A2: '',
  B1: '',
  B2: '',
};

function NodeConfigModal(props) {
  const { show, onClose } = props;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dispatch = useDispatch();

  useEffect(() => {
    if (!show) return;

    const load = async () => {
      await dispatch(fetchNodes());
      dispatch(reaffirmChromatograph());
    };

    load();
  }, [show, dispatch]);

  const {
    pumps = EMPTY_ARRAY, thermostats = EMPTY_ARRAY, autosamplerIps = EMPTY_ARRAY, detectors = EMPTY_ARRAY, degassers = EMPTY_ARRAY, comPortList = EMPTY_ARRAY
  } = useSelector(selectNodesForSession);
  const storedSelectedChromatograph = useSelector(selectSelectedChromatograph);
  const chromatographConfigsForUI = useSelector(selectChromatographConfigsForUI);

  const isMeasurening = useSelector(selectIsMainStreaming);

  const {
    pumpsCount: storedPumpsCount,
    chosenPumps: storedChosenPumps,
    detectorType: storedDetectorType,
    chosenDetector: storedChosenDetector,
    nodesPortType: storedNodesPortType,
    chosenThermostat: storedChosenThermostat,
    autosamplerType: storedAutosamplerType,
    autosamplerIpAddress: storedAutosamplerIpAddress,
    autosamplerAutoIp: storedAutosamplerAutoIp,
    chosenDegasser: storedDegasser,
    withoutControl: storedWithoutControl,
    autoPort: storedAutoPort,
  } = useSelector(selectNodeData);

  const [chosenPumpsCount, setChosenPumpsCount] = useState(storedPumpsCount);
  const [pumpValues, setPumpValues] = useState(storedChosenPumps);
  const [detectorType, setDetectorType] = useState(storedDetectorType);
  const [detector, setDetector] = useState(storedChosenDetector);
  const [nodesPortType, setNodesPortType] = useState(storedNodesPortType);
  const [thermostat, setThermostat] = useState(storedChosenThermostat);
  const [autosamplerType, setAutosamplerType] = useState(storedAutosamplerType);
  const [autosamplerIpAddress, setAutosamplerIpAddress] = useState(storedAutosamplerIpAddress);
  const [autosamplerAutoIp, setAutosamplerAutoIp] = useState(storedAutosamplerAutoIp);
  const [autoPort, setAutoPort] = useState(storedAutoPort);
  const [chosenChromatograph, setChosenChromatograph] = useState(storedSelectedChromatograph);
  const [degasser, setDegasser] = useState(storedDegasser);
  const [withoutControl, setWithoutControl] = useState(storedWithoutControl);

  const chromatographData = useSelector((state) => selectChromatographData(state, chosenChromatograph));

  const [isChromatographEdited, setIsChromatographEdited] = useState(false);
  const [autosamplerInput, setAutosamplerInput] = useState('');

  const [fieldValidity, setFieldValidity] = useState({
    detector: true,
    pumps: {}, // will contain keys like A1, A2, B1, B2
    thermostat: true,
    degasser: true,
    autosampler: true,
    isAllValid: true,
  });

  useEffect(() => {
    // reset to selected chromatograph on change (open)
    if (chosenChromatograph !== storedSelectedChromatograph) {
      setChosenChromatograph(storedSelectedChromatograph);
    }
  }, [storedSelectedChromatograph, show]);

  useEffect(() => {
    if (withoutControl) {
      setPumpValues(emptyPumps);
      setThermostat('');
      setDegasser('');
    }
  }, [withoutControl]);

  useEffect(() => {
    if (!chromatographData) return;
    const {
      portType: chromaPortType,
      pumpCount: chromaPumpCount,
      pumps: chromaPumps,
      thermostat: chromaTthermostat,
      autosampler: chromaAutosampler,
      detector: chromaDetector,
      degasser: chromaDegasser,
      withoutControl: chromaWithoutControl,
    } = chromatographData;

    setChosenPumpsCount(chromaPumpCount ?? 1);
    setPumpValues(chromaPumps ?? emptyPumps);
    setDetectorType(chromaDetector?.type ?? '');
    setDetector(chromaDetector?.name ?? 'noneChosen');
    setNodesPortType(chromaPortType ?? 'usb');
    setThermostat(chromaTthermostat?.name ?? '');
    setAutosamplerType(chromaAutosampler?.type ?? 'none');
    setAutosamplerIpAddress(chromaAutosampler?.ip ?? '');
    setAutosamplerAutoIp(chromaAutosampler?.isGetIpAuto ?? false);
    setAutoPort(chromaAutosampler?.comPort ?? 'noneChosen')
    setDegasser(chromaDegasser?.name ?? '');
    setWithoutControl(chromaWithoutControl ?? false);
  }, [chromatographData]);

  useEffect(() => {
    // refresh on chromatograph load
    setChosenPumpsCount(storedPumpsCount);
    setPumpValues(storedChosenPumps);
    setDetectorType(storedDetectorType);
    setDetector(storedChosenDetector);
    setNodesPortType(storedNodesPortType);
    setThermostat(storedChosenThermostat);
    setAutosamplerType(storedAutosamplerType);
    setAutosamplerIpAddress(storedAutosamplerIpAddress);
    setAutosamplerAutoIp(storedAutosamplerAutoIp);
    setDegasser(storedDegasser);
    setWithoutControl(storedWithoutControl);
  }, [
    show,
    storedPumpsCount,
    storedChosenPumps,
    storedDetectorType,
    storedChosenDetector,
    storedNodesPortType,
    storedChosenThermostat,
    storedAutosamplerType,
    storedAutosamplerIpAddress,
    storedAutosamplerAutoIp,
    storedDegasser,
    storedWithoutControl,
  ]);

  const checkIsModified = () => {
    const changeIndexes = [];

    if (!chromatographData) {
      // If no chromatograph data, any meaningful value is a change
      if (withoutControl) changeIndexes.push(0);
      if (chosenPumpsCount) changeIndexes.push(1);
      if (!_.isEmpty(pumpValues)) changeIndexes.push(2);
      if (detectorType) changeIndexes.push(3);
      if (detector && detector !== 'noneChosen') changeIndexes.push(4);
      if (nodesPortType) changeIndexes.push(5);
      if (thermostat) changeIndexes.push(6);
      if (autosamplerType && autosamplerType !== 'none') changeIndexes.push(7);
      if (autosamplerIpAddress && autosamplerIpAddress !== 'noneChosen') changeIndexes.push(8);
      if (autosamplerAutoIp) changeIndexes.push(9);
      if (chosenChromatograph === SESSION_CHROMATOGRAPH_NAME) changeIndexes.push(10); // if session temp is selected force save to make it clear it's not a permanent config

      return changeIndexes.length > 0;
    }

    const {
      portType: chromaPortType,
      pumpCount: chromaPumpCount,
      pumps: chromaPumps,
      thermostat: chromaThermostat,
      autosampler: chromaAutosampler,
      detector: chromaDetector,
      degasser: chromaDegasser,
      withoutControl: chromaWithoutControl,
    } = chromatographData;

    if (withoutControl !== chromaWithoutControl) changeIndexes.push(0);
    if (chosenPumpsCount !== chromaPumpCount) changeIndexes.push(1);
    if (!_.isEqual(pumpValues, chromaPumps)) changeIndexes.push(2);
    if (detectorType !== (chromaDetector?.type ?? '')) changeIndexes.push(3);
    if (detector !== (chromaDetector?.name ?? 'noneChosen')) changeIndexes.push(4);
    if (nodesPortType !== (chromaPortType ?? '')) changeIndexes.push(5);
    if (thermostat !== (chromaThermostat?.name ?? '')) changeIndexes.push(6);
    if (autosamplerType !== (chromaAutosampler?.type ?? 'none')) changeIndexes.push(7);
    if (autosamplerIpAddress !== (chromaAutosampler?.ip ?? 'noneChosen')) changeIndexes.push(8);
    if (autosamplerAutoIp !== (chromaAutosampler?.isGetIpAuto ?? false)) changeIndexes.push(9);
    if (degasser !== (chromaDegasser?.name ?? false)) changeIndexes.push(10);
    return changeIndexes.length > 0;
  };

  useEffect(() => {
    if (checkIsModified()) {
      setIsChromatographEdited(true);
    } else {
      setIsChromatographEdited(false);
    }
  }, [chosenPumpsCount, pumpValues, detectorType, detector, nodesPortType, thermostat, autosamplerType, autosamplerIpAddress, autosamplerAutoIp]);

  // --- Effect to check if any selected node is busy or phantom ---
  useEffect(() => {
    const isNodeAvailable = (selectedValue, nodeList) => {
      if (!selectedValue || selectedValue === 'noneChosen') return true;
      if (SERVICE_NODE_NAMES.includes(selectedValue)) return true;
      const node = nodeList.find(n => n.value === selectedValue);
      // If node exists and is busy → not available; otherwise available
      return node ? !node.isBusy : true;
    };

    // Detector
    const detectorValid = (detector && detector !== 'noneChosen')
      ? isNodeAvailable(detector, detectors[detectorType] || [])
      : true;

    // Pumps
    const pumpValidity = {};
    let pumpsValid = true;
    if (!withoutControl) {
      const activePumps = pumpNamesPerNum[chosenPumpsCount] || [];
      activePumps.forEach(pumpName => {
        const pumpValue = pumpValues[pumpName];
        const valid = (pumpValue && pumpValue !== 'noneChosen')
          ? isNodeAvailable(pumpValue, pumps)
          : true;
        pumpValidity[pumpName] = valid;
        if (!valid) pumpsValid = false;
      });
      // For inactive pumps we don't need entries (they are not rendered)
    } else {
      // All pumps are disabled/empty – mark them valid
      pumpNamesPerNum[chosenPumpsCount]?.forEach(pumpName => {
        pumpValidity[pumpName] = true;
      });
    }

    // Thermostat
    const thermostatValid = (!withoutControl && thermostat && thermostat !== 'noneChosen')
      ? isNodeAvailable(thermostat, thermostats)
      : true;

    // Degasser
    const degasserValid = (!withoutControl && degasser && degasser !== 'noneChosen')
      ? isNodeAvailable(degasser, degassers)
      : true;

    // Autosampler
    let autosamplerValid = true;
    if (autosamplerType !== 'none') {
      if (IP_AUTOSAMPLERS.includes(autosamplerType)) {
        if (autosamplerIpAddress && autosamplerIpAddress !== 'noneChosen') {
          const ipNode = autosamplerIps.find(n => n.value === autosamplerIpAddress);
          autosamplerValid = ipNode ? !ipNode.isBusy : true;
        }
      } else if (COM_AUTOSAMPLERS.includes(autosamplerType)) {
        if (autoPort && autoPort !== 'noneChosen') {
          autosamplerValid = isNodeAvailable(autoPort, comPortList);
        }
      }
    }

    const allValid = detectorValid && pumpsValid && thermostatValid && degasserValid && autosamplerValid;

    setFieldValidity({
      detector: detectorValid,
      pumps: pumpValidity,
      thermostat: thermostatValid,
      degasser: degasserValid,
      autosampler: autosamplerValid,
      isAllValid: allValid,
    });
  }, [
    detector, detectorType, detectors,
    withoutControl, chosenPumpsCount, pumpValues, pumps,
    thermostat, thermostats,
    degasser, degassers,
    autosamplerType, autosamplerIpAddress, autoPort, autosamplerIps, comPortList
  ]);

  const [valid, setValid] = useState(false);
  const [showAlert, setShowAlert] = useState(false);

  const handleNumberOfPumpsChange = (e) => {
    const newPumpCount = e.target.value;
    setChosenPumpsCount(Number(newPumpCount));

    const pumpValuesToAssign = { ...pumpValues }; // clearing hidden pumps, so the don't count towards dupliaction
    const pumpsToRest = Object.keys(pumpValues)
      .filter((pump) => !pumpNamesPerNum[newPumpCount].includes(pump));
    pumpsToRest.forEach((pump) => pumpValuesToAssign[pump] = '');

    setPumpValues(pumpValuesToAssign);
  };
  const handlePumpChange = (e) => setPumpValues({ ...pumpValues, [e.target.name]: e.target.value });
  const handleThermostatChange = (e) => setThermostat(e.target.value);
  const handleAutosamplerChange = (e) => {
    const radioId = e.target.id;
    setAutosamplerType(radioId);
    if (radioId === 'none') {
      setAutosamplerIpAddress('');
      setAutosamplerAutoIp(false);
    }
  };

  const handleNodesPortTypeChange = (e) => setNodesPortType(e.target.value);
  const handleDetectorTypeChange = (e) => {
    const newDetType = e.target.value;
    setDetectorType(newDetType);
    setDetector('noneChosen');
    setWithoutControl(WITHOUT_CONTROL_MAP[newDetType]);
  };
  const handleDetectorChange = (e) => setDetector(e.target.value);

  const handleChromatographChange = ({ target: { value } }) => {
    setChosenChromatograph(value);
  };

  const formNamelessConfig = () => ({
    nodesPort: nodesPortType,
    withoutControl,
    thermostat: {
      chosenThermostat: thermostat,
    },
    pumps: {
      count: chosenPumpsCount,
      chosenPumps: pumpValues,
    },
    degasser: {
      chosenDegasser: degasser,
    },
    autosampler: {
      ip: IP_AUTOSAMPLERS.includes(autosamplerType) ? autosamplerIpAddress : ''  ,
      comPort: COM_AUTOSAMPLERS.includes(autosamplerType) ? autoPort : '',
      getIpAuto: autosamplerAutoIp,
      type: autosamplerType,
    },
    detector: {
      type: detectorType,
      chosenDetector: detector,
      portType: detectorPortMap[detectorType],
    },
  });

  // --- Update valid state: combine pump uniqueness and node availability ---
  useEffect(() => {
    const isPumpsUnique = validatePumps(pumpValues);
    setShowAlert(!isPumpsUnique);
    setValid(isPumpsUnique && fieldValidity.isAllValid);
  }, [nodesPortType, chosenPumpsCount, pumpValues, thermostat, autosamplerType, autosamplerIpAddress, autosamplerAutoIp, detector, detectorType, fieldValidity.isAllValid]);

  const handleCloseNodeModal = () => { onClose(); };

  const nameAndSubmitConfig = async (chromatographName) => {
    setIsSubmitting(true);
    try {
      const formattedName = chromatographName === '' ? '_temp' : chromatographName;
      const namelessConfig = formNamelessConfig();

      /* const formattedNamelessConfig = {...namelessConfig, pumps: {...namelessConfig.pumps, chosenPumps: mapPumpValuesForApi(namelessConfig.pumps.chosenPumps)}} */
      /* dispatch(nodeActions.updateNodesParams(formattedNamelessConfig)); */ // might be redundant

      const configToPost = {
        chromatograph: {
          name: formattedName,
          data: namelessConfig,
        },
      };

      const isPostConfigSuccessfull = await dispatch(postNodeConfig(configToPost)).unwrap();
      if (isPostConfigSuccessfull){ 
        await dispatch(fetchConfig());
      }
      handleCloseNodeModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNodesSubmit = () => {
    if (isMeasurening) {
      handleCloseNodeModal();
      return;
    } // no api calls when non allowed

    dispatch(configActions.setSelectedChromatograph(chosenChromatograph));
    if (chosenChromatograph === '_temp') {
      handleShowChromatographNameModal();
    } else if (isChromatographEdited) {
      handleShowChromatographNameModal();
    } else {
      nameAndSubmitConfig(chosenChromatograph);
      handleCloseNodeModal();
    }
  };

const isAvailable = (selectedValue, nodeValues = []) => {
  if (!selectedValue) return true; // ничего не выбрано — доступно
  if (SERVICE_NODE_NAMES.includes(selectedValue)) return true; // системные узлы всегда доступны
  return nodeValues.includes(selectedValue); // если выбранное есть в списке доступных — доступно
};

const getSelectStyle = (selectedValue, nodes = [], ) => {
  const available = isAvailable(selectedValue, nodes);
  return {
    backgroundColor: available ? 'white' : '#fff3cd', // bootstrap warning
    color: available ? 'black' : '#856404',
  };
};

const generateOptions = (nodes = [], selectedValue) => {
  const options = [];

  if (nodes.length === 0 && !selectedValue) {
    options.push(<option key="noneAvailable" value="">Нет доступных</option>);
    return options
  }

  const noneChosenOption = (
    <option key="noneChosen" value="">
      Не выбран
    </option>
  );

  options.push(noneChosenOption);

  const nodeValues = nodes.map(n => n.value);

  // Inject phantom option
  if (
    selectedValue &&
    !SERVICE_NODE_NAMES.includes(selectedValue) &&
    !nodeValues.includes(selectedValue)
  ) {
    options.push(
      <option
        key={`phantom-${selectedValue}`}
        value={selectedValue}
        style={{
          opacity: 0.8,
          fontStyle: "italic"
        }}
      >
        {selectedValue} (нет связи)
      </option>
    );
  }

  // Normal options
  nodes.forEach(node => {
    options.push(
      <option
        key={node.value}
        value={node.value}
        disabled={node.isBusy}
        style={
          node.isBusy
            ? { color: "#adb5bd" }
            : node.isOwnedByMe
            ? { fontWeight: 600 }
            : undefined
        }
      >
        {node.value}
        {node.isBusy && " (занят)"}
      </option>
    );
  });

  

  return options;
};

  const [showChromatographNameModal, setShowChromatographNameModal] = useState(false);

  const handleShowChromatographNameModal = () => setShowChromatographNameModal(true);
  const handleCloseShowChromatographNameModal = () => {
    setShowChromatographNameModal(false);
  };

  const duplicatePumpKeys = findDuplicatePumpKeys(pumpValues);

  const autoIPValues = useMemo(() => getFreeOrMyNodes(autosamplerIps), [autosamplerIps]);
  const ipTARef = useRef(null);
  const [isInvalidFlash, setIsInvalidFlash] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isInputting, setIsInputting] = useState(false);
  const [autosamplerIpsCustomOptions, setAutosamplerIpsCustomOptions] = useState(autoIPValues);

  useEffect(() => {
    setAutosamplerIpsCustomOptions(autoIPValues);
  }, [autoIPValues]);
  
  useEffect(() => {
    if (!show) return;

    const handleKeyDown = (e) => {
      if (e.key !== 'Enter') return;

      // HARD NOOP CONDITIONS
      if (isSubmitting) return;
      if (!valid) return;
      if (showChromatographNameModal) return;

      const active = document.activeElement;
      const tag = active?.tagName;

      // allow native Enter where it matters
      if (['TEXTAREA', 'BUTTON'].includes(tag)) return;

      e.preventDefault();

      // commit active field
      if (active && typeof active.blur === 'function') {
        active.blur();
      }

      requestAnimationFrame(() => {
        handleNodesSubmit();
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    show,
    valid,
    isSubmitting,
    showChromatographNameModal,
    handleNodesSubmit,
  ]);

  const handleNodesCheck = () => dispatch(fetchNodes())

  
  if (!show) return null;

  return (
    <>
      {showChromatographNameModal && (
        <SaveChromatographModal
          show={showChromatographNameModal}
          onClose={handleCloseShowChromatographNameModal}
          nameAndSubmitConfig={nameAndSubmitConfig}
          chosenChromatograph={chosenChromatograph}
        />
      )}

      <Modal
        size="xl"
        dialogClassName={styles.nodeConfigModal}
        backdrop={isSubmitting ? 'static' : true}
        keyboard={!isSubmitting}
        show={show}
        onHide={handleCloseNodeModal}
      >
        <Modal.Header closeButton>
          <Modal.Title>Подключение узлов</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {
            isSubmitting ? (
              <div
                style={{
                  minHeight: 400,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 16,
                }}
              >
                <div className="spinner-border text-primary" style={{ width: 64, height: 64 }} />
                <div style={{ fontSize: 18, fontWeight: 500 }}>
                  Конфигурация применяется
                </div>
              </div>
            ) : (
              <Form>
                <CustomSelectGroup
                  label="Хроматограф"
                  name="chromatograph"
                  value={chosenChromatograph}
                  onChange={handleChromatographChange}
                  options={generateChromatographOptionsWithOwner(chromatographConfigsForUI, chosenChromatograph)}
                  groupClassName="mb-2"
                  disabled={isMeasurening}
                />

                <CustomSelectGroup
                  label="Тип детектора"
                  name="detectorType"
                  value={detectorType}
                  onChange={handleDetectorTypeChange}
                  disabled={isMeasurening}
                  options={
                    detectorTypeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))
                  }
                  groupClassName="mb-2"
                  selectStyle={{ minWidth: '250px' }}
                  labelStyle={{ minWidth: '120px' }}
                />

                <CustomInputGroup
                  label="Порт детектора"
                  value={detectorPortMap[detectorType].toUpperCase() ?? ''}
                  name="detectorPortType"
                  onChange={() => {}} // Disabled input, so no need to handle changes
                  disabled
                  readOnly
                  groupClassName="mb-2"
                />

                <CustomSelectGroup
                  label="Детектор"
                  name="detector"
                  value={detector}
                  onChange={handleDetectorChange}
                  options={generateOptions(detectors[detectorType], detector)}
                  groupClassName={`mb-2 ${!fieldValidity.detector ? styles.nodeInvalid : ''}`}
                  disabled={isMeasurening}
                />

                <CustomCheckboxGroup
                  label="Без управления хроматографом"
                  onChange={(e) => setWithoutControl(e.target.checked)}
                  checked={withoutControl}
                  groupClassName="mb-2"
                />

                <Form.Group controlId="portType" className="mb-1">
                  <Form.Label style={{ marginBottom: '2px' }}>Порт для связи узлов</Form.Label>
                  <div>
                    <Form.Check
                      inline
                      label="USB"
                      name="portType"
                      value="usb"
                      type="radio"
                      checked={nodesPortType === 'usb'}
                      onChange={handleNodesPortTypeChange}
                      disabled={isMeasurening}
                    />
                    {/*                 <Form.Check
                      inline
                      label="Ethernet"
                      name="portType"
                      value="ethernet"
                      type="radio"
                      id="ethernet"
                      checked={nodesPortType === 'ethernet'}
                      onChange={handleNodesPortTypeChange}
                      disabled={isMeasurening}
                    /> */}
                  </div>
                </Form.Group>

                <CustomSelectGroup
                  label="Число насосов"
                  name="pumpsNum"
                  value={chosenPumpsCount}
                  onChange={handleNumberOfPumpsChange}
                  options={[1, 2, 4].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                  disabled={isMeasurening}
                />

                <div className="mb-4">
                  {pumpNamesPerNum[chosenPumpsCount].map((pumpName) => (
                    <CustomSelectGroup
                      key={pumpName}
                      label={`Насос ${pumpName}`}
                      name={pumpName}
                      value={pumpValues[pumpName]}
                      onChange={handlePumpChange}
                      options={generateOptions(pumps, pumpValues[pumpName])}
                      disabled={isMeasurening || withoutControl}
                      labelStyle={{
                        minWidth: '198px',
                        ...(duplicatePumpKeys.includes(pumpName) && { backgroundColor: '#f8d7da' }),
                      }}
                      groupClassName={`mb-2 ${!fieldValidity.pumps[pumpName] ? styles.nodeInvalid : ''}`}
                    />
                  ))}

                  <CustomSelectGroup
                    label="Дегазатор"
                    name="degasser"
                    value={degasser}
                    onChange={(e) => setDegasser(e.target.value)}
                    options={generateOptions(degassers, degasser)}
                    groupClassName={`mb-2 ${!fieldValidity.degasser ? styles.nodeInvalid : ''}`}
                    disabled={isMeasurening || withoutControl}
                  />
                </div>

                <CustomSelectGroup
                  label="Термостат"
                  name="thermostat"
                  value={thermostat}
                  onChange={handleThermostatChange}
                  options={generateOptions(thermostats, thermostat)}
                  groupClassName={`mb-2 ${!fieldValidity.thermostat ? styles.nodeInvalid : ''}`}
                  disabled={isMeasurening || withoutControl}
                />

                <Form.Group controlId="autosampler" className="mb-2">
                  <Form.Label style={{ marginBottom: '2px' }}>Автосамплер</Form.Label>
                  <div>
                    <Form.Check
                      inline
                      label="Нет"
                      name="autosampler"
                      type="radio"
                      id="none"
                      checked={autosamplerType === 'none'}
                      onChange={handleAutosamplerChange}
                      disabled={isMeasurening}
                    />
                    <Form.Check
                      inline
                      label="HTA"
                      name="autosampler"
                      type="radio"
                      id="hta"
                      checked={autosamplerType === 'hta'}
                      onChange={handleAutosamplerChange}
                      disabled={isMeasurening}
                    />
{/*                     <Form.Check
                      inline
                      label="LAS"
                      name="autosampler"
                      type="radio"
                      id="las"
                      checked={autosamplerType === 'las'}
                      onChange={handleAutosamplerChange}
                      disabled={isMeasurening}
                    /> */}
                    <Form.Check
                      inline
                      label="АС393"
                      name="autosampler"
                      type="radio"
                      id="as393"
                      checked={autosamplerType === 'as393'}
                      onChange={handleAutosamplerChange}
                      disabled={isMeasurening}
                    />
                  </div>
                </Form.Group>

                {IP_AUTOSAMPLERS.includes(autosamplerType) && (<CustomTypeaheadGroup
                  ref={ipTARef}
                  label="IP адрес"
                  name="samplerIpAddress"
                  {...(!isInputting
                    && {
                      selected: [
                        autosamplerType !== 'none' ? autosamplerIpAddress : 'Не выбран',
                      ],
                    })}
                  onFocus={() => {
                    setIsInputting(true);
                  }}
                  onInputChange={(text, e) => {
                    const isValid = isValidPartialIp(text);
                    if (!isValid) {
                      ipTARef.current?.setState({ text: inputText });
                    } else {
                      setInputText(text);
                    }
                    setIsInputting(true);
                  }}
                  onChange={(sel) => {
                    const val = typeof sel?.[0] === 'string' ? sel[0] : sel?.[0]?.label || '';
                    if (val && isValidIp(val)) {
                      setAutosamplerIpAddress(val);
                      setIsInputting(false);
                    }
                  }}
                  onBlur={(e) => {
                    const value = e.target.value ?? '';
                    const trimmed = value.trim();
                    if (!isValidIp(trimmed)) {
                      setInputText('');
                      setIsInputting(false);
                      setIsInvalidFlash(true);
                      setTimeout(() => setIsInvalidFlash(false), 1000); // 1s flash
                      return;
                    }

                    if (!autoIPValues.includes(trimmed)) {
                      setAutosamplerIpsCustomOptions((prev) => [...prev, trimmed]);
                    }

                    setAutosamplerIpAddress(trimmed);
                    setInputText('');
                    setIsInputting(false);
                  }}
                  groupClassName={`mb-2 ${!fieldValidity.autosampler ? styles.nodeInvalid : ''}`}
                  options={autosamplerIpsCustomOptions}
                  disabled={autosamplerType === 'none' || isMeasurening}
                  size="md"
                  filterBy={() => true} // this disables default filtering
                  /* allowNew={true} */
                />)}

                {/*             <Form.Check
                  type="checkbox"
                  label="Получить IP адрес автоматически"
                  checked={autosamplerAutoIp}
                  onChange={handleAutoIpChange}
                  disabled={autosamplerType === 'none' || isMeasurening}
                  className='mb-3'
                /> */}

                {COM_AUTOSAMPLERS.includes(autosamplerType) &&  
                  <CustomSelectGroup
                    label="Порт автосамплера"
                    name="autoPort"
                    value={autoPort}
                    onChange={(e) => setAutoPort(e.target.value)}
                    options={generateOptions(comPortList, autoPort)}
                    groupClassName={`mb-2 ${!fieldValidity.autosampler ? styles.nodeInvalid : ''}`}
                    disabled={isMeasurening}
                  />
                }

              </Form>
            )
          }

        </Modal.Body>
        <Modal.Footer>
          {showAlert && <Badge style={{ height: '100%' }} bg="danger">Насосы дублируются</Badge>}
          {!fieldValidity.isAllValid && !showAlert && (
            <Badge style={{ height: '100%' }} bg="warning">Некоторые узлы недоступны</Badge>
          )}
          <Button
            variant="primary"
            onClick={handleNodesSubmit}
            style={{ width: '100px' }}
            disabled={!valid || isSubmitting}
          >
            OK
          </Button>
          <Button
            variant="primary"
            onClick={handleNodesCheck}
            style={{ width: '100px' }}
            disabled={isSubmitting}
          >
            Проверка
          </Button>
          <Button
            variant="secondary"
            onClick={handleCloseNodeModal}
            style={{ width: '100px' }}
            disabled={isSubmitting}
          >
            Отмена
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default NodeConfigModal;