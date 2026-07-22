import React, { useMemo, useState } from 'react';
import {
  Modal, Button, Form, Alert,
} from 'react-bootstrap';

import _ from 'lodash';
import { useSelector } from 'react-redux';
import CalibPeaksTable from './CalibPeaksTable';
import { CALIB_ERROR_MESSAGES, EMPTY_ARRAY } from '../../../../constants/constants';
import { selectMainPeaksData } from '../../../../services/reduxImportDispatcher';

const peakTableParams = {
  number: true,
  exitTime: true,
  componentName: true,
  concentration: true,
  height: false,
  area: false,
  halfWidth: false,
  asymmetry: false,
  efficiency: false,
  resolution: false,
  relativeTime: false,
  peakValley: false,
};

function CalibAddLevelModal({
  show,
  onClose,
  onSubmit,
  activeTab,
  selectedMethod,
  selectedCalibration,
}) {
  const peakData = useSelector((state) => selectMainPeaksData(state, activeTab)) ?? EMPTY_ARRAY;
  const formattedPeakData = useMemo(() => peakData.map((peak) => ({
    ...peak,
    component: peak?.component ?? '',
    concentration: peak?.concentration ?? '',
  })), [peakData]);

  const [tableData, setTableData] = useState(_.cloneDeep(formattedPeakData));
  const [validationErrors, setValidationErrors] = useState([]);
  const [changeTimes, setChangeTimes] = useState(false);

  // Check for duplicate component names
  const hasDuplicateComponents = (data) => {
    const seen = new Set();
    for (const row of data) {
      if (seen.has(row.component.trim()) && row.component.trim() !== '') {
        return true;
      }
      seen.add(row.component.trim());
    }
    return false;
  };

  // Check for valid numeric concentration
  const hasInvalidConcentrations = (data) => data.some((row) => {
    const conc = row.concentration;
    return conc === '' || isNaN(conc) || Number(conc) <= 0;
  });

  const handleCheckboxChange = (e) => {
    setChangeTimes(e.target.checked);
  };

  const handleSubmit = () => {
    const errors = [];

    if (hasDuplicateComponents(tableData)) {
      errors.push('duplicateComponent');
    }
    if (hasInvalidConcentrations(tableData)) {
      errors.push('invalidConcentration');
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return; // Don’t submit if there are errors
    }

    // Clear errors and submit
    setValidationErrors([]);
    onSubmit({
      componentTable: tableData,
      changeRetentionTimes: changeTimes,
      selectedCalibration,
      selectedMethod,
      activeTab,
    });
  };

  const tableHeaders = ['Пик', 'Время', 'Компонент', 'Концентрация'];

  return (
    <Modal show={show} onHide={onClose} size="md" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Добавить уровень в градуировку</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <CalibPeaksTable
          tableData={tableData}
          setTableData={setTableData}
          peakTableParams={peakTableParams}
          headers={tableHeaders}
          containerStyle={{ fontSize: '12px', maxHeight: '80vh', overflowY: 'auto' }}
        />
        <Form.Check
          type="checkbox"
          label="Изменить времена выхода"
          checked={changeTimes}
          onChange={handleCheckboxChange}
          className="mt-2"
        />
        { validationErrors.map((errorType, index) => (
          <Alert key={index} variant="danger">
            {CALIB_ERROR_MESSAGES[errorType]}
          </Alert>
        ))}
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
  );
}

export default CalibAddLevelModal;
