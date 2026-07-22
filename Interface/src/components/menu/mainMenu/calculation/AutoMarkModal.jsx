import React, { useEffect, useState } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import CustomInputGroup from '../../../custom/CustomInputGroup';
import { formatFloatStr, normalizeDecimalInput } from '../../../../utils/validation';
import { autoMarkPeaks } from '../../../../services/thunks/peaks/peaksThunks';
import {
  peaksActions, selectActiveTab, selectAutomarkParams,
} from '../../../../services/reduxImportDispatcher';
import { INVALID_FORMAT } from '../../../../constants/constants';
import { DEFAULT_AUTO_MARK_PARAMS } from '../../../../constants/defaultParams';

function AutoMarkModal({ show, onClose, noPost }) {
  const dispatch = useDispatch();
  const activeTab = useSelector(selectActiveTab);

  const {
    markStart: storedMarkStart,
    minHeight: storedMinHeight,
    minHalfWidth: storedMinHalfWidth,
  } = useSelector((state) => selectAutomarkParams(state, activeTab)) ?? {};

  const [markStart, setMarkStart] = useState(DEFAULT_AUTO_MARK_PARAMS.markStart);
  const [minHeight, setMinHeight] = useState(DEFAULT_AUTO_MARK_PARAMS.minHeight);
  const [minHalfWidth, setMinHalfWidth] = useState(DEFAULT_AUTO_MARK_PARAMS.minHalfWidth);

  useEffect(() => {
    setMarkStart(storedMarkStart ?? DEFAULT_AUTO_MARK_PARAMS.markStart);
    setMinHeight(storedMinHeight ?? DEFAULT_AUTO_MARK_PARAMS.minHeight);
    setMinHalfWidth(storedMinHalfWidth ?? DEFAULT_AUTO_MARK_PARAMS.minHalfWidth);
  }, [
    show,
    storedMarkStart,
    storedMinHeight,
    storedMinHalfWidth,
  ]);

  const configMap = {
    markStart: { maxDigits: 4, maxDecimals: 2, setter: setMarkStart },
    minHeight: { maxDigits: 10, maxDecimals: 8, setter: setMinHeight },
    minHalfWidth: { maxDigits: 4, maxDecimals: 2, setter: setMinHalfWidth },
  };

  const handleChangeInput = (event) => {
    const { name } = event.target;
    const value = normalizeDecimalInput(event);

    const config = configMap[name];
    if (!config) {
      console.warn(`No config for input field: ${name}`);
      return;
    }

    const formattedValue = formatFloatStr(value, {
      maxDigits: config.maxDigits,
      maxDecimals: config.maxDecimals,
      ifEmptyNull: true,
      ifInvalidFormatNull: false,
    });

    if (formattedValue === INVALID_FORMAT) return;

    config.setter(formattedValue);
  };

  const handleSubmit = () => {
    const params = {
      markStart: Number(markStart),
      minHeight: Number(minHeight),
      minHalfWidth: Number(minHalfWidth),
    };
    dispatch(peaksActions.setPeaksParams({ tabId: activeTab, params }));
    if (!noPost) dispatch(autoMarkPeaks(params));

    onClose();
  };

  if (!show) return null;

  return (
    <Modal show={show} onHide={onClose} backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title style={{ fontSize: '18px' }}>Параметры автоматической разметки</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <CustomInputGroup
          label="Начало разметки"
          labelStyle={{ minWidth: '230px' }}
          value={markStart}
          unit="мин."
          name="markStart"
          onChange={handleChangeInput}
        />
        <CustomInputGroup
          label="Минимальная высота"
          labelStyle={{ minWidth: '230px' }}
          value={minHeight}
          name="minHeight"
          onChange={handleChangeInput}
        />
        <CustomInputGroup
          label="Минимальная полуширина"
          labelStyle={{ minWidth: '230px' }}
          value={minHalfWidth}
          unit="сек."
          name="minHalfWidth"
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

export default AutoMarkModal;
