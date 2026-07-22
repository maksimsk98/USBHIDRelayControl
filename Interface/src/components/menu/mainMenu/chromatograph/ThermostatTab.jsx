import React, { useState } from 'react';
import {
  Form, InputGroup, Container, Row, Col, Button, OverlayTrigger, Tooltip,
} from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';

import { isConvertableToNumber, formatValueString, normalizeDecimalInput } from '../../../../utils/validation';

import {
  selectThermostatData, selectTargetTemp, selectThermoDispersion, thermostatActions, selectIsThermostatOn, selectCurMeasHasThermo,
} from '../../../../services/reduxImportDispatcher';
import useResizeConstraints from '../../../../hooks/useResizeConstraints';
import { selectIsThermostatReady } from '../../../../services/selectors/status/statusDerived';
import { changeThermostatState, setDefaultThermoThunk } from '../../../../services/thunks/thermostat/thermostatThunks';

function ThermostatTab(props) {
  const dispatch = useDispatch();
  const { roomTemp, columnTemp } = useSelector(selectThermostatData);
  const storedTargetTemp = useSelector(selectTargetTemp);
  const storedDispersion = useSelector(selectThermoDispersion);
  const [targetTemp, setTargetTemp] = useState(storedTargetTemp);
  const [dispersion, setDispersion] = useState(storedDispersion ?? 0);
  const isThermostatOn = useSelector(selectIsThermostatOn);

  const curMeasHasThermo = useSelector(selectCurMeasHasThermo);

  const isThermoReady = useSelector(selectIsThermostatReady);

  const defaultValue = '-'; // in case of null value in data

  const handleSubmit = async () => {
    const newThermostatStatus = !isThermostatOn;
    // remember to convert to Number dispersion, target is already Number;
    dispatch(thermostatActions.setTargetTemp(targetTemp));
    dispatch(thermostatActions.setDispersion(Number(dispersion)));
    dispatch(changeThermostatState({ isThermostatOn: newThermostatStatus, targetTemp, dispersion: Number(dispersion) }));
    dispatch(thermostatActions.setIsThermostatIsOn(newThermostatStatus));
  };

  const handleTargetTempChange = (e) => {
    const value = normalizeDecimalInput(e);
    const numberValue = Number(value);

    if (!isNaN(numberValue)) {
      setTargetTemp(numberValue);
    }
  };

  const handleDispersionChange = (e) => {
    const value = normalizeDecimalInput(e).trim();
    let formattedValue = formatValueString(value);
    formattedValue = formattedValue === '' ? '0' : formattedValue; // validator isNumber works with string, so zero is a string for now

    if (isConvertableToNumber(formattedValue)) {
      // beware, value here is still string to allow 0. to be valid input, if conver to num here 0. will become just 0, deleting the "."
      setDispersion(formattedValue);
    }
  };

  const handleSetDefaults = () => {
    dispatch(setDefaultThermoThunk({ dispersion: Number(dispersion), targetTemp }));
  };

  useResizeConstraints({
    panelApi: props.api,
    maxHeight: props.params.maxFloatingHeight,
    maxWidth: props.params.maxFloatingWidth,
    minHeight: props.params.minFloatingHeight,
    minWidth: props.params.minFloatingWidth,
  });

  return (
    <Form style={{ height: '100%', overflow: 'scroll' }}>
      <Container style={{ height: '100%', maxWidth: '565px' }}>
        <Row className="mb-3">
          <Col>Температура</Col>
        </Row>
        <Row className="mb-3" style={{ flexWrap: 'nowrap' }}>
          <Col>
            <InputGroup style={{ flexWrap: 'nowrap' }}>
              <InputGroup.Text style={{ minWidth: '115px' }}>Целевая</InputGroup.Text>
              <Form.Control
                placeholder=""
                style={{ maxWidth: '80px', minWidth: '60px' }}
                value={targetTemp}
                name="targetTemp"
                onChange={handleTargetTempChange}
                disabled={isThermostatOn || curMeasHasThermo}
                readOnly={isThermostatOn}
              />
              <InputGroup.Text>°C</InputGroup.Text>
            </InputGroup>
          </Col>
          <Col xs={4}>
            <Button
              id="thermostatSubmitButton"
              variant={isThermostatOn ? 'secondary' : 'primary'}
              onClick={handleSubmit}
              disabled={!isThermoReady || curMeasHasThermo}
              style={{ width: '110px' }}
            >
              {isThermostatOn ? 'Выключить' : 'Включить'}
            </Button>
          </Col>
        </Row>
        <Row className="mb-3">
          <Col>
            <InputGroup style={{ flexWrap: 'nowrap' }}>
              <InputGroup.Text style={{ minWidth: '115px' }}>Отклонение</InputGroup.Text>
              <Form.Control
                placeholder=""
                style={{ maxWidth: '80px', minWidth: '60px' }}
                value={dispersion}
                name="dispersion"
                onChange={handleDispersionChange}
                disabled={isThermostatOn}
                readOnly={isThermostatOn}
              />
              <InputGroup.Text>°C</InputGroup.Text>
            </InputGroup>
          </Col>
          <Col xs={4}>
            <OverlayTrigger
              placement="top"
              container={document.getElementById('overlays-container')}
              delay={{ show: 1000, hide: 0 }}
              overlay={(
                <Tooltip id="tooltip-set-default">
                  Сделать выбранные параметры значениями по умолчанию
                </Tooltip>
                          )}
            >
              <Button
                id="thermostatSetDefaultButton"
                variant="primary"
                onClick={handleSetDefaults}
                style={{ width: '110px' }}
              >
                Установить
              </Button>
            </OverlayTrigger>
          </Col>
        </Row>
        <Row className="mb-3">
          <Col>
            <InputGroup style={{ flexWrap: 'nowrap' }}>
              <InputGroup.Text style={{ minWidth: '115px' }}>Колонка</InputGroup.Text>
              <Form.Control
                placeholder=""
                style={{ maxWidth: '80px', minWidth: '60px' }}
                value={columnTemp ?? defaultValue}
                disabled
                readOnly
              />
              <InputGroup.Text>°C</InputGroup.Text>
            </InputGroup>
          </Col>
        </Row>
        <Row className="mb-0">
          <Col>
            <InputGroup style={{ flexWrap: 'nowrap' }}>
              <InputGroup.Text style={{ minWidth: '115px' }}>Комнатная</InputGroup.Text>
              <Form.Control
                placeholder=""
                style={{ maxWidth: '80px', minWidth: '60px' }}
                value={roomTemp ?? defaultValue}
                disabled
                readOnly
              />
              <InputGroup.Text>°C</InputGroup.Text>
            </InputGroup>
          </Col>
        </Row>
      </Container>
    </Form>
  );
}

export default ThermostatTab;
