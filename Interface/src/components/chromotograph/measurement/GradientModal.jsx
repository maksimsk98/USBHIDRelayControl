import React, { useEffect, useState } from 'react';
import {
  Row, Col, Button, Modal,
} from 'react-bootstrap';
import { cloneDeep } from 'lodash';

import { useDispatch, useSelector } from 'react-redux';
import CustomInputGroup from '../../custom/CustomInputGroup';
import CustomCheckboxGroup from '../../custom/CustomCheckboxGroup';
import CustomSelectGroup from '../../custom/CustomSelectGroup';
import GradientTable from './GradientTable';
import { hasMissingRequiredFields, formatFloatStr, normalizeDecimalInput } from '../../../utils/validation';
import { useCellTooltip } from '../../../hooks/useTooltip';
import { selectPumpProgramData } from '../../../services/reduxImportDispatcher';
import { EMPTY_OBJECT, INVALID_FORMAT } from '../../../constants/constants';
import { intSetter } from '../../../utils/setters';

const defaultRows = [
  {
    from: 0, to: '', flowRate: '', A_H: '', A_K: '', B_H: '', B_K: '',
  },
];

function GradientModal(props) {
  const {
    show, handleClose, parentId, handleSubmit, handleDecline, previousGradientProgram = null,
  } = props;

  const dispatch = useDispatch();
  const [fillFlowRate, setFillFlowRate] = useState(1);

  const [rows, setRows] = useState(() => cloneDeep(defaultRows));

  const [startFlowRate, setStartFlowRate] = useState(2000);
  const [startPressure, setStartPressure] = useState(2);
  const [conditioningTime, setConditioningTime] = useState(2);
  const [isAutoFill, setIsAutoFill] = useState(true);
  const [restartAfterStop, setRestartAfterStop] = useState(true);
  const [startVolume, setStartVolume] = useState('');

  const pumpProgramData = useSelector((state) => selectPumpProgramData(state, parentId));

  const gradientProgram = previousGradientProgram ?? pumpProgramData?.gradientProgram ?? EMPTY_OBJECT;

  useEffect(() => {
    if (!show) return;
    if (!gradientProgram) return;
    setStartFlowRate(gradientProgram.startFlowRate ?? 2000);
    setStartPressure(gradientProgram.startPressure ?? 2);
    setConditioningTime(gradientProgram.conditioningTime ?? 2);
    setIsAutoFill(gradientProgram.isAutoFill ?? true);
    setRestartAfterStop(gradientProgram.restartAfterStop ?? true);
    setFillFlowRate(gradientProgram.fillFlowRate ?? 0);
    setStartVolume(gradientProgram.startVolume ?? '');

    const steps = gradientProgram?.steps;
    if (steps?.length) {
      setRows(cloneDeep(steps));
    } else {
      setRows(cloneDeep(defaultRows));
    }
  }, [show, gradientProgram]);

  const {
    handleRefChange, // to pass to inputs
    showTooltip, // to call when input is invalid
    TooltipRenderer, // JSX to render all tooltips
  } = useCellTooltip({ timeout: 3000, placement: 'top' });

  const handleSave = () => {
    const REQUIRED_FIELDS = ['to', 'flowRate', 'A_H', 'A_K'];
    if (hasMissingRequiredFields(rows, REQUIRED_FIELDS, showTooltip)) return;

    const steps = rows.map((row) => ({
      from: parseFloat(row.from) || 0,
      to: parseFloat(row.to) || 0,
      flowRate: parseInt(row.flowRate, 10) || 0,
      A_H: parseInt(row.A_H, 10) || 0,
      A_K: parseInt(row.A_K, 10) || 0,
      B_H: parseInt(row.B_H, 10) || 0,
      B_K: parseInt(row.B_K, 10) || 0,
    }));

    const dataToSubmit = {
      ...(parentId && { chromoId: parentId }),
      params: {
        startFlowRate: Number(startFlowRate) || 0,
        startPressure: Number(startPressure) || 0,
        conditioningTime: Number(conditioningTime) || 0,
        startVolume: Number(startVolume) || 0,
        isAutoFill,
        restartAfterStop,
        fillFlowRate,
        steps,
      },
    };

    handleSubmit(dataToSubmit);

    handleClose();
  };

  const setterDispatch = {
    startFlowRate: setStartFlowRate,
    conditioningTime: setConditioningTime,
    startVolume: setStartVolume,
  };

  const rangesMap = {
    startFlowRate: [8, null, null],
    conditioningTime: [8, null, null],
    startVolume: [8, null, null],
  };

  const handleChangeInputInteger = (e) => {
    const { name } = e.target;
    const value = normalizeDecimalInput(e);

    intSetter({
      name,
      value,
      rangesMap,
      setterDispatch,
    });
  };

  const handleStartPressureChange = (e) => {
    const value = normalizeDecimalInput(e);
    const formatted = formatFloatStr(value, {
      ifEmptyNull: true,
      ifInvalidFormatNull: false,
      maxDigits: 2,
      maxDecimals: 2,
      max: 20,
    });
    if (formatted !== INVALID_FORMAT) setStartPressure(formatted);
  };

  const labelStyles = { width: '230px' };

  return (
    <Modal show={show} onHide={handleDecline} size="xl" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title style={{ fontSize: '20px' }}>Программа градиентного элюирования</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/*         <Row>
          <Col sm={6}>
            <CustomSelectGroup
              label="Импортировать из метода"
              value="1"
              options={[
                <option key="1" value="1">1</option>,
                <option key="2" value="2">2</option>,
                <option key="3" value="3">3</option>,
              ]}
              onChange={(e) => console.log(e.target.value)} // Update the value as needed
            />
          </Col>
        </Row> */}

        <Row className="mb-3">
          <Col sm={10}>
            <GradientTable
              setRows={setRows}
              rows={rows}
              handleRefChange={handleRefChange}
              TooltipRenderer={TooltipRenderer}
              showTooltip={showTooltip}
              parentId={parentId}
              key={parentId}
            />
          </Col>
        </Row>

        <Row>
          <Col sm={6}>
            <CustomInputGroup
              label="Начальный расход"
              name="startFlowRate"
              value={startFlowRate ?? ''}
              unit="мкл/мин"
              onChange={handleChangeInputInteger}
              inputStyle={{ maxWidth: '100px', minWidth: '60px' }}
              labelStyle={labelStyles}
            />
            <CustomInputGroup
              label="Начальное давление"
              value={startPressure ?? ''}
              name="startPressure"
              unit="МПа"
              onChange={handleStartPressureChange}
              inputStyle={{ maxWidth: '100px', minWidth: '60px' }}
              labelStyle={labelStyles}
            />
            <CustomSelectGroup
              label="Скорость набора"
              labelStyle={labelStyles}
              selectStyle={{ minWidth: '60px', maxWidth: '220px' }}
              value={fillFlowRate ?? ''}
              name="fillFlowRate"
              options={[
                <option key="0" value="0">Высокая (20 мл/мин)</option>,
                <option key="1" value="1">Средняя (10 мл/мин)</option>,
                <option key="2" value="2">Низкая (5 мл/мин)</option>,
                <option key="3" value="3">2 мл/мин</option>,
                <option key="4" value="4">1 мл/мин</option>,
              ]}
              onChange={(e) => setFillFlowRate(Number(normalizeDecimalInput(e)))}
            />
          </Col>

          <Col sm={6}>
            <CustomInputGroup
              label="Время кондиционирования"
              value={conditioningTime ?? ''}
              name="conditioningTime"
              unit="мин."
              onChange={handleChangeInputInteger}
              inputStyle={{ maxWidth: '100px', minWidth: '60px' }}
              labelStyle={labelStyles}
            />
            <CustomInputGroup
              label="Стартовый объем"
              value={startVolume}
              name="startVolume"
              unit="мкл"
              onChange={handleChangeInputInteger}
              inputStyle={{ maxWidth: '100px', minWidth: '60px' }}
              labelStyle={labelStyles}
              // legacy keeps this active all the time
              /* readOnly={!isAutoFill}
              disabled={!isAutoFill} */
            />
            <div className="d-flex justify-content-between">
              <CustomCheckboxGroup
                label="Автоматический набор"
                checked={isAutoFill}
                onChange={(e) => setIsAutoFill(e.target.checked)}
              />
              <CustomCheckboxGroup
                label="Рестарт после завершения"
                checked={restartAfterStop}
                onChange={(e) => setRestartAfterStop(e.target.checked)}
              />
            </div>
          </Col>
        </Row>

      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleDecline}>
          Отмена
        </Button>
        <Button variant="primary" onClick={handleSave}>
          ОК
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default GradientModal;
