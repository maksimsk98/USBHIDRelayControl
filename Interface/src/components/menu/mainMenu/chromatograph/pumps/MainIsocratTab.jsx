import React, { useEffect, useState } from 'react';
import {
  Form, InputGroup, Container, Row, Col, Button,
} from 'react-bootstrap';
import { useSelector, useDispatch } from 'react-redux';

import CustomInputGroup from '../../../../custom/CustomInputGroup.jsx';

import {
  isConvertableToNumber, formatValueString, clampValue, normalizeDecimalInput,
} from '../../../../../utils/validation.js';
import {
  postIsocratDrainData, postIsocratSupplyData, postIsocratFillData, stopPump, releasePressure,
} from '../../../../../services/thunks/nodes/nodesControlThunks.js';
import useResizeConstraints from '../../../../../hooks/useResizeConstraints.js';
import { useConfirmation, ConfirmationModal } from '../../../../../hooks/useConfirmation.js';
import {
  BUTTON_TO_FINISH_MAP, CONFIRM_MESSAGES, PUMP_PRESSURE_RANGES_MAP, PUMP_RANGES,
} from '../../../../../constants/constants.js';
import {
  errorsActions, mainIsocratActions, selectPumpsCount, selectPumpsTypes,
} from '../../../../../services/reduxImportDispatcher.js';
import { selectMainIsocratForm } from '../../../../../services/selectors/mainIsocrat/mainIsocratBase.js';
import { selectUnhandledCriticalPressureErrorId } from '../../../../../services/selectors/errors/errorsBase.js';
import PumpStatusBlock from './PumpStatusBlock.jsx';

