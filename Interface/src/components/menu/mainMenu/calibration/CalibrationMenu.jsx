import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Dropdown, DropdownButton, Form, InputGroup,
} from 'react-bootstrap';

import styles from './CalibrationMenu.module.css';

import {
  addCalibration, addComponent, selectCalibration, recalibrate, viewCalibration, addLevel, deleteCalib, copyCalib, confirmAbleToAddLevel, closeCalibWithApiCall, refocusCalibrationIfRepeat, confirmCalibComponentEquality, applyCalibration,
} from '../../../../services/thunks/calibration/calibrationThunks';

import {
  calibrationActions,
  selectIsTabInitialized,
  selectActiveTabType,
  selectActiveTabCalibration,
  selectAllCalibrations,
  selectSelectedCalibration,
  selectSelectedMethod,
  selectActiveTab,
  selectUsedDetectorType,
  selectDetectorType,
  selectIsPeaksEmpty,
  selectIsCalibGen,
  selectGenCalibType,
  selectIsThisMeasurementActive,
} from '../../../../services/reduxImportDispatcher';

import CalibModal from './CalibModal';

import { useConfirmation, ConfirmationModal } from '../../../../hooks/useConfirmation';
import useSimpleModalManager from '../../../../hooks/useSimpleModalManager';
import { usePermissions } from '../../../../hooks/usePermissions';

import { CALIB_TYPES, EMPTY_ARRAY, TAB_TYPES } from '../../../../constants/constants';
import CalibAddLevelModal from './CalibAddLevelModal';
import CalibCopyModal from './CalibCopyModal';
import { selectIsCalibApplyAvailable } from '../../../../services/selectors/selectIsCalibApplyAvailable';

const initialModalState = { // keep only dynamic data here
  newCalib: { isOpen: false, onClose: null, onSubmit: null },
  recalibrate: { isOpen: false, onClose: null, onSubmit: null },
  addComponent: { isOpen: false, onClose: null, onSubmit: null },
  addLevel: { isOpen: false, onClose: null, onSubmit: null },
  copyCalib: { isOpen: false, onClose: null, onSubmit: null },
};

const modalConfig = { // extracted static data out of state
  newCalib: { title: 'Новая градуировка' },
  recalibrate: { title: 'Переградуировка' },
  addComponent: { title: 'Добавить компонент' },
  addLevel: { title: 'Добавить уровень' },
  copyCalib: { title: 'Копировать градуировку' },
};

