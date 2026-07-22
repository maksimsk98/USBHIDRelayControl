import { useDispatch, useSelector } from 'react-redux';

import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';

import { useEffect } from 'react';
import IsocratModal from './IsocratModal.jsx';
import GradientModal from './GradientModal.jsx';

import { pumpProgramActions, selectPumpsCount, selectEffectiveDetectorType, selectIsTabInitialized, selectWithoutControl } from '../../../services/reduxImportDispatcher.js';

import { stopPump } from '../../../services/thunks/nodes/nodesControlThunks.js';
import { DETECTOR_TYPES } from '../../../constants/constants.js';
import ThermostatInput from './ThermostatInput.jsx';
import { ConfirmationModal, useConfirmation } from '../../../hooks/useConfirmation.js';

function PumpParameters(props) {
  const {
    parentId,
    setThermostatTemp,
    showIsocrat,
    handleParamClick,
    handleIsocratClose,
    showGradient,
    handleGradientClose,
    thermostatTemp,
    storedPumpMode,
    toggleParamModal,
  } = props;
  const dispatch = useDispatch();

  const detectorType = useSelector((state) => selectEffectiveDetectorType(state, parentId ));

  const withoutControl = useSelector(selectWithoutControl);
  const isInitialized = useSelector(state => selectIsTabInitialized(state, parentId))
  const suppressControlElements = withoutControl && !isInitialized

  const pumpsCount = useSelector(selectPumpsCount);
  const isSinglePump = pumpsCount === 1;

  const {
    showConfirmModal,
    message,
    promptConfirm,
    handleConfirm,
    handleCancel,
  } = useConfirmation();

  useEffect(() => {
    if (suppressControlElements) {
      dispatch(pumpProgramActions.changePumpMode({ chromoId: parentId, mode: 'none' }));
    }
  }, [detectorType]);

  const handleSelectChange = (event) => {
    const { value } = event.target;
    dispatch(pumpProgramActions.changePumpMode({ chromoId: parentId, mode: value }));
    toggleParamModal(value);
  };

  const handleStopPumps = async () => {
    let isConfirmed = true;
    isConfirmed = await promptConfirm('Остановить насосы?');
    if (isConfirmed) dispatch(stopPump());
  };

  const handleGradientSubmit = (args) => {
    dispatch(pumpProgramActions.updateGradientModalParams(args));
  };

  const handleGradientDecline = () => {
    handleGradientClose();
  };

  return (
    <div style={{ width: '195px' }} className="mb-2">
      {/* modals */}
      <IsocratModal
        show={showIsocrat}
        handleClose={handleIsocratClose}
        parentId={parentId}
      />
      <GradientModal
        show={showGradient}
        handleSubmit={handleGradientSubmit}
        handleClose={handleGradientClose}
        handleDecline={handleGradientDecline}
        parentId={parentId}
        key={parentId}
      />

      <ConfirmationModal
        show={showConfirmModal}
        message={message}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
      {/* modals end */}

      {!suppressControlElements && (
        <>
          <Form.Group className="mb-1">
            <Form.Label>Элюирование</Form.Label>
            <Form.Select value={storedPumpMode} onChange={handleSelectChange} size="sm">
              <option value="isocrat">Изократическое</option>
              <option value="gradient">Градиентное</option>
              <option value="none">Не использовать</option>
            </Form.Select>
          </Form.Group>
          <div className="d-flex justify-content-between mb-2">
            <Button variant="secondary" size="sm" onClick={handleParamClick} disabled={storedPumpMode === 'none'}>Параметры</Button>
            <Button variant="secondary" size="sm" onClick={handleStopPumps}>Остановить</Button>
          </div>

          <ThermostatInput
            parentId={parentId}
            thermostatTemp={thermostatTemp}
            setThermostatTemp={setThermostatTemp}
          />
        </>
      )}

    </div>
  );
}

export default PumpParameters;
