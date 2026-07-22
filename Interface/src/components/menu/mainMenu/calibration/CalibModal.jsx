import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal, Button, Row, Col, Alert,
} from 'react-bootstrap';
import { useSelector } from 'react-redux';
import _ from 'lodash';

import { selectMainPeaksData, selectGenCalibsByMethod } from '../../../../services/reduxImportDispatcher';
import { CALIB_ERROR_MESSAGES, CONFIRM_MESSAGES, EMPTY_ARRAY } from '../../../../constants/constants';

import CustomInputGroup from '../../../custom/CustomInputGroup';
import CustomSelectGroup from '../../../custom/CustomSelectGroup';
import CustomCheckboxGroup from '../../../custom/CustomCheckboxGroup';
import CalibPeaksTable from './CalibPeaksTable';

import { useConfirmation, ConfirmationModal } from '../../../../hooks/useConfirmation';
import { selectCalibConcConcentrationUnits } from '../../../../services/selectors/calibConc/calibConcBase';
import { DEFAULT_CALUB_CONC_UNITS } from '../../../../constants/fallbacks';

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

const activeInputsConfig = {
  newCalib: {
    calibrationName: true,
    creationMethod: true,
    repPeak: true,
    standart: true,
    coefCalc: true,
    response: true,
    units: true,
    componentsFrom: true,
  },
  recalibrate: {
    calibrationName: true,
    creationMethod: false,
    repPeak: false,
    standart: false,
    coefCalc: false,
    response: false,
    units: false,
    componentsFrom: true,
  },
  addComponent: {
    calibrationName: false,
    creationMethod: false,
    repPeak: false,
    standart: false,
    coefCalc: false,
    response: false,
    units: false,
    componentsFrom: true,
  },
};

const checkEmptyComponents = (tableData) => tableData.some((row) => row.component.trim().length === 0);

const withDefault = (value, fallback) =>
  value == null || value === '' ? fallback : value;