function CalibrationMenu({ onViewClick }) {
  const dispatch = useDispatch();
  const {
    modalState, showModal, hideModal, addHandlers,
  } = useSimpleModalManager(initialModalState);
  const { hasCalibrationRights } = usePermissions();

  const [chosenCalibration, setChosenCalibration] = useState(null);

  const activeTab = useSelector(selectActiveTab);
  const isActiveRunning = useSelector(state=> selectIsThisMeasurementActive(state, activeTab))
  const selectedMethod = useSelector(selectSelectedMethod);
  const calibSelectorProps = { method: selectedMethod, tabId: activeTab };
  const storedCalibOpt = useSelector((state) => selectAllCalibrations(state, calibSelectorProps)) ?? EMPTY_ARRAY; // if method has no calibration (null) or undefined, default to empty array
  const activeTabType = useSelector(selectActiveTabType);
  const activeTabCalibration = useSelector(selectActiveTabCalibration);
  const selectedCalibration = useSelector(selectSelectedCalibration);
  const isInitialised = useSelector((state) => selectIsTabInitialized(state, activeTab));

  const isChosenGeneral = useSelector((state) => selectIsCalibGen(state, { calibration: chosenCalibration, method: selectedMethod }));
  const calibType = useSelector((state) => selectGenCalibType(state, { method: selectedMethod, calibration: chosenCalibration }));

  const usedDetector = useSelector((state) => selectUsedDetectorType(state, activeTab));
  const currentDetectorType = useSelector(selectDetectorType);
  const isDifferentDetector = usedDetector && usedDetector !== currentDetectorType;

  const isPeaksEmpty = useSelector((state) => selectIsPeaksEmpty(state, activeTab));
  const isInNormCalib = calibType === CALIB_TYPES.inNorm;

  const tabType = useSelector(selectActiveTabType);
  const isCalibTab = tabType === TAB_TYPES.CALIBRATION;

  const isApplyAvailable = useSelector((state) => selectIsCalibApplyAvailable(state, {
    calibration: chosenCalibration,
    method: selectedMethod,
    tabId: activeTab,
  }));

  useEffect(() => {
    const isUndefinedCalib = activeTabCalibration === undefined;
    const adjustedCalib = isUndefinedCalib ? null : activeTabCalibration;
    dispatch(calibrationActions.setSelectedCalibration(adjustedCalib));
  }, [activeTabCalibration]);

  useEffect(() => {
    setChosenCalibration(selectedCalibration);
  }, [selectedCalibration]);

  const handleCalibrationChange = async (event) => {
    // if tab already calib we need to notify back that we moved away from it, by dipatching close with old data, then we switch, then we fetch new data
    // from backend's perspective these are two different tabs (i know i know backend shouldn't even care about tabs)
    // so we don't need to await closure, 'cause for back they are two different entities, it's just for user they are in one tab

    const manuallySelectedCalibration = event.target.value === '' ? null : event.target.value;

    if (activeTabType === 'calibration') {
      const checkResult = await dispatch(refocusCalibrationIfRepeat({
        selectedMethod,
        selectedCalibration: manuallySelectedCalibration,
        sourceTabId: activeTab,
      })).unwrap();
      if (checkResult.isRepeat) {
        console.groupCollapsed('repeat');
        console.log(checkResult);
        console.groupEnd();
        return;
      }
      /* console.log('pre close') */
      dispatch(closeCalibWithApiCall({ calibrationTabId: activeTab, deleteEntry: false }));
      /* console.log('after close') */
    }

    if (activeTabType === TAB_TYPES.FILE || (activeTabType === TAB_TYPES.MEASUREMENT && isInitialised)) {
      const areComponentsSame = await dispatch(confirmCalibComponentEquality(manuallySelectedCalibration)).unwrap();
      if (!areComponentsSame) {
        const isConfirmed = await promptConfirm('Названия компонентов граудировки не совпадают с раннее введенными. Введенная информация будет утеряна. Продолжить?');
        if (!isConfirmed) return;
      }
    }

    dispatch(selectCalibration(manuallySelectedCalibration));
    setChosenCalibration(manuallySelectedCalibration);

    if (activeTabType === 'calibration') {
      /* console.log('pre view') */
      dispatch(viewCalibration({ calibrationTabId: activeTab }))
        .unwrap()
        .catch((error) => {
          console.error('Failed to change tab calibration', error);
        });
    }
  };

  const getCalibOptions = (initialOptions, tabType) => {
    // need to disallow choice of null when calibrationView tab is active, to not allow view on null
    let options = initialOptions;
    if (tabType === 'calibration') {
      options = options.filter((option) => option !== null);
    }

    return options.map((option, index) => (
      <option key={index} value={option ?? ''}>
        {option}
      </option>
    ));
  };

  const handleNewCalibModalShow = () => showModal('newCalib');
  const handleRecalibrateModalShow = () => showModal('recalibrate');
  const handleAddComponentModalShow = () => showModal('addComponent');
  const handleAddLevelModalShow = async () => {
    const isAble = await dispatch(confirmAbleToAddLevel({ selectedCalibration, originTabId: activeTab }));
    if (isAble) {
      showModal('addLevel');
    }
  };

  const {
    showConfirmModal,
    message,
    promptConfirm,
    handleConfirm,
    handleCancel,
  } = useConfirmation();

  const handleSubmitWithConfirm = async (action, calibrationData, selectedMethod, activeTab, genCalibs, handleClose) => {
    if (genCalibs.includes(calibrationData.name)) {
      const isConfirmed = await promptConfirm(`Градуировка ${calibrationData.name} уже существует. Заменить?`);
      if (!isConfirmed) return;
    }
    dispatch(action({ calibrationData, selectedMethod, originTabId: activeTab }));
    handleClose();
  };

  const createHandlers = (modal, sumbitAction, confirm) => {
    const onClose = () => hideModal(modal);
    const onSubmit = (calibrationData, selectedMethod, activeTab, genCalibs) => {
      if (confirm) {
        handleSubmitWithConfirm(
          sumbitAction,
          calibrationData,
          selectedMethod,
          activeTab,
          genCalibs,
          onClose,
        );
      } else {
        dispatch(sumbitAction({ calibrationData, selectedMethod, originTabId: activeTab }));
        onClose();
      }
    };
    return { onClose, onSubmit };
  };

  const onCloseAddLevel = () => hideModal('addLevel');
  const onSubmitAddLevel = ({
    componentTable,
    changeRetentionTimes,
    selectedCalibration,
    selectedMethod,
    activeTab,
  }) => {
    dispatch(addLevel({
      levelData: {
        componentTable,
        changeRetentionTimes,
      },
      selectedMethod,
      selectedCalibration,
      originTabId: activeTab,
    }));
    onCloseAddLevel();
  };

  const handleCopyCalib = () => {
    showModal('copyCalib');
  };

  const onCloseCopyCalib = () => {
    hideModal('copyCalib');
  };

  const onSubmitCopyCalib = ({
    newName,
    methodToAppendTo,
    calibTabId,
  }) => {
    dispatch(copyCalib({
      newName,
      methodToAppendTo,
      calibTabId,
    }));
    onCloseCopyCalib();
  };

  useEffect(() => {
    addHandlers('newCalib', createHandlers('newCalib', addCalibration, true));
    addHandlers('recalibrate', createHandlers('recalibrate', recalibrate, true));
    addHandlers('addComponent', createHandlers('addComponent', addComponent, false));
    addHandlers('addLevel', { onClose: onCloseAddLevel, onSubmit: onSubmitAddLevel });
    addHandlers('copyCalib', { onClose: onCloseCopyCalib, onSubmit: onSubmitCopyCalib });
  }, []);

  const handleDeleteCalib = async () => {
    const isConfirmed = await promptConfirm(`Вы действительно хотите удалить градуировку "${selectedCalibration}"?`);
    if (!isConfirmed) return;
    await dispatch(deleteCalib({ calibTabId: activeTab }));
  };

  const handleApply = async () => {
    await dispatch(applyCalibration({ tabId: activeTab, calibration: chosenCalibration }))
      .unwrap()
      .catch((err) => {
        console.error('Failed to apply calibration:', err);
      });
  };

  const isCalibDisabledFuncs = !isInitialised
    || isDifferentDetector
    || isPeaksEmpty
    || !hasCalibrationRights();

  const manuallyRendered = ['addLevel', 'copyCalib'];

  /*  useEffect(()=>{
    console.log('chosenCalibration',chosenCalibration)
  },[chosenCalibration])

  useEffect(()=>{
    console.log('selectedCalibration',selectedCalibration)
  },[selectedCalibration]) */

  const canView = useMemo(() => storedCalibOpt.includes(chosenCalibration), [chosenCalibration, storedCalibOpt]);

  return (
    <>
      <ConfirmationModal
        show={showConfirmModal}
        message={message}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />

      {Object.entries(modalState).filter(([key]) => !manuallyRendered.includes(key))
        .map(([key, modal]) => (
          modal.isOpen && (
          <CalibModal
            key={key}
            show={modal.isOpen}
            onClose={modal.onClose}
            onSubmit={modal.onSubmit}
            modalTitle={modalConfig[key].title}
            modalType={key}
            activeTab={activeTab}
            selectedMethod={selectedMethod}
            selectedCalibration={selectedCalibration}
          />
          )
        ))}

      {modalState.addLevel.isOpen && (
        <CalibAddLevelModal
          activeTab={activeTab}
          show={modalState.addLevel.isOpen}
          onClose={modalState.addLevel.onClose}
          onSubmit={modalState.addLevel.onSubmit}
          selectedMethod={selectedMethod}
          selectedCalibration={selectedCalibration}
        />
      )}

      {modalState.copyCalib.isOpen && (
        <CalibCopyModal
          activeTab={activeTab}
          show={modalState.copyCalib.isOpen}
          onClose={modalState.copyCalib.onClose}
          onSubmit={modalState.copyCalib.onSubmit}
          selectedMethod={selectedMethod}
          selectedCalibration={selectedCalibration}
        />
      )}

      <InputGroup className={styles.calibInputGroup}>
        <DropdownButton

          title="Градуировка"
          size="sm"
        >
          <Dropdown.Item
            as="button"
            onClick={onViewClick}
            disabled={chosenCalibration === null || !canView || isCalibTab}
          >
            Просмотр
          </Dropdown.Item>
          <Dropdown.Item
            as="button"
            onClick={handleNewCalibModalShow}
            disabled={isCalibDisabledFuncs || isPeaksEmpty}
          >
            Новая
          </Dropdown.Item>
          <Dropdown.Item
            as="button"
            onClick={handleAddComponentModalShow}
            disabled={isCalibDisabledFuncs || !isChosenGeneral || isInNormCalib}
          >
            Добавить компоненты
          </Dropdown.Item>
          <Dropdown.Item
            as="button"
            onClick={handleAddLevelModalShow}
            disabled={isCalibDisabledFuncs || !isChosenGeneral || isInNormCalib}
          >
            Добавить уровень
          </Dropdown.Item>
          <Dropdown.Item
            as="button"
            onClick={handleRecalibrateModalShow}
            disabled={isCalibDisabledFuncs}
          >
            Переградуировка
          </Dropdown.Item>
          <Dropdown.Item
            as="button"
            onClick={handleApply}
            disabled={!isApplyAvailable}
          >
            Применить
          </Dropdown.Item>
          <Dropdown.Item
            as="button"
            onClick={handleCopyCalib}
            disabled={isDifferentDetector || !isCalibTab || !canView || !hasCalibrationRights()}
          >
            Создать копию
          </Dropdown.Item>
          <Dropdown.Item
            as="button"
            disabled={!isCalibTab || !isChosenGeneral}
            onClick={handleDeleteCalib}
          >
            Удалить
          </Dropdown.Item>
        </DropdownButton>
        <Form.Select
          value={chosenCalibration ?? ''}
          onChange={handleCalibrationChange}
          size="sm"
          disabled={isActiveRunning}
        >
          {getCalibOptions(storedCalibOpt, activeTabType)}
        </Form.Select>
      </InputGroup>
    </>
  );
}

export default CalibrationMenu;
