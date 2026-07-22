import React, { useState } from 'react';
import { Modal, Button } from 'react-bootstrap';

import { useSelector } from 'react-redux';
import {
  selectIsSelCalibArchived, selectAllCalibrations, selectGeneralMethods,
} from '../../../../services/reduxImportDispatcher';
import { useConfirmation, ConfirmationModal } from '../../../../hooks/useConfirmation';
import CustomInputGroup from '../../../custom/CustomInputGroup';
import CustomSelectGroup from '../../../custom/CustomSelectGroup';

function CalibCopyModal({
  activeTab,
  show,
  onClose,
  onSubmit,
  selectedMethod,
  selectedCalibration,
}) {
  const {
    showConfirmModal,
    message,
    promptConfirm,
    handleConfirm,
    handleCancel,
  } = useConfirmation();

  const methodsList = useSelector(selectGeneralMethods);
  const fullCalibList = useSelector((state) => selectAllCalibrations(state, {
    method: selectedMethod,
    tabId: activeTab,
  }));

  const isSelectedArchive = useSelector((state) => selectIsSelCalibArchived(state, { tabId: activeTab, calib: selectedCalibration }));
  // it's gonna be total cringe now, prepare
  const cringeFormat = (calibNameStr) => {
    const arr = Array.from(calibNameStr);
    const first = arr.indexOf('[');
    const last = arr.lastIndexOf(']');

    if (first !== -1 && last !== -1 && first !== last) {
      arr[first] = '_';
      arr[last] = '_';
      return arr.join('');
    }
    return calibNameStr;
  };
  const [newName, setNewName] = useState(isSelectedArchive ? cringeFormat(selectedCalibration) : selectedCalibration);
  const [methodToAppendTo, setMethodToAppendTo] = useState(selectedMethod);

  const handleInputChange = (e) => setNewName(e.target.value);
  const handleSelectChange = (e) => setMethodToAppendTo(e.target.value);

  const handleSubmit = async () => {
    let isConfirmed = true;
    if (fullCalibList.includes(newName)) {
      isConfirmed = await promptConfirm(`Градуировка ${newName} уже существует. Заменить?`);
    }
    if (!isConfirmed) return;
    onSubmit({
      newName,
      methodToAppendTo,
      selectedCalibration,
      calibTabId: activeTab,
    });
  };

  return (
    <>
      <ConfirmationModal
        show={showConfirmModal}
        message={message}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />

      <Modal show={show} onHide={onClose} backdrop="static" size="md">
        <Modal.Header closeButton>
          <Modal.Title>Копировать градуировку</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <CustomInputGroup
            label="Новое имя"
            value={newName}
            name="newName"
            onChange={handleInputChange}
            inputStyle={{ width: '100%' }}
            labelStyle={{ minWidth: '100px' }}
          />
          <CustomSelectGroup
            label="Метод"
            name="methodToAppendTo"
            value={methodToAppendTo}
            onChange={handleSelectChange}
            rawOptions={methodsList}
            labelStyle={{ minWidth: '100px' }}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={handleSubmit}>
            ОК
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default CalibCopyModal;
