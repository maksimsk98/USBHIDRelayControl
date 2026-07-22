import React, {
  useEffect, useMemo, useRef, useState,
} from 'react';
import {
  Form, Container, Row, Col, Button,
} from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';

import CustomCheckboxGroup from '../../../../custom/CustomCheckboxGroup.jsx';
import CustomSelectGroup from '../../../../custom/CustomSelectGroup.jsx';
import GradientModal from '../../../../chromotograph/measurement/GradientModal.jsx';
import PumpTable from '../../../../chromotograph/measurement/PumpTable.jsx';
import { isNonNegIntStrWithinLimits } from '../../../../../utils/validation.js';
import { mainGradientActions } from '../../../../../services/slices/mainGradientSlice.js';
import { selectMainGradientForm } from '../../../../../services/selectors/mainGradient/mainGradientBase.js';
import {
  postGradientDrainData, postGradientFillData, postGradientSupplyData, releasePressure, stopPump,
} from '../../../../../services/thunks/nodes/nodesControlThunks.js';
import CustomCheckboxInput from '../../../../custom/CustomCheckInput.jsx';
import useResizeConstraints from '../../../../../hooks/useResizeConstraints.js';
import {
  errorsActions, selectChosenPumps, selectPumpsCount, selectPumpsStatusData,
} from '../../../../../services/reduxImportDispatcher.js';
import PumpStatusBlock from './PumpStatusBlock.jsx';
import { ConfirmationModal, useConfirmation } from '../../../../../hooks/useConfirmation.js';
import { BUTTON_TO_FINISH_MAP, CONFIRM_MESSAGES } from '../../../../../constants/constants.js';
import { selectUnhandledCriticalPressureErrorId } from '../../../../../services/selectors/errors/errorsBase.js';

const getPumpTitle = (group, pumpCount, selectedPumps) => {
  const pumpNames = Object.keys(selectedPumps)
    .filter((key) => selectedPumps[key] && key.startsWith(group))
    .sort(); // A1, A2 or B1, B2

  if (pumpCount === 2) {
    return group === 'A' ? `Насос A (${selectedPumps.A1})` : `Насос B (${selectedPumps.B1})`;
  }

  if (pumpCount === 4 && pumpNames.length) {
    return `Насос ${group} (${selectedPumps[`${group}1`]}, ${selectedPumps[`${group}2`]})`;
  }

  return `Насос ${group}`;
};

