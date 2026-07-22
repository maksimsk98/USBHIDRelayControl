import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import { useDispatch, useSelector } from 'react-redux';

import { useEffect } from 'react';
import {
  chromaMiscActions, selectChosenThermostat, selectIsTabInitialized,
} from '../../../services/reduxImportDispatcher.js';
import { ConfirmationModal, useConfirmation } from '../../../hooks/useConfirmation.js';
import { normalizeDecimalInput } from '../../../utils/validation.js';

function ThermostatInput({ parentId, thermostatTemp, setThermostatTemp }) {
  const dispatch = useDispatch();

  const thermostat = useSelector(selectChosenThermostat);
  const isInitialized = useSelector((state) => selectIsTabInitialized(state, parentId));

  useEffect(() => {
    if (!thermostat && !isInitialized) {
      console.log(`ThermostatInput: thermostat ${isInitialized ? 'is' : 'is not '} initialized, resetting value to null`);
      setThermostatTemp(null);
      dispatch(chromaMiscActions.setThermostatTemp({ id: parentId, newThermostatTemp: null }));
    }
  }, [thermostat, isInitialized]);

  const {
    showConfirmModal,
    message,
    promptConfirm,
    handleConfirm,
    handleCancel,
  } = useConfirmation();

  const handleThermostatChange = (e) => {
    const value = normalizeDecimalInput(e);
    const numberValue = value === '' ? null : Number(value);
    if (!isNaN(numberValue)) {
      setThermostatTemp(numberValue);
    }
  };

  const handleThermostatBlur = async (event) => {
    let isConfirmed = true;
    if (!thermostat) isConfirmed = await promptConfirm('Термостат не подключен. Параметер доступен только для создания метода. Сохранить?');

    if (!isConfirmed) return setThermostatTemp(null);

    const newValue = event.target.value;
    const newThermostatTemp = newValue === '' ? null : Number(newValue);
    dispatch(chromaMiscActions.setThermostatTemp({ id: parentId, newThermostatTemp }));
  };

  return (
    <>
      <Form.Group className="mb-1 flex-nowrap">
        <Form.Label>Термостат</Form.Label>
        <InputGroup className="mb-1" size="sm">
          <InputGroup.Text>Температура</InputGroup.Text>
          <Form.Control
            maxLength="3"
            value={thermostatTemp ?? ''}
            onChange={handleThermostatChange}
            onBlur={handleThermostatBlur}
          />
          <InputGroup.Text style={{ padding: '1px 2px' }}>°C</InputGroup.Text>
        </InputGroup>
      </Form.Group>

      <ConfirmationModal
        show={showConfirmModal}
        message={message}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>

  );
}

export default ThermostatInput;
