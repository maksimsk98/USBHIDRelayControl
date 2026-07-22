import { useEffect, useMemo, useState } from 'react';
import {
  Button, Card, CardBody, CardFooter, CardHeader, Col, Row,
} from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { isNumber } from 'lodash';
import { clampingBlur, intSetter } from '../../utils/setters';
import CustomIncrementInput from '../custom/CustomIncrementInput';
import CustomInputGroup from '../custom/CustomInputGroup';
import { switchAutoThermostatState } from '../../services/thunks/autosampler/autosamplerThunk';
import {
  selectAutoNodeCurrentTemp, selectAutoNodeTargetTemp, selectAutoThermostatParams, selectIsAutosamplerBusy, selectIsAutoThermostatingSupported, selectIsAutoThermostatOn,
} from '../../services/selectors/autosampler/autosamplerBase';
import { autosamplerActions } from '../../services/reduxImportDispatcher';

const rangesMap = {
  targetTemp: [2, 4, 40],
};

function SampleCooling(props) {
  const dispatch = useDispatch();

  const isOn = useSelector(selectIsAutoThermostatOn);
  const storedParams = useSelector(selectAutoThermostatParams);
  const nodeTargetTemp = useSelector(selectAutoNodeTargetTemp);
  const isThermostatingSupported = useSelector(selectIsAutoThermostatingSupported);
  const currentTemp = useSelector(selectAutoNodeCurrentTemp);
  const isAutosamplerBusy = useSelector(selectIsAutosamplerBusy);

  useEffect(() => {
    if (isNumber(nodeTargetTemp)) {
      dispatch(autosamplerActions.setModuleParams({
        mode: 'thermostat',
        params: { targetTemp: nodeTargetTemp },
      }));
    }
  }, [nodeTargetTemp]);

  const [targetTemp, setTargetTemp] = useState(nodeTargetTemp);

  useEffect(() => {
    setTargetTemp(nodeTargetTemp ?? storedParams.targetTemp);
  }, [nodeTargetTemp]);

  const setterDispatch = useMemo(() => ({
    targetTemp: setTargetTemp,
  }), [setTargetTemp]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    intSetter({
      name,
      value,
      setterDispatch,
    });
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    clampingBlur({
      name,
      value,
      rangesMap,
      setterDispatch,
      returnAs: 'num',
    });
  };

  const handleCoolingToggle = () => {
    const params = {
      targetTemp,
    };
    dispatch(switchAutoThermostatState({ params, switchTo: !isOn }));
  };

  const handleCoolingUpdate = () => {
    const params = {
      targetTemp,
    };
    dispatch(switchAutoThermostatState({ params, switchTo: isOn }));
  };

  const thermostatBody = (
    <>
      <CustomInputGroup
        label="Охлаждение"
        readOnly
        disabled
        value={isOn ? 'Включено' : 'Выключено'}
        inputStyle={{ width: '120px', minWidth: '55px' }}
        size="sm"
      />
      <CustomIncrementInput
        label="Целевая"
        unit="°C"
        step={1}
        min={rangesMap.targetTemp[1]}
        max={rangesMap.targetTemp[2]}
        value={targetTemp}
        name="targetTemp"
        onChange={handleInputChange}
        onBlur={handleBlur}
        inputStyle={{
          width: '80px', // spinner takes ~1rem = 16px
          minWidth: '60px',
        }}// compensate for spinner
        unitStyle={{ width: '40px' }}
        size="sm"
        integer
      />

      <CustomInputGroup
        label="Текущая"
        value={currentTemp ?? '-'}
        unit="°C"
        readOnly
        disabled
        unitStyle={{ width: '40px' }}
        inputStyle={{ width: '80px', minWidth: '60px' }}
        size="sm"
      />
    </>
  );

  return (
    <Card style={{ width: 'fit-content', maxWidth: '100%', minWidth: 'auto' }} className="mb-3">
      <CardHeader>Охлаждение пробирок</CardHeader>
      <CardBody>
        {isThermostatingSupported ? thermostatBody : 'Термостатирование не предусмотрено'}
      </CardBody>

      {isThermostatingSupported && (
      <CardFooter>
        <Row>
          <Col xs="auto">
            <Button
              onClick={handleCoolingToggle}
              variant="primary"
              active={isOn}
              className="mb-2"
              disabled={isAutosamplerBusy}
            >
              {isOn ? 'Выключить' : 'Включить'}
            </Button>
          </Col>

          <Col xs="auto">
            <Button
              onClick={handleCoolingUpdate}
              variant="primary"
              disabled={!isOn || isAutosamplerBusy}
            >
              Обновить
            </Button>
          </Col>
        </Row>
      </CardFooter>
      )}
    </Card>
  );
}

export default SampleCooling;
