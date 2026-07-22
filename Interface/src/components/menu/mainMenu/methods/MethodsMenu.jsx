import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Dropdown, DropdownButton, Form, InputGroup,
} from 'react-bootstrap';

import styles from './MethodsMenu.module.css';

import {
  methodActions,
  selectChosenDetector,
  selectDetectorSerial,
  selectDetectorType,
  selectIsAnalysisTab,
  selectIsMethodGeneral,
  selectIsTabInitialized,
  selectUsedDetectorType,
} from '../../../../services/reduxImportDispatcher';

// base
import {
  selectSelectedMethod,
  selectActiveTab,
} from '../../../../services/reduxImportDispatcher';
// derived
import {
  selectAllMethods,
  selectActiveTabMethod,
} from '../../../../services/reduxImportDispatcher';

import { chooseMethod } from '../../../../services/thunks/method/chooseMethodThunk';

import MethodModal from './MethodsModal';
import { DETECTOR_FULL_NAMES } from '../../../../constants/constants';
import { displaySafeNodeName } from '../../../../utils/nodes';
import { usePermissions } from '../../../../hooks/usePermissions';

function MethodsMenu() {
  const dispatch = useDispatch();
  const { hasPermissionForAction } = usePermissions();
  const canCreateMethod = hasPermissionForAction('createMethod');

  const [showMethodModal, setShowMethodModal] = useState(false);
  const [phantomMethod, setPhantomMethod] = useState(false); // method only shown from file metadata no actually present in list

  const methodsOptions = useSelector(selectAllMethods);
  const selectedMethod = useSelector(selectSelectedMethod);
  const activeTabMethod = useSelector(selectActiveTabMethod);
  const activeTab = useSelector(selectActiveTab);
  const isAnalysisTab = useSelector((state) => selectIsAnalysisTab(state, activeTab));

  const isInitialised = useSelector((state) => selectIsTabInitialized(state, activeTab));

  const usedDetector = useSelector((state) => selectUsedDetectorType(state, activeTab));
  const currentDetectorType = useSelector(selectDetectorType);
  const isDifferentDetector = usedDetector != null && usedDetector !== currentDetectorType;
  const isTabMethodGen = useSelector((state) => selectIsMethodGeneral(state, { method: activeTabMethod }));

  useEffect(() => {
    const adjustedMethod = activeTabMethod === undefined ? null : activeTabMethod;
    if (!isDifferentDetector && isTabMethodGen && adjustedMethod !== selectedMethod) {
      dispatch(methodActions.setSelectedMethod(adjustedMethod));
    } else if (!isTabMethodGen && activeTab) {
      dispatch(methodActions.setSelectedMethod(null));
    }
  }, [activeTabMethod, activeTab, isDifferentDetector]);

  const displayedMethod = useMemo(() => (isInitialised ? activeTabMethod ?? null : selectedMethod), [isInitialised, activeTabMethod, selectedMethod, isDifferentDetector]);

  const optionsWithLegacy = useMemo(() => {
    const shouldAppend = (isInitialised || isDifferentDetector)
      && displayedMethod
      && !methodsOptions.includes(displayedMethod);

    return shouldAppend
      ? [displayedMethod, ...methodsOptions]
      : methodsOptions;
  }, [methodsOptions, displayedMethod, isInitialised, isDifferentDetector]);

  const handleMethodChange = (event) => {
    const manuallySelectedMethod = event.target.value === '' ? null : event.target.value;
    dispatch(chooseMethod({ selectedMethod: manuallySelectedMethod }));
  };

  const handleOpenModal = (event) => {
    setShowMethodModal(true);
  };

  const handleCloseModal = () => setShowMethodModal(false);

  const detectorType = useSelector(selectDetectorType);
  const detectorName = useSelector(selectChosenDetector);
  const detectorSerial = useSelector(selectDetectorSerial)

  const detectorCredentials = useMemo(() => {
    const parts = [];

    if (detectorType) parts.push(DETECTOR_FULL_NAMES[detectorType] ?? '');
    if (detectorName) parts.push(displaySafeNodeName(detectorSerial, detectorName));

    return parts.join(' ');
  }, [detectorType, detectorName, detectorSerial]);

  return (
    <>
      {showMethodModal && <MethodModal show={showMethodModal} handleClose={handleCloseModal} />}

      <InputGroup id='methods-global-menu' size="sm" className={styles.methodInputGroup}>
        <InputGroup.Text id='method-menu-detector-credentials'>{detectorCredentials}</InputGroup.Text>
        <DropdownButton title="Метод" size="sm">
          <Dropdown.Item as="button" onClick={handleOpenModal} disabled={!isAnalysisTab || isDifferentDetector || !canCreateMethod}>Сохранить</Dropdown.Item>
          {/* <Dropdown.Item as="button">Удалить</Dropdown.Item> */}
        </DropdownButton>
        <Form.Select
          size="sm"
          value={displayedMethod ?? ''}
          onChange={handleMethodChange}
          disabled={isInitialised}
        >
          {optionsWithLegacy.map((option, index) => (
            <option key={index} value={option ?? ''}>
              {option}
            </option>
          ))}
        </Form.Select>
      </InputGroup>
    </>
  );
}

export default MethodsMenu;