function MainGradientTab(props) {
  useResizeConstraints({
    panelApi: props.api,
    maxHeight: props.params.maxFloatingHeight,
    maxWidth: props.params.maxFloatingWidth,
    minHeight: props.params.minFloatingHeight,
    minWidth: props.params.minFloatingWidth,
  });

  const dispatch = useDispatch();
  const savedState = useSelector(selectMainGradientForm);
  const pumpCount = useSelector(selectPumpsCount);
  const {
    A1, B1, A2, B2,
  } = useSelector(selectChosenPumps);

  const {
    A1: {
      flowRate: flowRateA,
      pressure: pressureA,
      volume: volumeA,
      volumeMax: volumeMaxA,
      status: statusA,
      state: stateA,
    } = {},
    B1: {
      flowRate: flowRateB,
      pressure: pressureB,
      volume: volumeB,
      volumeMax: volumeMaxB,
      status: statusB,
      state: stateB,
    } = {},
  } = useSelector(selectPumpsStatusData);

  const [gradientProgram, setGradientProgram] = useState(null);
  const prevSupplyProgram = useRef(null);
  const [showGradientModal, setShowGradientModal] = useState(false);

  // per-pump active operation: 'fill' | 'drain' | 'releasePressure' | 'supply' | null
  const [activeOperationA, setActiveOperationA] = useState(null);
  const [activeOperationB, setActiveOperationB] = useState(null);

  const [isPumpASelected, setIsPumpASelected] = useState(true);
  const [isPumpBSelected, setIsPumpBSelected] = useState(true);
  const [isVolumeChecked, setIsVolumeChecked] = useState(false);
  const [volume, setVolume] = useState(null);
  const [fillFlowRate, setFillFlowRate] = useState(0);

  const [showReleaseA, setShowReleaseA] = useState(false);
  const [showReleaseB, setShowReleaseB] = useState(false);

  const isSoloAMode = isPumpASelected && !isPumpBSelected;
  const isSoloBMode = isPumpBSelected && !isPumpASelected;
  const isDuoMode = isPumpBSelected && isPumpASelected;
  const isPumpSelected = isPumpASelected || isPumpBSelected;

  const isFilling = activeOperationA === 'fill' || activeOperationB === 'fill';
  const isDraining = activeOperationA === 'drain' || activeOperationB === 'drain';
  const isSupplying = activeOperationA === 'supply' && activeOperationB === 'supply';

  const monoLockingOperations = ['fill', 'drain', 'supply']; // fill and drain for now are monolocking for backend reasons
  const isDuoLocked = isDuoMode && (activeOperationA !== null || activeOperationB !== null);
  const isMonoLocked = (isSoloAMode && monoLockingOperations.includes(activeOperationA))
        || (isSoloBMode && monoLockingOperations.includes(activeOperationB));

  const isModeLocked = isDuoLocked || isMonoLocked;
  const isFullLocked = activeOperationA !== null || activeOperationB !== null;

  const unhandledErrorId = useSelector(selectUnhandledCriticalPressureErrorId);

  console.log(unhandledErrorId, isFullLocked, isSupplying, unhandledErrorId);

  useEffect(() => {
    if (
      unhandledErrorId
          && pressureA === 0
          && pressureB === 0
          && activeOperationA === 'supply'
          && activeOperationB === 'supply'
    ) {
      console.warn('pump error reset');
      setActiveOperationA(null);
      setActiveOperationB(null);
      dispatch(errorsActions.markErrorHandled(unhandledErrorId));
    }
  }, [unhandledErrorId, pressureA, pressureB, activeOperationA, activeOperationB, dispatch]);

  // Reset operation on finish
  useEffect(() => {
    const finishState = BUTTON_TO_FINISH_MAP[activeOperationA];
    if (activeOperationA && finishState && stateA === finishState) setActiveOperationA(null);
  }, [activeOperationA, stateA]);

  useEffect(() => {
    const finishState = BUTTON_TO_FINISH_MAP[activeOperationB];
    if (activeOperationB && finishState && stateB === finishState) setActiveOperationB(null);
  }, [activeOperationB, stateB]);

  useEffect(() => {
    const canPumpAShown = activeOperationA === null || activeOperationA === 'releasePressure';
    const canPumpBShown = activeOperationB === null || activeOperationB === 'releasePressure';
    if (pressureA > 0 && canPumpAShown) {
      setShowReleaseA(true);
    } else {
      setShowReleaseA(false);
    }
    if (pressureB > 0 && canPumpBShown) {
      setShowReleaseB(true);
    } else {
      setShowReleaseB(false);
    }

    if (pressureA === 0) {
      setShowReleaseA(false);
      if (activeOperationA === 'releasePressure') {
        setActiveOperationA(null);
        onReleaseEnd('A');
      }
    }
    if (pressureB === 0) {
      setShowReleaseB(false);
      if (activeOperationB === 'releasePressure') {
        setActiveOperationB(null);
        onReleaseEnd('B');
      }
    }
  }, [pressureA, pressureB, activeOperationA, activeOperationB]);

  const {
    showConfirmModal,
    message,
    promptConfirm,
    handleConfirm,
    handleCancel,
  } = useConfirmation();

  // Load saved
  useEffect(() => {
    if (!savedState) return;
    setActiveOperationA(savedState.activeOperationA ?? null);
    setActiveOperationB(savedState.activeOperationB ?? null);
    setIsPumpASelected(savedState.isPumpAActive ?? true);
    setIsPumpBSelected(savedState.isPumpBActive ?? true);
    setIsVolumeChecked(savedState.isVolumeChecked ?? false);
    setVolume(savedState.volume ?? null);
    setFillFlowRate(savedState.fillFlowRate ?? 0);
    setGradientProgram(savedState.gradientProgram ?? null);
    prevSupplyProgram.current = savedState.gradientProgram ?? null;
  }, []);

  // Save on unmount
  useEffect(() => () => {
    dispatch(
      mainGradientActions.setFormState({
        activeOperationA,
        activeOperationB,
        isPumpAActive: isPumpASelected,
        isPumpBActive: isPumpBSelected,
        isVolumeChecked,
        volume,
        fillFlowRate,
        gradientProgram,
      }),
    );
  }, [
    activeOperationA,
    activeOperationB,
    isPumpASelected,
    isPumpBSelected,
    isVolumeChecked,
    volume,
    fillFlowRate,
    gradientProgram,
  ]);

  const handleShowProgModal = () => {
    if (activeOperationA === 'supply' || activeOperationB === 'supply') return;
    setShowGradientModal(true);
  };
  const handleCloseModal = () => setShowGradientModal(false);
  const handleDecline = () => {
    setGradientProgram(prevSupplyProgram.current);
    handleCloseModal();
  };

  const handleSubmit = ({ params }) => {
    setGradientProgram(params);
    prevSupplyProgram.current = params;
  };

  const passedGradient = useMemo(() => ({
    pumpMode: 'gradient',
    gradientProgram,
  }), [gradientProgram]);

  const handleButtonClick = (type) => {
    if (type === 'supply') {
      // always duo
      const next = (activeOperationA === 'supply' && activeOperationB === 'supply') ? null : 'supply';
      setActiveOperationA(next);
      setActiveOperationB(next);
    } else {
      // fill/drain: solo if only one pump selected, duo if both
      if (isPumpASelected && isPumpBSelected) {
        // duo: toggle both together
        const next = (activeOperationA === type && activeOperationB === type) ? null : type;
        setActiveOperationA(next);
        setActiveOperationB(next);
      } else if (isPumpASelected) {
        // solo A
        setActiveOperationA(activeOperationA === type ? null : type);
      } else {
        // solo B
        setActiveOperationB(activeOperationB === type ? null : type);
      }
    }

    const commonPayload = {
      fillFlowRate,
      pumpA: isPumpASelected,
      pumpB: isPumpBSelected,
    };

    const buttonConfig = {
      fill: {
        action: postGradientFillData,
        payload: {
          pumpMode: 'gradient',
          pumpFillOn: !isFilling,
          volume: isVolumeChecked ? volume : 0,
          ...commonPayload,
        },
      },
      drain: {
        action: postGradientDrainData,
        payload: {
          pumpMode: 'gradient',
          pumpDrainOn: !isDraining,
          volume: isVolumeChecked ? volume : 0,
          ...commonPayload,
        },
      },
      supply: {
        action: postGradientSupplyData,
        payload: {
          pumpSupplyOn: !(activeOperationA === 'supply' && activeOperationB === 'supply'),
          setPumpProg: {
            ...gradientProgram,
            pumpMode: 'gradient',
          },
        },
      },
    };

    const { action, payload } = buttonConfig[type];
    dispatch(action(payload));
  };

  const handleStop = async () => {
    const isConfirmed = await promptConfirm(CONFIRM_MESSAGES.STOP_PUMPS);
    if (!isConfirmed) return;

    dispatch(stopPump());
    if (activeOperationA === 'releasePressure') onReleaseEnd('A');
    if (activeOperationB === 'releasePressure') onReleaseEnd('B');
    setActiveOperationA(null);
    setActiveOperationB(null);
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;

    const isTryingToDisablePumpA = name === 'pumpA' && !checked;
    const isTryingToDisablePumpB = name === 'pumpB' && !checked;

    if (isTryingToDisablePumpA) {
      setIsPumpASelected(false);
      if (!isPumpBSelected && activeOperationB === null) {
        // Switch to B instead if allowed
        setIsPumpBSelected(true);
      }
      return;
    }

    if (isTryingToDisablePumpB) {
      setIsPumpBSelected(false);
      if (!isPumpASelected && activeOperationA === null) {
        // Switch to A instead
        setIsPumpASelected(true);
      }
      return;
    }

    const setters = {
      pumpA: setIsPumpASelected,
      pumpB: setIsPumpBSelected,
      volumeCheck: setIsVolumeChecked,
    };

    if (setters[name]) {
      setters[name](checked);
    } else {
      console.warn(`No setter found for checkbox "${name}"`);
    }
  };

  const handleIntegerChange = (e) => {
    const { name, value } = e.target;

    if (!isNonNegIntStrWithinLimits(value, 6)) return;

    const setters = {
      volume: setVolume,
    };

    if (setters[name]) {
      setters[name](value === '' ? null : Number(value));
    } else {
      console.warn(`No setter found for input "${name}"`);
    }
  };

  const handleSelectChange = (e) => {
    const { name, value } = e.target;

    const setters = {
      fillFlowRate: setFillFlowRate,
    };

    if (setters[name]) {
      setters[name](Number(value));
    } else {
      console.warn(`No setter found for select "${name}"`);
    }
  };

  const lastACheck = useRef(null);
  const lastBCheck = useRef(null);

  const onReleaseEnd = (endedOn) => {
    const canReset = !(monoLockingOperations.includes(activeOperationA)
        || monoLockingOperations.includes(activeOperationB));

    if (endedOn === 'A' && lastACheck.current) {
      if (canReset) setIsPumpASelected(lastACheck.current);
      lastACheck.current = null;
    }
    if (endedOn === 'B' && lastBCheck.current) {
      if (canReset) setIsPumpBSelected(lastBCheck.current);
      lastBCheck.current = null;
    }
  };

  const handleReleasePressureA = () => {
    const willRelease = activeOperationA !== 'releasePressure';
    dispatch(
      releasePressure({ pumpMode: 'gradient', pumpAReleasePressure: willRelease }),
    );
    setActiveOperationA(willRelease ? 'releasePressure' : null);
    if (isPumpASelected) {
      lastACheck.current = true;
      setIsPumpASelected(false);
    }
    if (!willRelease) onReleaseEnd('A');
  };

  const handleReleasePressureB = () => {
    const willRelease = activeOperationB !== 'releasePressure';
    dispatch(
      releasePressure({ pumpMode: 'gradient', pumpBReleasePressure: willRelease }),
    );
    setActiveOperationB(willRelease ? 'releasePressure' : null);
    if (isPumpBSelected) {
      lastBCheck.current = true;
      setIsPumpBSelected(false);
    }
    if (!willRelease) onReleaseEnd('B');
  };

  return (
    <>
      <ConfirmationModal
        show={showConfirmModal}
        message={message}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
      <GradientModal
        show={showGradientModal}
        handleClose={handleCloseModal}
        handleSubmit={handleSubmit}
        handleDecline={handleDecline}
        previousGradientProgram={prevSupplyProgram.current}
        parentId="mainGradientForm"
        key="mainGradientForm"
      />

      <Form style={{ height: '100%', overflow: 'auto' }}>
        <Container>
          <div className="mb-3 mt-2">
            <Row className="d-flex justify-content-between g-0 gap-2">
              <Col>
                <div className="p-3 mb-3 border rounded" style={{ maxWidth: '350px' }}>
                  <PumpStatusBlock
                      title={getPumpTitle('A', pumpCount, { A1, A2 })}
                      flowRate={flowRateA}
                      pressure={pressureA}
                      volume={volumeA}
                      volumeMax={volumeMaxA}
                      status={statusA}
                      state={stateA}
                      showReleaseButton={showReleaseA}
                      highlightRelease={activeOperationA === 'releasePressure'}
                      onReleasePressure={handleReleasePressureA}
                      wraperStyle={{ width: '100%', maxWidth: '330px' }}
                    />
                </div>
              </Col>
              <Col>
                <div className="p-3 mb-3 border rounded" style={{ maxWidth: '350px' }}>
                  <PumpStatusBlock
                      title={getPumpTitle('B', pumpCount, { B1, B2 })}
                      flowRate={flowRateB}
                      pressure={pressureB}
                      volume={volumeB}
                      volumeMax={volumeMaxB}
                      status={statusB}
                      state={stateB}
                      showReleaseButton={showReleaseB}
                      highlightRelease={activeOperationB === 'releasePressure'}
                      onReleasePressure={handleReleasePressureB}
                      wraperStyle={{ width: '100%', maxWidth: '330px' }}
                    />
                </div>
              </Col>
            </Row>
          </div>

          <div
            className="border rounded p-3 mb-3"
            style={{ minWidth: '310px' }}
          >
            <Row className="mb-2">
              <Col>
                Операция
              </Col>
            </Row>
            <Row className="d-flex justify-content-start g-0 gap-2">
              <Col xs="auto">
                <Button
                  size="sm"
                  style={{ height: '38px', minWidth: '92px' }}
                  onClick={() => handleButtonClick('fill')}
                  active={isFilling}
                  disabled={(isModeLocked && !isFilling) || !isPumpSelected}
                >
                                  Набор
                </Button>
              </Col>
              <Col xs="auto">
                <CustomCheckboxGroup
                  label="Насос А"
                  labelStyle={{ minWidth: '60px' }}
                  groupClassName=""
                  labelClassName={activeOperationA !== null ? 'bg-primary-subtle' : ''}
                  name="pumpA"
                  onChange={handleCheckboxChange}
                  checked={isPumpASelected}
                  disabled={activeOperationA !== null || monoLockingOperations.includes(activeOperationB)}
                />
              </Col>

              <Col xs="auto">
                <CustomCheckboxInput
                  checkboxName="volumeCheck"
                  checkboxLabel="Объем"
                  checkboxStyle={{ minWidth: '60px' }}
                  checked={isVolumeChecked}
                  disabled={isModeLocked}
                  onCheckboxChange={handleCheckboxChange}

                  inputName="volume"
                  inputLabel="мкл"
                  inputLabelStyle={{ minWidth: '50px' }}
                  value={(isVolumeChecked ? volume : '') ?? ''}
                  onInputChange={handleIntegerChange}
                  inputDisabled={isModeLocked || !isVolumeChecked}
                  inputReadOnly={isModeLocked || !isVolumeChecked}
                  inputStyle={{ minWidth: '60px', maxWidth: '100px' }}
                />
              </Col>

            </Row>
            <Row className="d-flex justify-content-start g-0 gap-2">
              <Col xs="auto">
                <Button
                  size="sm"
                  style={{ height: '38px', minWidth: '92px' }}
                  onClick={() => handleButtonClick('drain')}
                  active={isDraining}
                  disabled={(isModeLocked && !isDraining) || !isPumpSelected}
                >
                                  Слив
                </Button>

              </Col>
              <Col xs="auto">
                <CustomCheckboxGroup
                  label="Насос B"
                  labelStyle={{ minWidth: '60px' }}
                  name="pumpB"
                  groupClassName=""
                  labelClassName={activeOperationB !== null ? 'bg-primary-subtle' : ''}
                  onChange={handleCheckboxChange}
                  checked={isPumpBSelected}
                  disabled={activeOperationB !== null || monoLockingOperations.includes(activeOperationA)}
                />
              </Col>

              <Col xs="auto">
                <CustomSelectGroup
                  label="Скорость набора"
                  labelStyle={{ minWidth: '80px' }}
                  options={[
                      <option key="0" value="0">Высокая (20 мл/мин)</option>,
                      <option key="1" value="1">Средняя (10 мл/мин)</option>,
                      <option key="2" value="2">Низкая (5 мл/мин)</option>,
                      <option key="3" value="3">2 мл/мин</option>,
                      <option key="4" value="4">1 мл/мин</option>,
                    ]}
                  name="fillFlowRate"
                  onChange={handleSelectChange}
                  value={fillFlowRate}
                  disabled={isModeLocked}
                />
              </Col>
            </Row>
          </div>

          <div
            className="border rounded p-3 mb-3"
            style={{ minWidth: '310px' }}
          >
            <Row className="mb-2">
              <Col xs="auto">
                <Button
                  size="sm"
                  style={{ height: '38px', minWidth: '92px' }}
                  onClick={() => handleButtonClick('supply')}
                  active={isSupplying}
                  disabled={isFullLocked && !isSupplying}
                >
                                  Подача
                </Button>
              </Col>
              <Col xs="auto">
                <Button
                  size="sm"
                  style={{ height: '38px', minWidth: '92px' }}
                  onClick={handleShowProgModal}
                  disabled={isSupplying}
                >
                                  Программа
                </Button>
              </Col>
              <Col xs="auto">
                <Button
                  size="sm"
                  style={{ height: '38px', minWidth: '92px' }}
                  onClick={handleStop}
                >
                                  Остановка
                </Button>
              </Col>

            </Row>
            <Row>
              <PumpTable
                handleClick={handleShowProgModal}
                passedData={passedGradient}
              />
            </Row>
          </div>

        </Container>
      </Form>
    </>
  );
}

export default MainGradientTab;