function CalibModal({
  show,
  onSubmit,
  onClose,
  modalType,
  modalTitle,
  activeTab,
  selectedMethod,
  selectedCalibration,
}) {
  const activeInputs = activeInputsConfig[modalType];
  const genCalibs = useSelector((state) => selectGenCalibsByMethod(state, selectedMethod));
  const peakData = useSelector((state) => selectMainPeaksData(state, activeTab)) ?? EMPTY_ARRAY;
  const formattedPeakData = useMemo(() => peakData.map((peak) => ({
    ...peak,
    component: peak?.component ?? '',
    concentration: peak?.concentration ?? '',
  })), [peakData]);

  const initialCalibName = activeInputs.calibrationName ? '' : selectedCalibration;

  const [tableData, setTableData] = useState(_.cloneDeep(formattedPeakData));
  const filteredTable = useMemo(() => tableData.filter((peak) => {
    if (!peak.component || typeof peak.component !== 'string') return false;
    return peak.component.trim() !== '';
  }), [tableData]);

  const [creationMethod, setCreationMethod] = useState('abs');
  const [calibrationName, setCalibrationName] = useState(initialCalibName);
  const [repPeak, setRepPeak] = useState('');

  const [standart, setStandart] = useState('');

  useEffect(() => {
    if (creationMethod === 'inStandart' && filteredTable.length > 0) {
      setStandart((prev) => (filteredTable.some((r) => r.component === prev)
        ? prev
        : filteredTable[0].component));
    }
  }, [filteredTable, creationMethod]);

  const [response, setResponse] = useState('area');

  /* const calibrations = useSelector(state => selectGeneralCalibrations(state, selectedMethod)) */
  /* const [componentsFrom, setComponentsFrom] = useState(null); */
  const [isCoefCalc, setIsCoefCalc] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);

  
  const calibConcUnits = useSelector(s => selectCalibConcConcentrationUnits(s, selectedCalibration))
  const defaultUnits = creationMethod === 'inNorm' ? '%' : withDefault(calibConcUnits, DEFAULT_CALUB_CONC_UNITS);
  const [units, setUnits] = useState(() =>
    withDefault(calibConcUnits, DEFAULT_CALUB_CONC_UNITS)
  );

  useEffect(() => {
    setUnits(withDefault(defaultUnits, DEFAULT_CALUB_CONC_UNITS));
  }, [defaultUnits]);

  const tableHeaders = useMemo(() => {
    const headers = ['Пик', 'Время (мин)', 'Компонент'];
    if (creationMethod === 'inNorm' && !isCoefCalc) {
      headers.push('Коэффициент');
    } else {
      headers.push('Концентрация');
    }
    return headers;
  }, [creationMethod, isCoefCalc]);

  /* const calibrationOptions = useMemo(()=>{
    const calibOpt = calibrations.map((calib, index) => <option value={calib ?? ''} key={index}>{calib ?? ''}</option>);
    return [
      ...calibOpt
    ]
  },[calibrations]) */

  const nonOption = (<option key="default" value="">Не выбрано</option>);

  const componentOptions = useMemo(() => filteredTable.map((row, index) => <option value={row.component} key={index}>{row.component}</option>), [tableData]);

  const repPeakOptions = [nonOption, ...componentOptions];
  const standartOptions = componentOptions;

  useEffect(() => {
    setTableData(_.cloneDeep(formattedPeakData));
  }, [formattedPeakData]);

  const handleInputSelect = (peakIndex, columnKey) => (selected) => {
    const newState = [...tableData];
    newState[peakIndex][columnKey] = selected;
    setTableData(newState);
  };

  /* const handleChangeCompFrom = (e) => {
    const value = e.target.value === '' ? null : e.target.value;
    setComponentsFrom(value)
  } */

  const validate = (condition, errorType) => {
    if (condition) {
      setValidationErrors((prev) => (prev.includes(errorType) ? prev : [...prev, errorType]));
      return false;
    }
    setValidationErrors((prev) => prev.filter((warn) => warn !== errorType));
    return true;
  };

  const validateCalibrationName = (name) => {
    const errorType = 'emptyName';
    const isEmpty = name.length === 0;
    const isValid = validate(isEmpty, errorType);
    return isValid;
  };

  const validateConcentration = () => {
    const errorType = 'invalidConcentration';
    const hasEmptyConc = filteredTable.some((peak) => (peak.component.length > 0 && Number(peak.concentration) <= 0));
    const isValid = validate(hasEmptyConc, errorType);
    return isValid;
  };

  const handleNameBlur = (e) => {
    const name = e.target.value;
    const trimmedName = name.trim();
    if (name !== trimmedName) setCalibrationName(trimmedName);
  };

  const formElementLabelStyle = { width: '125px' };
  const formControlStyle = { width: '200px' };

  const {
    showConfirmModal,
    message,
    promptConfirm,
    handleConfirm,
    handleCancel,
  } = useConfirmation();

  // yeah numeric values are passed as strings, not my idea

  const handleSubmit = async (e) => {
    // no early return to collect alerts from all validations
    const isNameValid = validateCalibrationName(calibrationName);
    const isConcentValid = validateConcentration();

    if (isNameValid && isConcentValid) {
      const calibrationData = {
        name: calibrationName,
        creationMethod,
        template: selectedMethod,
        repPeak,
        response,
        standart: creationMethod === 'inStandart' ? standart : '',
        isCoefCalc: creationMethod === 'inNorm' ? isCoefCalc : false,
        units,
        componentTable: filteredTable.map((peak) => ({
          ...peak,
          concentration: String(peak.concentration), // Convert concentration to string
        })),
      };

      const hasEmptyComp = checkEmptyComponents(tableData);
      const isConfirmed = hasEmptyComp
        ? await promptConfirm(CONFIRM_MESSAGES.EMPTY_COMPONENTS)
        : true;

      if (isConfirmed) {
        onSubmit(
          calibrationData,
          selectedMethod,
          activeTab,
          genCalibs,
        );
      }
    }
  };

  const handleUnitsBlur = (e) =>
    setUnits(withDefault(e.target.value.trim(), DEFAULT_CALUB_CONC_UNITS))

  return (
    <>
      <ConfirmationModal
        show={showConfirmModal}
        message={message}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />

      <Modal show onHide={onClose} size="xl" backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>{modalTitle}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row>
            <Col md="auto">
              <CustomInputGroup
                label="Градуировка:"
                labelStyle={formElementLabelStyle}
                value={calibrationName}
                inputStyle={formControlStyle}
                size="sm"
                name="calibrationName"
                onChange={(e) => setCalibrationName(e.target.value)}
                onBlur={handleNameBlur}
                disabled={!activeInputs.calibrationName}
              />

              <CustomSelectGroup
                label="Метод:"
                labelStyle={formElementLabelStyle}
                size="sm"
                value={creationMethod}
                name="method"
                disabled={!activeInputs.creationMethod}
                onChange={(e) => setCreationMethod(e.target.value)}
                options={[
                  <option key="abs" value="abs">Абсолютная</option>,
                  <option key="internal_standart" value="inStandart">Внутренний стандарт</option>,
                  <option key="internal_norm" value="inNorm">Внутренняя нормализация</option>,
                ]}
              />

              <CustomSelectGroup
                label="Реперный пик:"
                labelStyle={formElementLabelStyle}
                size="sm"
                value={repPeak}
                name="repPeak"
                onChange={(e) => setRepPeak(e.target.value)}
                options={repPeakOptions}
                disabled={!activeInputs.repPeak}
              />

              { creationMethod === 'abs' && (
                <div style={{ height: '31px' }} className="mb-2" />
              )}

              { creationMethod === 'inStandart' && (
                <CustomSelectGroup
                  label="Стандарт:"
                  labelStyle={formElementLabelStyle}
                  size="sm"
                  value={standart}
                  name="standart"
                  onChange={(e) => setStandart(e.target.value)}
                  options={standartOptions}
                  disabled={!activeInputs.standart}
                />
              )}

              { creationMethod === 'inNorm' && (
                <CustomCheckboxGroup
                  label="Расчет коэффициентов"
                  checked={isCoefCalc}
                  name="coefCalc"
                  onChange={(e) => setIsCoefCalc(e.target.checked)}
                  groupClassName="mb-2"
                  labelStyle={{}}
                  size="sm"
                  disabled={!activeInputs.coefCalc}
                />

              )}

              <CustomSelectGroup
                label="Отклик:"
                labelStyle={formElementLabelStyle}
                size="sm"
                value={response}
                name="response"
                disabled={!activeInputs.response}
                onChange={(e) => setResponse(e.target.value)}
                options={[
                  <option key="area" value="area">Площадь</option>,
                  <option key="height" value="height">Высота</option>,
                ]}
              />

              {/* <CustomSelectGroup
                label="Единицы:"
                labelStyle={formElementLabelStyle}
                size='sm'
                value={units}
                name="units"
                onChange={(e) => setUnits(e.target.value)}
                options={[
                  <option key="ng/ml" value="нг/мл">нг/мл</option>,
                  <option key="percent" value="%">%</option>
                ]}
              /> */}

              <CustomInputGroup
                label="Единицы:"
                labelStyle={formElementLabelStyle}
                value={units}
                inputStyle={formControlStyle}
                size="sm"
                name="units"
                disabled={!activeInputs.units}
                onChange={(e) => setUnits(e.target.value)}
                onBlur={handleUnitsBlur}
                readOnly={creationMethod === 'inNorm'}
              />

              {/*             <CustomSelectGroup
                label="Компоненты из:"
                labelStyle={formElementLabelStyle}
                size='sm'
                value={componentsFrom ?? ''}
                name="componentsFrom"
                onChange={handleChangeCompFrom}
                groupClassName="mb-3"
                options={calibrationOptions}
                disabled={!activeInputs.componentsFrom}
              /> */}

              { validationErrors.map((errorType, index) => (
                <Alert key={index} variant="danger">
                  {CALIB_ERROR_MESSAGES[errorType]}
                </Alert>
              ))}
            </Col>

            <Col>
              <CalibPeaksTable
                tableData={tableData}
                setTableData={setTableData}
                handleInputSelect={handleInputSelect}
                peakTableParams={peakTableParams}
                headers={tableHeaders}
                containerStyle={{ fontSize: '12px', maxHeight: '80vh', overflowY: 'auto' }}
              />
            </Col>

            <Col md="auto" className="d-flex flex-column gap-2">
              <Button
                variant="primary"
                style={{ minWidth: '110px' }}
                onClick={handleSubmit}
              >
                ОК
              </Button>
              <Button variant="secondary" style={{ minWidth: '110px' }} onClick={onClose}>
                Отмена
              </Button>
            </Col>
          </Row>
        </Modal.Body>
      </Modal>
    </>

  );
}

export default CalibModal;
