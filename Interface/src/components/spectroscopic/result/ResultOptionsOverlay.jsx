import React, {
  useState, useRef, useCallback, useEffect,
} from 'react';
import { Overlay, Popover, Button } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import CustomInputGroup from '../../custom/CustomInputGroup';
import { floatSetter } from '../../../utils/setters';
import { selectSpectroFactor, selectSpectroThreshold } from '../../../services/reduxImportDispatcher';
import { changeSpectroSmoothingThunk } from '../../../services/thunks/spectroMisc/spectroMiscThunks';
import { normalizeDecimalInput } from '../../../utils/validation';

function ResultOptionsOverlay({
  disabled,
  label = 'Настройки',
  tabId,
  hasSmoothing,
}) {
  const dispatch = useDispatch();

  const [show, setShow] = useState(false);
  const [applyMode, setApplyMode] = useState(false);

  const storedThreshold = useSelector((state) => selectSpectroThreshold(state, tabId));
  const storedFactor = useSelector((state) => selectSpectroFactor(state, tabId));

  useEffect(() => {
    if (show) {
      setThreshold(storedThreshold);
      setFactor(storedFactor);
    }
  }, [show, storedThreshold, storedFactor]);

  const [threshold, setThreshold] = useState(storedThreshold);
  const [factor, setFactor] = useState(storedFactor);

  const target = useRef(null);

  const resetLocalStates = useCallback(() => {
    setThreshold(storedThreshold);
    setFactor(storedFactor);
  }, [storedThreshold, storedFactor]);

  const handleThresholdChange = useCallback((e) => {
    setThreshold(normalizeDecimalInput(e));
  }, []);

  const handleFactorChange = useCallback((e) => {
    const { name } = e.target;

    const value = normalizeDecimalInput(e);

    floatSetter({
      name,
      value,
      rangesMap: {
        factor: [4, 2],
      },
      setterDispatch: {
        factor: setFactor,
      },
      formatConfig: {
        ifInvalidFormatNull: false,
        onEmptyValue: '',
      },
    });
  }, []);

  const doShow = useCallback(() => {
    setShow(true);
    setApplyMode(true);
  }, []);

  const doHide = useCallback(() => {
    setShow(false);
    setApplyMode(false);
  }, []);

  const handleButtonClick = useCallback(() => {
    if (!show) {
      doShow();
      return;
    }

    const numericThreshold = Number(threshold);
    const numericFactor = Number(factor);
    if (numericThreshold === storedThreshold && numericFactor === storedFactor) {
      doHide();
      return;
    }

    dispatch(
      changeSpectroSmoothingThunk({
        tabId,
        isChecked: hasSmoothing,
        threshold: numericThreshold,
        factor: numericFactor,
      }),
    );

    doHide();
  }, [show, threshold, factor]);

  const handleCancel = useCallback(() => {
    resetLocalStates();

    doHide();
  }, [resetLocalStates, doHide]);

  if (disabled) {
    return null;
  }

  return (
    <>
      <Button
        style={{ width: '100%' }}
        ref={target}
        size="sm"
        disabled={disabled}
        onClick={handleButtonClick}
        variant={applyMode ? 'success' : 'primary'}
      >
        {applyMode ? 'Применить' : label}
      </Button>

      <Overlay
        target={target.current}
        show={show}
        rootClose
        onHide={handleCancel}
      >
        <Popover>
          <Popover.Body>

            <CustomInputGroup
              label="Порог"
              value={threshold}
              name="threshold"
              onChange={handleThresholdChange}
              inputStyle={{ width: '120px', minWidth: '55px' }}
              size="sm"
              min={0}
              max={9}
              maxLength={1}
            />

            <CustomInputGroup
              label="Фактор"
              name="factor"
              value={factor}
              onChange={handleFactorChange}
              inputStyle={{ width: '120px', minWidth: '55px' }}
              size="sm"
              isFloat
            />

          </Popover.Body>
        </Popover>
      </Overlay>
    </>
  );
}

export default ResultOptionsOverlay;
