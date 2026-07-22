import { useEffect, useState } from 'react';
import { Modal, Button } from 'react-bootstrap';

import { useDispatch, useSelector } from 'react-redux';
import CustomCheckboxGroup from '../../../../custom/CustomCheckboxGroup';
import CustomInputGroup from '../../../../custom/CustomInputGroup';
import { postPumpParams } from '../../../../../services/thunks/nodes/nodesControlThunks';
import { selectPumpParams } from '../../../../../services/reduxImportDispatcher';
import { PUMP_RANGES } from '../../../../../constants/constants';
import { floatSetter } from '../../../../../utils/setters';
import { normalizeDecimalInput } from '../../../../../utils/validation';

function PumpParamsModal({ show, onClose }) {
  const dispatch = useDispatch();
  const {
    automaticReleasing: storedAutomaticReleasing,
    maxPressureDischarge: storedMaxPressureDischarge,
    maxPressureWork: storedMaxPressureWork,
    minPressureWork: storedMinPressureWork,
    releasingFlowRate: storedReleasingFlowRate,
  } = useSelector(selectPumpParams);

  const [maxPressureWork, setMaxPressureWork] = useState(storedMaxPressureWork);
  const [minPressureWork, setMinPressureWork] = useState(storedMinPressureWork);
  const [maxPressureDischarge, setMaxPressureDischarge] = useState(storedMaxPressureDischarge);
  const [automaticReleasing, setAutomaticReleasing] = useState(storedAutomaticReleasing);
  const [releasingFlowRate, setReleasingFlowRate] = useState(storedReleasingFlowRate);

  useEffect(() => {
    setMaxPressureWork(storedMaxPressureWork);
    setMinPressureWork(storedMinPressureWork);
    setMaxPressureDischarge(storedMaxPressureDischarge);
    setAutomaticReleasing(storedAutomaticReleasing);
    setReleasingFlowRate(storedReleasingFlowRate);
  }, [storedAutomaticReleasing, storedMaxPressureDischarge, storedMaxPressureWork, storedMinPressureWork, storedReleasingFlowRate]);

  const handleChangeInput = (event) => {
    const { name } = event.target;
    const value = normalizeDecimalInput(event);

    const rangesMap = {};
    ['maxPressureWork', 'minPressureWork', 'maxPressureDischarge', 'releasingFlowRate']
      .forEach((key) => {
        rangesMap[key] = [null, null, ...PUMP_RANGES[key]];
      });

    floatSetter({
      name,
      value,
      rangesMap,
      setterDispatch: {
        maxPressureWork: setMaxPressureWork,
        minPressureWork: setMinPressureWork,
        maxPressureDischarge: setMaxPressureDischarge,
        releasingFlowRate: setReleasingFlowRate,
      },
      formatConfig: {
        ifEmptyNull: true,
        ifInvalidFormatNull: false,
      },
    });
  };

  const handleChangeCheckbox = (event) => {
    setAutomaticReleasing(event.target.checked);
  };

  const handleSubmit = () => {
    const params = {
      maxPressureWork: Number(maxPressureWork),
      minPressureWork: Number(minPressureWork),
      maxPressureDischarge: Number(maxPressureDischarge),
      automaticReleasing: Number(automaticReleasing),
      releasingFlowRate: Number(releasingFlowRate),
    };

    dispatch(postPumpParams(params));
    onClose();
  };

  return (
    <Modal show={show} onHide={onClose} backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title style={{ fontSize: '18px' }}>
          Параметры работы насоса
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <CustomInputGroup
          label="Верхний предел при подаче"
          labelStyle={{ minWidth: '235px' }}
          value={maxPressureWork ?? ''}
          unit="МПа"
          name="maxPressureWork"
          onChange={handleChangeInput}
        />
        <CustomInputGroup
          label="Нижний предел при подаче"
          labelStyle={{ minWidth: '235px' }}
          value={minPressureWork ?? ''}
          unit="МПа"
          name="minPressureWork"
          onChange={handleChangeInput}
        />
        <CustomInputGroup
          label="Верхний предел при сливе"
          labelStyle={{ minWidth: '235px' }}
          value={maxPressureDischarge ?? ''}
          unit="МПа"
          name="maxPressureDischarge"
          onChange={handleChangeInput}
        />
        <CustomCheckboxGroup
          label="Автоматический сброс при превышении"
          checked={automaticReleasing}
          name="automaticReleasing"
          onChange={handleChangeCheckbox}
          leftLabel
        />
        <CustomInputGroup
          label="Скорость при сбросе"
          labelStyle={{ minWidth: '235px' }}
          value={releasingFlowRate ?? ''}
          unit="мкл/мин"
          name="releasingFlowRate"
          onChange={handleChangeInput}
        />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={handleSubmit}>
          Ок
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Отмена
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default PumpParamsModal;
