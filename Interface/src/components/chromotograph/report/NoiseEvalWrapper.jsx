import React, { useState, useRef, useEffect } from 'react';
import {
  Form, Overlay, Popover, Button,
} from 'react-bootstrap';
import { useSelector } from 'react-redux';
import { selectLastStepTo, selectNoiseEvalParams } from '../../../services/reduxImportDispatcher';
import { clampingBlur, floatSetter } from '../../../utils/setters';
import { confirmNoiseEvalThunk } from '../../../services/thunks/report/reportThunks';
import { normalizeDecimalInput } from '../../../utils/validation';

export function makeNoiseEvalHandler({
  handleCheckboxChange,
  dispatch,
  parentId,
}) {
  return ({ name, checked, params }) => {
    // checkbox state
    handleCheckboxChange({
      target: { name, checked },
    });

    // only meaningful action
    if (checked && params) {
      dispatch(
        confirmNoiseEvalThunk({
          parentId,
          params,
        }),
      );
    }
  };
}

export function NoiseEvalWrapper({
  checked, onChange, parentId, disabled,
}) {
  const target = useRef(null);

  const noiseEvalParams = useSelector((state) => selectNoiseEvalParams(state, parentId));

  const maxToSec = useSelector((state) => selectLastStepTo(state, { tabId: parentId }));

  const maxTo = maxToSec / 60;

  const [show, setShow] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    if (noiseEvalParams) {
      setFrom(noiseEvalParams.from ?? '');
      setTo(noiseEvalParams.to ?? '');
    }
  }, [noiseEvalParams]);

  const toggle = (e) => {
    if (e.target.checked) {
      setShow(true);
    } else {
      onChange({ name: 'noiseEval', checked: false });
    }
  };

  // ----- numeric -----
  const numFrom = Number(from);
  const numTo = Number(to);

  // ---------- VALIDATION ----------

  let fromError = false;
  let toError = false;

  const fromEntered = from !== '' && from != null;
  const toEntered = to !== '' && to != null;
  const bothEntered = fromEntered && toEntered;

  const isValidNumbers = bothEntered
    && Number.isFinite(numFrom)
    && Number.isFinite(numTo);

  /*   console.log('isValidNumbers', isValidNumbers) */

  const bothAtLimit = (numFrom === 0 && numTo === maxTo);

  if (isValidNumbers) {
    // диапазон неверный? (единственное корневое условие)
    if (numFrom >= numTo) {
      if (bothAtLimit) {
        // оба на пределе → оба виноваты
        fromError = true;
        toError = true;
      } else {
        // обычная логика
        if (numTo !== maxTo) {
          toError = true;
        }
        if (numFrom !== 0) {
          fromError = true;
        }
      }
    }
  }

  const hasFromError = fromError;
  const hasToError = toError;

  const isValid = isValidNumbers && !hasFromError && !hasToError;

  // ---------- SETTERS USING CLAMPERS ----------

  const floatRanges = {
    from: [5, 2], // maxDigits, maxDecimals
    to: [5, 2],
  };

  const clampRanges = {
    from: [null, 0, maxTo], // min=0, max=maxTo
    to: [null, 0, maxTo],
  };

  const setterDispatch = {
    from: (v) => setFrom(v),
    to: (v) => setTo(v),
  };

  const confirm = () => {
    if (!isValid) return;

    onChange({
      name: 'noiseEval',
      checked: true,
      params: { from: numFrom, to: numTo },
    });

    setShow(false);
  };

  const cancel = () => setShow(false);

  return (
    <>
      <Form.Check
        ref={target}
        type="checkbox"
        label="Оценка шума"
        name="noiseEval"
        checked={checked}
        onChange={toggle}
        disabled={disabled}
      />

      <Overlay target={target.current} show={show} placement="right">
        <Popover style={{ minWidth: 250 }}>
          <Popover.Header as="h3">Параметры для оценки шума</Popover.Header>
          <Popover.Body>
            <div style={{ marginBottom: 10 }}>
              <div>Интервал времени</div>

              {/* FROM */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                От:
                <input
                  type="text"
                  value={from}
                  onChange={(e) => floatSetter({
                    name: 'from',
                    value: normalizeDecimalInput(e),
                    rangesMap: floatRanges,
                    setterDispatch,
                  })}
                  onBlur={(e) => clampingBlur({
                    name: 'from',
                    value: normalizeDecimalInput(e),
                    rangesMap: clampRanges,
                    setterDispatch,
                    returnAs: 'string',
                  })}
                  className="form-control form-control-sm"
                  style={{
                    width: 70,
                    borderColor: hasFromError ? 'red' : undefined,
                  }}
                />
                мин.
              </div>

              {/* TO */}
              <div style={{
                display: 'flex', gap: 6, alignItems: 'center', marginTop: 6,
              }}
              >
                До:
                <input
                  type="text"
                  value={to}
                  onChange={(e) => floatSetter({
                    name: 'to',
                    value: e.target.value,
                    rangesMap: floatRanges,
                    setterDispatch,
                  })}
                  onBlur={(e) => clampingBlur({
                    name: 'to',
                    value: e.target.value,
                    rangesMap: clampRanges,
                    setterDispatch,
                    returnAs: 'string',
                  })}
                  className="form-control form-control-sm"
                  style={{
                    width: 70,
                    borderColor: hasToError ? 'red' : undefined,
                  }}
                />
                мин.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
              <Button size="sm" onClick={confirm} disabled={!isValid}>
                OK
              </Button>
              <Button size="sm" variant="secondary" onClick={cancel}>
                Отмена
              </Button>
            </div>
          </Popover.Body>
        </Popover>
      </Overlay>
    </>
  );
}
