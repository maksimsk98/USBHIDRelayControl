import React, { useEffect, useState } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';

import CustomInputGroup from '../../../custom/CustomInputGroup';
import { formatFloatStr, normalizeDecimalInput } from '../../../../utils/validation';
import { INVALID_FORMAT } from '../../../../constants/constants';
import { selectActiveTabCalibration } from '../../../../services/reduxImportDispatcher';
import { selectCalibConcConcentration, selectCalibConcConcentrationUnits, selectCalibConcStandardName } from '../../../../services/selectors/calibConc/calibConcBase';
import { fetchCalibConcStandardThunk, setStandardConcentrationThunk } from '../../../../services/thunks/calibConc/calibConcThunks';
import { calibMetaActions } from '../../../../services/slices/calibMetaSlice';

function ConcentrationParamsModal({ tabId, show, onClose }) {
  const dispatch = useDispatch();

  const calibName = useSelector(selectActiveTabCalibration);

  const standardName = useSelector((state) => (calibName ? selectCalibConcStandardName(state, calibName) : null));

  const storedConcentration = useSelector((state) => (calibName ? selectCalibConcConcentration(state, calibName) : null));

  const unit = useSelector((state) => (calibName ? selectCalibConcConcentrationUnits(state, calibName) : null));

  const [concentration, setConcentration] = useState('');

  useEffect(() => {
    if (!show) return;

    dispatch(fetchCalibConcStandardThunk());
  }, [show, dispatch]);

  useEffect(() => {
    if (!show) return;
    setConcentration(
      storedConcentration != null ? String(storedConcentration) : '',
    );
  }, [show, storedConcentration]);

  const handleConcentrationChange = (e) => {
    const formatted = formatFloatStr(normalizeDecimalInput(e), {
      maxDigits: 10,
      maxDecimals: 6,
      ifEmptyNull: false,
      ifInvalidFormatNull: false,
    });

    if (formatted === INVALID_FORMAT) return;
    setConcentration(formatted);
  };

  const handleOk = async () => {
    const numeric = Number(concentration);

    if (!Number.isFinite(numeric)) {
      // можно позже воткнуть errorsActions
      return;
    }

    console.log('numeric', numeric);

    await dispatch(setStandardConcentrationThunk());

    onClose();
  };

  const handleBlur = (e) => {
    const numeric = Number(concentration);

    // Only dispatch if we have a valid number
    if (Number.isFinite(numeric) && numeric !== storedConcentration) {
      dispatch(calibMetaActions.setConcentration({
        calibName,
        value: numeric,
      }));
    }
  };

  /* styles — aligned with FoldersModal */
  const GROUP_STYLE = { flexWrap: 'nowrap', width: '100%' };
  const LABEL_STYLE = { flex: '0 0 140px', justifyContent: 'flex-start' };
  const INPUT_STYLE = { flex: '1 1 auto', minWidth: 0 };
  const UNIT_STYLE = { flex: '0 0 80px', textAlign: 'center', opacity: 0.8 };

  if (!show) return null;

  return (
    <Modal show={show} onHide={onClose} backdrop="static" centered>
      <Modal.Header closeButton>
        <Modal.Title>Параметры расчёта концентраций</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <CustomInputGroup
          label="Стандарт:"
          value={standardName}
          readOnly
          groupClassName="mb-3"
          groupStyle={GROUP_STYLE}
          labelStyle={LABEL_STYLE}
          inputStyle={INPUT_STYLE}
        />

        <CustomInputGroup
          label="Концентрация:"
          value={concentration}
          onChange={handleConcentrationChange}
          onBlur={handleBlur}
          groupStyle={GROUP_STYLE}
          labelStyle={LABEL_STYLE}
          inputStyle={INPUT_STYLE}
          unitStyle={UNIT_STYLE}
          unit={unit}
        />
      </Modal.Body>

      <Modal.Footer>
        <Button variant="primary" onClick={handleOk}>
          OK
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Отмена
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default ConcentrationParamsModal;
