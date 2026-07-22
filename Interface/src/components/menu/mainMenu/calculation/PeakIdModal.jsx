import { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, Modal, ModalBody, ModalFooter, ModalHeader,
} from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import CustomCheckboxGroup from '../../../custom/CustomCheckboxGroup';
import CustomInputGroup from '../../../custom/CustomInputGroup';
import { normalizeDecimalInput } from '../../../../utils/validation';
import { updatePeakIdThunk } from '../../../../services/thunks/chromaMisc/chromaMiscThunks';
import { selectPeakIdParamsById } from '../../../../services/selectors/chromaMisc/chromaMiscBase';
import { clampingBlur, intSetter } from '../../../../utils/setters';

function PeakIdModal({
  show, activeTab, onClose, noPost,
}) {
  const dispatch = useDispatch();

  const {
    useRelativeTimes: storedUseRelativeTimes = true,
    maxRelation: storedMaxRelation = 15,
    searchWindow: storedSearchWindow = 2,
  } = useSelector((state) => selectPeakIdParamsById(state, activeTab));

  const [useRelativeTimes, setUseRelativeTimes] = useState(storedUseRelativeTimes);
  const [maxRelation, setMaxRelation] = useState(storedMaxRelation);
  const [searchWindow, setSearchWindow] = useState(storedSearchWindow);

  const resetLocalState = useCallback(() => {
    setUseRelativeTimes(storedUseRelativeTimes);
    setMaxRelation(storedMaxRelation);
    setSearchWindow(storedSearchWindow);
  }, [
    storedUseRelativeTimes,
    storedMaxRelation,
    storedSearchWindow,
  ]);

  useEffect(() => {
    resetLocalState();
  }, [resetLocalState, show]);

  const rangesMap = {
    maxRelation: [2, 1, 40],
    searchWindow: [2, 1, 20],
  };

  const setterDispatch = {
    maxRelation: setMaxRelation,
    searchWindow: setSearchWindow,
  };

  const handleChangeInputInteger = (event) => {
    const { name } = event.target;
    const value = normalizeDecimalInput(event);

    intSetter({
      name,
      value,
      rangesMap,
      setterDispatch,
    });
  };

  const handleBlur = (event) => {
    const { name, value } = event.target;
    clampingBlur({
      name,
      value,
      rangesMap,
      setterDispatch,
    });
  };

  const handleSubmit = () => {
    const params = {
      useRelativeTimes,
      maxRelation: maxRelation == null ? null : Number(maxRelation),
      searchWindow: searchWindow == null ? null : Number(searchWindow),
    };
    dispatch(updatePeakIdThunk({
      tabId: activeTab,
      params,
      noPost,
    }));

    onClose();
  };

  return (
    <Modal show={show} onHide={onClose}>
      <ModalHeader closeButton>
        <Modal.Title>Параметры идентификации пиков</Modal.Title>
      </ModalHeader>
      <ModalBody>
        <Card>
          <Card.Body>
            <CustomCheckboxGroup
              label="Использовать относительные времена удерживания"
              checked={useRelativeTimes}
              onChange={(e) => setUseRelativeTimes(e.target.checked)}
              size="sm"
            />
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <CustomInputGroup
              label="Максимальное отношение времен"
              value={maxRelation ?? ''}
              name="maxRelation"
              onChange={handleChangeInputInteger}
              onBlur={handleBlur}
              unit="%"
              size="sm"
              labelStyle={{ width: '250px' }}
              inputStyle={{ width: '80px' }}
              unitStyle={{ width: '30px' }}
              disabled={!useRelativeTimes}
            />
            <CustomInputGroup
              label="Окно поиска пика"
              value={searchWindow ?? ''}
              name="searchWindow"
              onChange={handleChangeInputInteger}
              onBlur={handleBlur}
              unit="%"
              size="sm"
              groupClassName=""
              labelStyle={{ width: '250px' }}
              inputStyle={{ width: '80px' }}
              unitStyle={{ width: '30px' }}
            />
          </Card.Body>
        </Card>
      </ModalBody>
      <ModalFooter>
        <Button
          style={{ width: '100px' }}
          onClick={handleSubmit}
        >
          Ок
        </Button>
        <Button
          variant="secondary"
          style={{ width: '100px' }}
          onClick={onClose}
        >
          Отмена
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default PeakIdModal;