function MainIsocratTab(props) {
  props.api.group.api.setConstraints({
    minimumWidth: 350,
  });

  const dispatch = useDispatch();

  const pumpData = useSelector((state) => state.statusReducer.data.pumps.A1); // by default A1 as isocrat
  const pumpTypes = useSelector(selectPumpsTypes);

  const {
    flowRate, pressure, volume, volumeMax, status, state,
  } = pumpData;

  const savedState = useSelector(selectMainIsocratForm);

  const [activeButton, setActiveButton] = useState(savedState.activeButton);
  const [fillChecked, setFillChecked] = useState(savedState.fillChecked);
  const [drainChecked, setDrainChecked] = useState(savedState.drainChecked);
  const [fillVolume, setFillVolume] = useState(savedState.fillVolume);
  const [drainVolume, setDrainVolume] = useState(savedState.drainVolume);
  const [supplyFlowRate, setSupplyFlowRate] = useState(savedState.supplyFlowRate);
  const [supplyStartFlowRate, setSupplyStartFlowRate] = useState(savedState.supplyStartFlowRate);
  const [supplyStartPressure, setSupplyStartPressure] = useState(savedState.supplyStartPressure);

  const unhandledErrorId = useSelector(selectUnhandledCriticalPressureErrorId);
  const pumpsCount = useSelector(selectPumpsCount);

  const isSinglePump = pumpsCount === 1;

  const [showRelease, setShowRelease] = useState(false);

  useEffect(() => {
    if (
      unhandledErrorId
      && pressure === 0
      && activeButton === 'supply'
    ) {
      setActiveButton(null);
      dispatch(errorsActions.markErrorHandled(unhandledErrorId));
    }
  }, [unhandledErrorId, pressure, activeButton, dispatch]);

  useEffect(() => {
    const checkBoxMap = {
      fill: setFillChecked,
      drain: setDrainChecked,
    };
    if (state === BUTTON_TO_FINISH_MAP[activeButton]) {
      console.log('finish', BUTTON_TO_FINISH_MAP[activeButton]);
      checkBoxMap[activeButton](false);
      setActiveButton(null);
    }
  }, [state, activeButton]);

  // Save state to Redux when component unmounts
  useEffect(() => () => {
    dispatch(mainIsocratActions.setFormState({
      activeButton,
      fillChecked,
      drainChecked,
      fillVolume,
      drainVolume,
      supplyFlowRate,
      supplyStartFlowRate,
      supplyStartPressure,
    }));
  }, [activeButton, fillChecked, drainChecked, fillVolume, drainVolume, supplyFlowRate, supplyStartFlowRate, supplyStartPressure, dispatch]);

  const handleButtonClick = (type) => {
    const isActive = activeButton === type;
    setActiveButton(isActive ? null : type);

    const buttonConfig = {
      fill: {
        action: postIsocratFillData,
        payload: {
          pumpFillOn: !isActive,
          volume: !isActive ? (fillChecked ? fillVolume : 0) : 0,
        },
      },
      drain: {
        action: postIsocratDrainData,
        payload: {
          pumpDrainOn: !isActive,
          volume: !isActive ? (drainChecked ? drainVolume : 0) : 0,
        },
      },
      supply: {
        action: postIsocratSupplyData,
        payload: {
          pumpSupplyOn: !isActive,
          supplyFlowRate: !isActive ? supplyFlowRate : 0,
          supplyStartFlowRate: !isActive ? supplyStartFlowRate : 0,
          supplyStartPressure: !isActive ? Number(supplyStartPressure) : 0,
        },
      },
    };

    const { action, payload } = buttonConfig[type];
    dispatch(action(payload));
  };

  const handleReleasePreasure = (event) => {
    let value;
    if (activeButton === 'releasePressure') {
      setActiveButton(null);
      value = false;
    } else if (activeButton === null) {
      setActiveButton('releasePressure');
      value = true;
    } else {
      return; // if active already no go
    }

    dispatch(releasePressure({ pumpMode: 'isocrat', pumpAReleasePressure: value }));
  };

  useEffect(() => {
    if (pressure > 0 && (activeButton === null || activeButton === 'releasePressure')) {
      setShowRelease(true);
    } else {
      setShowRelease(false);
    }

    if (pressure === 0 && activeButton === 'releasePressure') {
      setActiveButton(null);
    }
  }, [pressure, activeButton]);

  const {
    showConfirmModal,
    message,
    promptConfirm,
    handleConfirm,
    handleCancel,
  } = useConfirmation();

  const handleStop = async () => {
    const isConfirmed = await promptConfirm(CONFIRM_MESSAGES.STOP_PUMPS);
    if (isConfirmed) {
      dispatch(stopPump());
      setActiveButton(null);
    }
  };

  const handleIntegerInputChange = (e) => {
    const value = normalizeDecimalInput(e);
    const { name } = e.target;
    const ranges = name === 'supplyStartPressure'
      ? PUMP_PRESSURE_RANGES_MAP[pumpTypes.A1] // isocrat is A1
      : PUMP_RANGES[name] ?? [0, null];
    const numberValue = clampValue(Number(value), ranges[0], ranges[1]);

    if (!isNaN(numberValue)) {
      const setters = {
        fillVolume: setFillVolume,
        drainVolume: setDrainVolume,
        supplyFlowRate: setSupplyFlowRate,
        supplyStartFlowRate: setSupplyStartFlowRate,
      };
      setters[name](numberValue);
    }
  };

  const handleSupplyStartPressureChange = (e) => {
    const value = normalizeDecimalInput(e).trim();
    let formattedValue = formatValueString(value); // Format the value using custom formatter
    formattedValue = formattedValue === '' ? '0' : formattedValue; // validator isConvertableToNumber works with string, so zero is a string for now

    // isConvertableToNumber validator is applied to the formatted value as it's a string
    if (isConvertableToNumber(formattedValue)) {
      const ranges = PUMP_RANGES.supplyStartPressure;
      const numericValue = Number(formattedValue);
      const clampedValue = clampValue(numericValue, ranges[0], ranges[1]);

      const valueToAssign = numericValue !== clampedValue ? clampedValue : formattedValue;

      // beware, value here is still string to allow 0. to be valid input, if conver to num here 0. will become just 0, deleting the "."
      setSupplyStartPressure(valueToAssign);
    }
  };

  useResizeConstraints({
    panelApi: props.api,
    maxHeight: props.params.maxFloatingHeight,
    maxWidth: props.params.maxFloatingWidth,
    minHeight: props.params.minFloatingHeight,
    minWidth: props.params.minFloatingWidth,
  });

  return (
    <>
      <ConfirmationModal
        show={showConfirmModal}
        message={message}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />

      <Form style={{ height: '100%', overflow: 'auto' }}>
        <Container style={{ maxWidth: '620px', height: '100%' }}>
          <div className="p-3 mb-3 border rounded" style={{ minWidth: 'min-content' }}>
            <Row>
              <Col>
                <PumpStatusBlock
                  title="Насос"
                  flowRate={flowRate}
                  pressure={pressure}
                  volume={volume}
                  volumeMax={volumeMax}
                  status={status}
                  state={state}
                  showReleaseButton={showRelease}
                  highlightRelease={activeButton === 'releasePressure'}
                  onReleasePressure={handleReleasePreasure}
                />
              </Col>

            </Row>
          </div>

          <div className="border rounded p-3 mb-3" style={{ minWidth: 'min-content' }}>
            <Row className="mb-2">
              <Col>
                <div className="mb-2 fw-bold">Операция</div>
              </Col>
            </Row>
            <Row className="mb-2">
              <Col>
                <InputGroup style={{ flexWrap: 'nowrap' }}>
                  <Button
                    active={activeButton === 'fill'}
                    style={{ width: '110px', minWidth: '75px' }}
                    onClick={() => handleButtonClick('fill')}
                    disabled={activeButton !== 'fill' && activeButton !== null}
                  >
                    Набор
                  </Button>
                  <InputGroup.Checkbox checked={fillChecked} disabled={activeButton !== null} onChange={() => { setFillChecked(!fillChecked); }} />
                  <InputGroup.Text style={{ width: '85px' }}>Объем</InputGroup.Text>
                  <Form.Control
                    placeholder=""
                    style={{ maxWidth: '80px', minWidth: '60px' }}
                    disabled={!fillChecked || activeButton !== null}
                    readOnly={!fillChecked || activeButton !== null}
                    name="fillVolume"
                    value={fillVolume}
                    onChange={handleIntegerInputChange}
                  />
                  <InputGroup.Text style={{ width: '60px' }}>мкл</InputGroup.Text>
                </InputGroup>
              </Col>
            </Row>
            <Row className="mb-2">
              <Col>
                <InputGroup style={{ flexWrap: 'nowrap' }}>
                  <Button
                    active={activeButton === 'drain'}
                    style={{ width: '110px', minWidth: '75px' }}
                    onClick={() => handleButtonClick('drain')}
                    disabled={activeButton !== 'drain' && activeButton !== null}
                  >
                    Слив
                  </Button>
                  <InputGroup.Checkbox checked={drainChecked} disabled={activeButton !== null} onChange={() => { setDrainChecked(!drainChecked); }} />
                  <InputGroup.Text style={{ width: '85px' }}>Объем</InputGroup.Text>
                  <Form.Control
                    placeholder=""
                    style={{ maxWidth: '80px', minWidth: '60px' }}
                    disabled={!drainChecked || activeButton !== null}
                    readOnly={!drainChecked || activeButton !== null}
                    value={drainVolume}
                    name="drainVolume"
                    onChange={handleIntegerInputChange}
                  />
                  <InputGroup.Text style={{ width: '60px' }}>мкл</InputGroup.Text>
                </InputGroup>
              </Col>
            </Row>
            <Row className="mb-2">
              <Col>
                <Button
                  style={{ width: '110px' }}
                  active={activeButton === 'supply'}
                  onClick={() => handleButtonClick('supply')}
                  disabled={activeButton !== 'supply' && activeButton !== null}
                >
                  Подача
                </Button>
              </Col>
            </Row>
            <Row className="mb-2">
              <Col>
                <CustomInputGroup
                  label="Расход"
                  value={supplyFlowRate}
                  unit="мкл/мин"
                  name="supplyFlowRate"
                  onChange={handleIntegerInputChange}
                  disabled={activeButton !== null}
                  inputStyle={{ maxWidth: '100px', minWidth: '60px' }}
                  labelStyle={{ width: '175px' }}
                />
              </Col>
            </Row>
            <Row className="mb-2">
              <Col>
                <CustomInputGroup
                  label="Начальный расход"
                  value={supplyStartFlowRate}
                  unit="мкл/мин"
                  name="supplyStartFlowRate"
                  onChange={handleIntegerInputChange}
                  disabled={activeButton !== null}
                  inputStyle={{ maxWidth: '100px', minWidth: '60px' }}
                  labelStyle={{ width: '175px' }}
                />
              </Col>
            </Row>
            <Row className="mb-2">
              <Col>
                <CustomInputGroup
                  label="Начальное давление"
                  value={supplyStartPressure}
                  unit="МПа"
                  name="supplyStartPressure"
                  onChange={handleSupplyStartPressureChange}
                  disabled={activeButton !== null}
                  inputStyle={{ maxWidth: '100px', minWidth: '60px' }}
                  labelStyle={{ width: '175px' }}
                />
              </Col>
            </Row>
            <Row className="mb-2">
              <Col>
                <Button style={{ width: '110px' }} onClick={handleStop}>Остановка</Button>
              </Col>
            </Row>
          </div>

        </Container>
      </Form>
    </>
  );
}

export default MainIsocratTab;
