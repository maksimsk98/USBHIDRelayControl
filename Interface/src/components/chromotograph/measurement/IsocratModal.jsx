import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import InputGroup from 'react-bootstrap/InputGroup';
import Modal from 'react-bootstrap/Modal';

import { selectIsocratProgram, pumpProgramActions, selectPumpsCount } from '../../../services/reduxImportDispatcher.js';

import { isConvertableToNumber, formatValueString, normalizeDecimalInput } from '../../../utils/validation.js';
import CustomInputGroup from '../../custom/CustomInputGroup.jsx';
import { intSetter } from '../../../utils/setters.js';
import { PUMP_RANGES } from '../../../constants/constants.js';

function IsocratModal(props) {
  const { show: showIsocrat, handleClose, parentId } = props;

  const dispatch = useDispatch();

  const {
    flowRate: storedFlowRate,
    startFlowRate: storedStartFlowRate,
    startPressure: storedStartPressure,
    conditioningTime: storedConditioningTime,
    isAutoFill: storedIsAutoFill,
    isContinuousSupply: storedIsContinuousSupply,
    startVolume: storedStartVolume,
    isocratVolume: storedIsocratVolume,
    gradientVolume: storedGradientVolume,
    fillFlowRate: storedFillFlowRate,
  } = useSelector((state) => selectIsocratProgram(state, parentId));

  const pumpsCount = useSelector(selectPumpsCount);

  const isSinglePump = pumpsCount === 1;

  const [flowRate, setFlowRate] = useState(storedFlowRate);
  const [startFlowRate, setStartFlowRate] = useState(storedStartFlowRate);
  const [startPressure, setStartPressure] = useState(storedStartPressure);
  const [conditioningTime, setConditioningTime] = useState(storedConditioningTime);
  const [isAutoFill, setIsAutoFill] = useState(storedIsAutoFill);
  const [isContinuousSupply, setIsContinuousSupply] = useState(storedIsContinuousSupply);
  const [startVolume, setStartVolume] = useState(storedStartVolume);
  const [isocratVolume, setIsocratVolume] = useState(storedIsocratVolume);
  const [gradientVolume, setGradientVolume] = useState(storedGradientVolume);
  const [fillFlowRate, setFillFlowRate] = useState(storedFillFlowRate);

  useEffect(() => {
    setFlowRate(storedFlowRate);
    setStartFlowRate(storedStartFlowRate);
    setStartPressure(storedStartPressure);
    setConditioningTime(storedConditioningTime);
    setIsAutoFill(storedIsAutoFill);
    setIsContinuousSupply(storedIsContinuousSupply);
    setStartVolume(storedStartVolume);
    setIsocratVolume(storedIsocratVolume);
    setGradientVolume(storedGradientVolume);
    setFillFlowRate(storedFillFlowRate);
  }, [
    storedFlowRate,
    storedStartFlowRate,
    storedStartPressure,
    storedConditioningTime,
    storedIsAutoFill,
    storedIsContinuousSupply,
    storedStartVolume,
    storedIsocratVolume,
    storedGradientVolume,
    storedFillFlowRate,
    showIsocrat, // to reset on cancel and reopen
  ]);

  const handleContinousSupplyChange = (e) => {
    const { checked } = e.target;

    if (checked) {
      setIsAutoFill(true);
      setIsContinuousSupply(true);
      setStartVolume(35000);
      setIsocratVolume(20000);
      setGradientVolume(5000);
    } else {
      setIsAutoFill(false);
      setIsContinuousSupply(false);
      setStartVolume(0);
      setIsocratVolume(0);
      setGradientVolume(0);
    }
  };

  const handleIsAutoFillChange = (e) => {
    const { checked } = e.target;
    setIsAutoFill(checked);
  };

  const setterDispatch = {
    flowRate: setFlowRate,
    startFlowRate: setStartFlowRate,
    conditioningTime: setConditioningTime,
    startVolume: setStartVolume,
    isocratVolume: setIsocratVolume,
    gradientVolume: setGradientVolume,
  };

  const rangesMap = {
    flowRate: [null, ...PUMP_RANGES.supplyFlowRate],
    startFlowRate: [null, ...PUMP_RANGES.supplyStartFlowRate],
    startVolume: [5, ...PUMP_RANGES.startVolume], // maxDigits, min, max
    isocratVolume: [5, ...PUMP_RANGES.isocratVolume],
    gradientVolume: [5, ...PUMP_RANGES.gradientVolume],
  };

  const handleIntegerInputChange = (e) => {
    const { name } = e.target;
    const value = normalizeDecimalInput(e);

    intSetter({
      name,
      value,
      rangesMap,
      setterDispatch,
      config: {
        isSetAsNum: true,
        isMinOnEmpty: true,
      },
    });
  };

  const handleSupplyStartPressureChange = (e) => {
    const value = normalizeDecimalInput(e).trim();
    let formattedValue = formatValueString(value); // Format the value using custom formatter
    formattedValue = formattedValue === '' ? '0' : formattedValue; // validator isConvertableToNumber works with string, so zero is a string for now
    // isConvertableToNumber validator is applied to the formatted value as it's a string
    if (isConvertableToNumber(formattedValue)) {
      // beware, value here is still string to allow 0. to be valid input, if conver to num here 0. will become just 0, deleting the "."
      setStartPressure(formattedValue);
    }
  };

  const handleDecline = () => {
    handleClose();
  };

  const handleSave = () => {
    const validData = {
      flowRate,
      startFlowRate,
      startPressure: Number(startPressure),
      conditioningTime,
      isAutoFill,
      isContinuousSupply,
      startVolume,
      isocratVolume,
      gradientVolume,
      fillFlowRate,
    };
    handleClose();
    dispatch(pumpProgramActions.updateIsocratModalState({ chromoId: parentId, params: validData }));
  };

  useEffect(() => {
    setIsAutoFill(isContinuousSupply);
  }, [isContinuousSupply]);

  return (
    <Modal show={showIsocrat} onHide={handleDecline} backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title style={{ fontSize: '18px' }}>Параметры изократического режима</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <CustomInputGroup
            label="Расход"
            value={flowRate}
            unit="мкл/мин"
            name="flowRate"
            onChange={handleIntegerInputChange}
            labelStyle={{ minWidth: '240px' }}
            groupClassName="mb-1"
            maxLength={4}
          />

          <CustomInputGroup
            label="Начальный расход"
            value={startFlowRate}
            unit="мкл/мин"
            name="startFlowRate"
            onChange={handleIntegerInputChange}
            labelStyle={{ minWidth: '240px' }}
            groupClassName="mb-1"
            maxLength={4}
          />

          <CustomInputGroup
            label="Начальное давление"
            value={startPressure}
            unit="МПа"
            name="startPressure"
            onChange={handleSupplyStartPressureChange}
            labelStyle={{ minWidth: '240px' }}
            groupClassName="mb-1"
            maxLength={5}
          />

          <CustomInputGroup
            label="Время кондиционирования"
            value={conditioningTime}
            unit="мин."
            name="conditioningTime"
            onChange={handleIntegerInputChange}
            labelStyle={{ minWidth: '240px' }}
            groupClassName="mb-3"
            maxLength={4}
          />

          <InputGroup style={{ flexWrap: 'nowrap' }} className="mb-1">
            <InputGroup.Text style={{ minWidth: '240px' }}>Скорость набора</InputGroup.Text>
            <Form.Select value={fillFlowRate} onChange={(e) => setFillFlowRate(Number(e.target.value))}>
              <option value="0">Высокая (20 мл/мин)</option>
              <option value="1">Средняя (10 мл/мин)</option>
              <option value="2">Низкая (5 мл/мин)</option>
              <option value="3">2 мл/мин</option>
              <option value="4">1 мл/мин</option>
            </Form.Select>
          </InputGroup>

          <InputGroup style={{ flexWrap: 'nowrap' }} className="mb-3">
            <InputGroup.Checkbox
              name="isAutoFill"
              checked={isAutoFill}
              onChange={handleIsAutoFillChange}
              disabled={isContinuousSupply}
            />
            <InputGroup.Text style={{ width: '198px' }}>Автоматический набор</InputGroup.Text>
          </InputGroup>

          <InputGroup style={{ flexWrap: 'nowrap' }} className="mb-1">
            <InputGroup.Checkbox
              name="isContinuousSupply"
              checked={isContinuousSupply}
              onChange={handleContinousSupplyChange}
              /* disabled={isSinglePump} */
            />
            <InputGroup.Text style={{ width: '198px' }}>Непрерывная подача</InputGroup.Text>
          </InputGroup>

          <CustomInputGroup
            label="Объем стартовый"
            value={startVolume}
            unit="мкл"
            name="startVolume"
            onChange={handleIntegerInputChange}
            labelStyle={{ minWidth: '240px' }}
            groupClassName="mb-1"
            disabled={!isContinuousSupply}
            maxLength={5}
          />

          <CustomInputGroup
            label="Объем изократический"
            value={isocratVolume}
            unit="мкл"
            name="isocratVolume"
            onChange={handleIntegerInputChange}
            labelStyle={{ minWidth: '240px' }}
            groupClassName="mb-1"
            disabled={!isContinuousSupply}
            maxLength={5}
          />

          <CustomInputGroup
            label="Объем градиентный"
            value={gradientVolume}
            unit="мкл"
            name="gradientVolume"
            onChange={handleIntegerInputChange}
            labelStyle={{ minWidth: '240px' }}
            groupClassName="mb-1"
            disabled={!isContinuousSupply}
            maxLength={5}
          />
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={handleSave} style={{ width: '100px' }}>
          ОК
        </Button>
        <Button variant="secondary" onClick={handleDecline} style={{ width: '100px' }}>
          Отмена
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default IsocratModal;
