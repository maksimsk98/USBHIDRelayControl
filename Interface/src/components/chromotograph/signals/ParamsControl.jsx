import React, { useEffect, useRef, useState } from 'react';
import { Form, InputGroup } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectDetectorType, selectIsTabInitialized, selectTabSignalParams, selectUsedDetectorType,
} from '../../../services/reduxImportDispatcher';
import { updateSignalParamThunk } from '../../../services/thunks/chromaMisc/chromaMiscThunks';
import {
  CUSTOM_DEVIATION_INTERVALS_MAP, DETECTOR_TYPES, SQUISHABLE_INTERVAL_VALUES, STANDART_DEVIATION_INTERVALS,
} from '../../../constants/constants';
import {
  tryConvertTimeFrom, tryConvertTimeTo, formatFloatSmart, isConvertableToNumber, normalizeDecimalInput,
} from '../../../utils/validation';

function ParamsControl({ parentId: tabId }) {
  const dispatch = useDispatch();

  const {
    isSignalAveraging,
    isCheckedCorrection,
    isCheckedShift,
    isCheckedDriftCompensation,
    standardDeviationInterval,
    isSquishableInterval,
    customUserDeviationInterval = 1,
  } = useSelector((state) => selectTabSignalParams(state, tabId));

  const [customDeviationInput, setCustomDeviationInput] = useState(formatFloatSmart(customUserDeviationInterval) ?? '');
  const [devTimeUnit, setDivTimeUnit] = useState('min');
  const [localStdInterval, setLocalStdInterval] = useState(tryConvertTimeTo(standardDeviationInterval, devTimeUnit));

  useEffect(() => {
    let localToDispatch = localStdInterval;

    if (STANDART_DEVIATION_INTERVALS.includes(Number(localToDispatch))) {
      localToDispatch = tryConvertTimeFrom(localStdInterval, devTimeUnit);
    }

    dispatch(updateSignalParamThunk({
      id: tabId,
      paramName: 'standardDeviationInterval',
      value: localToDispatch,
    }));
  }, [localStdInterval, devTimeUnit]);

  const customInputRef = useRef(customDeviationInput);

  useEffect(() => {
    customInputRef.current = customDeviationInput;
  }, [customDeviationInput]);

  useEffect(() => {
    if (!Object.keys(CUSTOM_DEVIATION_INTERVALS_MAP).includes(localStdInterval)) return;

    const parsed = parseFloat(customInputRef.current);
    if (!isNaN(parsed)) {
      const seconds = tryConvertTimeFrom(parsed, devTimeUnit);
      if (seconds !== customUserDeviationInterval) {
        dispatch(updateSignalParamThunk({
          id: tabId,
          paramName: 'customUserDeviationInterval',
          value: Math.max(seconds, 1),
        }));
      }
    }
  }, [devTimeUnit]);

  useEffect(() => {
    const currentInterval = Number.isFinite(standardDeviationInterval)
      ? tryConvertTimeTo(standardDeviationInterval, devTimeUnit)
      : standardDeviationInterval;
    if (localStdInterval !== currentInterval) setLocalStdInterval(currentInterval);
  }, [standardDeviationInterval]);

  useEffect(() => {
    const formatedStored = formatFloatSmart(tryConvertTimeTo(customUserDeviationInterval, devTimeUnit));
    const formatedInput = formatFloatSmart(parseFloat(customDeviationInput));
    if (formatedInput !== formatedStored) setCustomDeviationInput(formatedStored);
  }, [customUserDeviationInterval]);

  const fileDetectorType = useSelector((state) => selectUsedDetectorType(state, tabId));
  const selectedDetectorType = useSelector(selectDetectorType);
  const effectiveDetectorType = fileDetectorType ?? selectedDetectorType;
  const isInitialized = useSelector((state) => selectIsTabInitialized(state, tabId));

  if (!isInitialized) return null;

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    dispatch(updateSignalParamThunk({
      id: tabId,
      paramName: name,
      value: checked,
    }));
  };

  const handleIntervalChange = (e) => {
    const { name, value } = e.target;
    let valToAssign = value;
    if (!Object.keys(CUSTOM_DEVIATION_INTERVALS_MAP).includes(valToAssign)) {
      valToAssign = Number(normalizeDecimalInput(e));
    }

    setLocalStdInterval(valToAssign);
  };

  const handleTimeUnitChange = (e) => {
    const { name, value } = e.target;
    setDivTimeUnit(value);
  };

  const handleCustomDeviationInputChange = (e) => {
    const rawValue = normalizeDecimalInput(e);
    if (isConvertableToNumber(rawValue)) {
      setCustomDeviationInput(rawValue);
    }
  };

  const handleCustomDeviationBlur = () => {
    const num = parseFloat(customDeviationInput);

    if (!isNaN(num)) {
      const seconds = tryConvertTimeFrom(num, devTimeUnit);
      const clamped = Math.max(seconds, 1); // enforce min 1 sec
      dispatch(updateSignalParamThunk({
        id: tabId,
        paramName: 'customUserDeviationInterval',
        value: clamped,
      }));
      setCustomDeviationInput(formatFloatSmart(tryConvertTimeTo(clamped, devTimeUnit)));
    } else {
      // fallback: reset to current Redux value
      const currentCustomInterval = tryConvertTimeTo(customUserDeviationInterval, devTimeUnit);
      setCustomDeviationInput(formatFloatSmart(currentCustomInterval));
    }
  };

  return (
    <Form>
      <Form.Check
        type="checkbox"
        label="Усреднение"
        name="isSignalAveraging"
        checked={isSignalAveraging}
        onChange={handleCheckboxChange}
      />
      {(effectiveDetectorType === DETECTOR_TYPES.PANORAMA2
        || effectiveDetectorType === DETECTOR_TYPES.PANORAMA
      ) && (
      <Form.Check
        type="checkbox"
        label="Коррекция"
        name="isCheckedCorrection"
        checked={isCheckedCorrection}
        onChange={handleCheckboxChange}
        disabled={isSignalAveraging}
      />
      )}
      {(effectiveDetectorType === DETECTOR_TYPES.SPHDETECTOR2
        || effectiveDetectorType === DETECTOR_TYPES.SPHDETECTOR
      ) && (
      <Form.Check
        type="checkbox"
        label="Сдвиг"
        name="isCheckedShift"
        checked={isCheckedShift}
        onChange={handleCheckboxChange}
      />
      )}
      <Form.Check
        type="checkbox"
        label="Компенсация дрейфа"
        name="isCheckedDriftCompensation"
        checked={isCheckedDriftCompensation}
        onChange={handleCheckboxChange}
      />

      <InputGroup size="sm" style={{ whiteSpace: 'nowrap', maxWidth: '400px', flexWrap: 'nowrap' }}>
        <InputGroup.Text>Интервал СКО</InputGroup.Text>
        <Form.Select
          name="standardDeviationInterval"
          value={localStdInterval}
          onChange={handleIntervalChange}
          style={{ minWidth: '70px', maxWidth: '90px', paddingRight: '30px' }}
        >
          {Object.entries({
            1: 1,
            2: 2,
            3: 3,
            4: 4,
            5: 5,
            10: 10,
            30: 30,
            customUser: CUSTOM_DEVIATION_INTERVALS_MAP.customUser,
            captureInterval: CUSTOM_DEVIATION_INTERVALS_MAP.captureInterval,
          }).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Form.Select>
        {Object.keys(CUSTOM_DEVIATION_INTERVALS_MAP).includes(standardDeviationInterval) && (
          <Form.Control
            name="customUserDeviationInterval"
            onChange={handleCustomDeviationInputChange}
            onBlur={handleCustomDeviationBlur}
            value={customDeviationInput}
            style={{ maxWidth: '50px', minWidth: '35px' }}
          />
        )}
        <Form.Select
          name="divTimeUnit"
          value={devTimeUnit}
          onChange={handleTimeUnitChange}
          style={{ minWidth: '65px', maxWidth: '75px', paddingRight: '24px' }}
        >
          <option value="sec">сек.</option>
          <option value="min">мин.</option>
        </Form.Select>
      </InputGroup>

      {SQUISHABLE_INTERVAL_VALUES.includes(localStdInterval) && (
      <Form.Check
        type="checkbox"
        label="Сжимаемый интервал"
        name="isSquishableInterval"
        checked={isSquishableInterval}
        onChange={handleCheckboxChange}
      />
      )}
    </Form>
  );
}

export default ParamsControl;
