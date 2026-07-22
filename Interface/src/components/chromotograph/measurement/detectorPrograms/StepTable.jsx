import React, {
  forwardRef, useCallback, useEffect, useRef, useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';

import _ from 'lodash';
import {
  selectEffectiveDetectorType, selectIsOpened, selectTimeUnit, isThisTabStreaming, errorsActions,
  selectDetectorSpecificStepEntryData,
} from '../../../../services/reduxImportDispatcher.js';

import {
  isConvertableToNumber, formatValueString, tryConvertTimeTo, tryConvertTimeFrom, isValidFromToRange, normalizeDecimalInput,
} from '../../../../utils/validation.js';
import { DETECTOR_TYPES, INVALID_FORMAT } from '../../../../constants/constants.js';

import styles from './StepTable.module.css';
import OverlayTooltip from '../../../custom/OverlayTooltip.jsx';
import { updateProgram } from '../../../../services/thunks/measurement/measurementThunks.js';
import { RID_SAMPLE_RATE_OPTS, SENSITIVITY_OPTIONS_PER_DET, BOOL_OPTIONS, POLARITY_OPTIONS, RID_RANGES, RANGES_PER_DETECTOR, DAD_SAMPLE_RATE_OPTS, DAD_TIME_CONSTANT_OPTS } from '../../../../constants/stepFields.js';
import AdditionalStep from './internal/AdditionalStep.jsx';
import { detectorProgramThunks } from '../../../../services/thunks/detectorAwareBranched/detectorAwareStateThunks.js';

const MAX_TIME_MINUTES = 9999;
const MIN_TIME_SECONDS = 1;
const MAX_TIME_SECONDS = MAX_TIME_MINUTES * 60;

// derive digit limits directly from these numbers
const DIGIT_LIMITS = {
  sec: String(MAX_TIME_SECONDS).length, // 599940 → 6 digits
  min: String(MAX_TIME_MINUTES).length, // 9999 → 4 digits
};

const defaultGetTestId = (fieldName, stepIndex, type = 'unknownType') => {
  return `step-table-${fieldName}-${stepIndex}-${type}`;
};

const areAllToValuesValid = (steps) => steps.every((step) => {
  const from = Number(step.from);
  const to = Number(step.to);
  return !isNaN(from) && !isNaN(to) && to > from;
});

function isStepFieldReadOnly(
  isRunning,
  stepIndex,
  activeStep,
  field,
  isRedacting,
) {
  // 1) Never editable fields stay readonly no matter what
  if (!field.editable) return true;

  // 2) Fields gated by redacting require redacting mode
  if (field.isRedactingDependant && !isRedacting) return true;

  // 3) If not running – normal editability rules
  if (!isRunning) return false;

  // 4) Running: only certain fields in active step are allowed
  if (typeof activeStep !== 'number') {
    // safety net: if activeStep is unknown, lock everything
    return true;
  }

  if (stepIndex === activeStep && !field.allowChangeOnActive) return true;

  if (stepIndex < activeStep) return true;

  return false;
}

const clearInvalidTo = (value, steps, stepId, setSteps, setInvalidToCellIndex, storedSteps, timeUnit) => {
  const from = steps[stepId]?.from;

  if (!isValidFromToRange(from, value)) {
    if (storedSteps[stepId]) {
      const fixedSteps = [...steps];
      const restoredConvertedTo = tryConvertTimeTo(storedSteps[stepId].to, timeUnit);
      fixedSteps[stepId].to = restoredConvertedTo;
      if (stepId + 1 < steps.length) fixedSteps[stepId + 1].from = restoredConvertedTo;
      setSteps(fixedSteps);
    } else {
      setSteps((prevSteps) => prevSteps.map((step, index) => (index === stepId ? { ...step, to: '' } : step)));
    }

    setInvalidToCellIndex(stepId);
    return false;
  }
  return true;
};

const convertTypes = (value, field) => {
  const format = field?.format
  if (format === 'int' || format === 'float') {
    return Number(value);
  } else if (format === 'select') {
    if (field?.convertToNumber) return Number(value);
    if (field?.convertToBool) return value === 'true'
  }
  return value;
};

const clearInvalidAllTo = (steps) => {
  let maxTo = -Infinity;
  const newSteps = [...steps];

  const updateToAndFrom = (steps, toValue, index) => {
    steps[index] = { ...steps[index], to: toValue };
    if (index + 1 < steps.length) {
      steps[index + 1] = { ...steps[index + 1], from: toValue };
    }
  };

  for (let i = 0; i < newSteps.length; i += 1) {
    let toValue = isNaN(Number(newSteps[i].to)) ? '' : Number(newSteps[i].to);
    if (newSteps[i].to > maxTo) {
      maxTo = toValue;
    } else {
      toValue = '';
    }
    updateToAndFrom(newSteps, toValue, i);
  }

  return newSteps;
};

const formatIntegerField = (value) => {
  if (value === '') return ''; // разрешаем пустую строку при вводе
  const numberValue = Number(value);
  if (!isNaN(numberValue)) return numberValue;
  return INVALID_FORMAT;
};

const formatFloat = (value) => {
  const trimmedValue = value.trim();
  let formattedValue = formatValueString(trimmedValue);
  if (formattedValue === '') return formattedValue // be sure to convert on blur to 0

  if (isConvertableToNumber(formattedValue)) {
    // beware, value here is still string to allow 0. to be valid input, if conver to num here 0. will become just 0, deleting the "."
    return formattedValue;
  }
  return INVALID_FORMAT;
};

const formatStr = (value) => {
  const trimmedValue = value.trimStart();
  return trimmedValue;
};

const StepInput = forwardRef(
  ({
    name, value, extraClassNames, onChange, onBlur, 
    onClick, onFocus, readOnly = false, type = 'input', options,

    testId
  }, ref) => {
    const genericClasses = [styles.input, readOnly ? '' : styles.inputEditable].join(' ');
    const classes = [genericClasses, extraClassNames].filter(Boolean).join(' ');

    return (
      <input
        ref={ref} // Forward the ref to the <input> element
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        className={classes}
        onClick={onClick}
        onFocus={onFocus}
        readOnly={readOnly}

        data-testid={testId}
      />
    );
  },
);

const DETECTOR_FIELDS = {
  common: [
    {
      name: 'stepId',
      label: 'Этап',
      editable: false,
      isRedactingDependant: false,
      format: 'int',
      className: styles.input,
      style: { minWidth: 40, width: '5%' },
    },
    {
      name: 'from',
      label: 'От',
      editable: false,
      isRedactingDependant: false,
      format: 'float',
      className: styles.input,
      style: { minWidth: 40, width: '5%' },
    },
    {
      name: 'to',
      label: 'До',
      editable: true,
      isRedactingDependant: true,
      allowChangeOnActive: true,
      format: 'float',
      className: styles.input,
      style: { minWidth: 40, width: '5%' },
    },
    {
      name: 'component',
      label: 'Компонент',
      editable: true,
      isRedactingDependant: true,
      format: 'str',
      className: styles.input,
      style: { minWidth: 110, maxWidth: 300, width: '30%' },
    },
  ],
  [DETECTOR_TYPES.SPHDETECTOR2]: [
    {
      name: 'lambda',
      label: 'λ погл.',
      editable: true,
      isRedactingDependant: true,
      format: 'int',
      className: styles.input,
      style: { minWidth: 40, width: '5%' },
    },
  ],
  [DETECTOR_TYPES.PANORAMA2]: [
    {
      name: 'lambdaEx',
      label: 'λ возб.',
      editable: true,
      isRedactingDependant: true,
      format: 'int',
      className: styles.input,
      style: { minWidth: 40, width: '5%' },
    },
    {
      name: 'lambdaReg',
      label: 'λ рег.',
      editable: true,
      isRedactingDependant: true,
      format: 'int',
      className: styles.input,
      style: { minWidth: 40, width: '5%' },
    },
    {
      name: 'sensitivity',
      label: 'Чувств. ФЭУ',
      format: 'select',
      className: styles.input,
      editable: true,
      isRedactingDependant: true,
      options: SENSITIVITY_OPTIONS_PER_DET.PANORAMA2,
      style: { minWidth: 120, width: '10%' },
    },
  ],
  [DETECTOR_TYPES.FLUORAT]: [
    {
      name: 'excitFilter',
      label: 'Ф. возб.',
      editable: true,
      isRedactingDependant: true,
      format: 'str',
      className: styles.input,
      style: { width: '60px' },
    },
    {
      name: 'regFilter',
      label: 'Ф. рег.',
      editable: true,
      isRedactingDependant: true,
      format: 'str',
      className: styles.input,
      style: { width: '60px' },
    },
    {
      name: 'sensitivity',
      label: 'Чувств. ФЭУ',
      format: 'select',
      className: styles.input,
      editable: true,
      isRedactingDependant: true,
      options: SENSITIVITY_OPTIONS_PER_DET.FLUORAT,
      style: { width: '120px' },
    },
  ],
  [DETECTOR_TYPES.DAD]: [
    {
      name: 'sample_wl',
      label: 'Диап. сред',
      editable: true,
      isRedactingDependant: true,
      format: 'int',
      className: styles.input,
      style: { minWidth: 40, width: '5%' },
    },
    {
      name: 'sample_bw',
      label: 'Ширина',
      editable: true,
      isRedactingDependant: true,
      format: 'int',
      className: styles.input,
      style: { minWidth: 40, width: '5%' },
    },
    {
      name: 'sample_rate',
      label: 'Частота дискр.',
      editable: true,
      isRedactingDependant: true,
      format: 'select',
      convertToNumber: true,
      options: DAD_SAMPLE_RATE_OPTS,
      className: styles.input,
      style: { minWidth: 40, width: '5%' },
    },
    {
      name: 'time_constant',
      label: 'Вр. накопл.',
      editable: true,
      isRedactingDependant: true,
      format: 'select',
      convertToNumber: true,
      options: DAD_TIME_CONSTANT_OPTS,
      className: styles.input,
      style: { minWidth: 40, width: '5%' },
    },
  ],
};

const detectorConfigHandler = {
  get(target, prop) {
    return Object.hasOwn(target, prop) ? target[prop] : []
  }
}
const detectorFieldsConfig = new Proxy(DETECTOR_FIELDS, detectorConfigHandler) // for safe access's sake

DETECTOR_FIELDS[DETECTOR_TYPES.PANORAMA] = _.cloneDeep(DETECTOR_FIELDS[DETECTOR_TYPES.PANORAMA2]);
DETECTOR_FIELDS[DETECTOR_TYPES.SPHDETECTOR] = _.cloneDeep(DETECTOR_FIELDS[DETECTOR_TYPES.SPHDETECTOR2]);

const getChecksForDetector = (steps, detectorType) => {
  const disableable = detectorFieldsConfig[detectorType].filter(field => field?.disableable)

  const checkNamesSet = new Set(disableable.map(field => field.name));

  if (disableable.length === 0) return []
  const perStepChecks = steps.map((step, index) => {
    const fieldEntriesToAnalyse = Object.entries(step).filter(([name, _]) => checkNamesSet.has(name))
    const derivedEntries = fieldEntriesToAnalyse.map(([name, value]) => [name, value !== null]) // derive check state from nullishness of value
    return Object.fromEntries(derivedEntries)      
  })

  return perStepChecks
}

function StepTable(props) {
  const dispatch = useDispatch();
  const { parentId, getTestId = defaultGetTestId } = props;

  const detectorType = useSelector((state) => selectEffectiveDetectorType(state, parentId ));

  const currentTableConfig = [...detectorFieldsConfig.common, ...detectorFieldsConfig[detectorType]]

  const {
    steps: storedSteps,
    isRedacting,
    focusedStep: storedFocusedStep,
    activeStep,
  } = useSelector((state) => selectDetectorSpecificStepEntryData(state, parentId));

  const timeUnit = useSelector((state) => selectTimeUnit(state, parentId));

  const [steps, setSteps] = useState(storedSteps.map((step) => ({ ...step, from: tryConvertTimeTo(step.from, timeUnit), to: tryConvertTimeTo(step.to, timeUnit) })));
  const [stepsChecks, setStepsChecks] = useState(getChecksForDetector(steps, detectorType))

  const isOpened = useSelector((state) => selectIsOpened(state, parentId));

  const [focusedStep, setFocusedStep] = useState(storedFocusedStep);

  useEffect(() => {
    setFocusedStep(storedFocusedStep);
  }, [storedFocusedStep]);

  const [invalidToCellIndex, setInvalidToCellIndex] = useState(null);
  const cellsRefs = useRef([]);

  useEffect(() => {
    setSteps(storedSteps.map((step) => ({ ...step, from: tryConvertTimeTo(step.from, timeUnit), to: tryConvertTimeTo(step.to, timeUnit) })));
  }, [storedSteps, timeUnit]);


  useEffect(()=>{
    const newChecks = getChecksForDetector(storedSteps, detectorType)
    setStepsChecks(newChecks) 
  },[storedSteps, detectorType, isRedacting]) // sync on detector for possible new fields, sync on steps for open files, sync on redacting to uncheck those still left unfilled

  const prevTypeRef = useRef();

  useEffect(() => {
    const prev = prevTypeRef.current;

    const isRealChange = detectorType // now defined
      && prev // was defined before
      && detectorType !== prev; // is actually different

    if (isRealChange && !isOpened) {
      dispatch(detectorProgramThunks.forceTemplate({ detectorType, measurementId: parentId, template: false }));
    }

    prevTypeRef.current = detectorType;
  }, [detectorType]);

  useEffect(() => {
    cellsRefs.current.length = steps.length;
  }, [steps.length]);

  const isRunning = useSelector((state) => isThisTabStreaming(state, parentId));

  const onChangeInput = useCallback((e, stepId, format, field) => {
    if (isRedacting) {
      const { name, value } = e.target;

      if (format === 'int' || format === 'float') {
        const [integerPart] = value.split('.');
        const limit = DIGIT_LIMITS[timeUnit] ?? String(MAX_TIME_SECONDS).length;
        if (integerPart.length > limit) {
          return; // too many digits ignore entirely
        }
      }

      let valueToAsign;
      if (format === 'int') {
        valueToAsign = formatIntegerField(normalizeDecimalInput(e));
      }
      if (format === 'float') {
        valueToAsign = formatFloat(normalizeDecimalInput(e));
      }
      if (format === 'str') {
        valueToAsign = formatStr(value);
      }
      if (format === 'select') {        
        valueToAsign = value;
      }
      
      if (valueToAsign === INVALID_FORMAT) return;

      setSteps((prevSteps) => prevSteps.map((step, index) => (index === stepId ? { ...step, [name]: valueToAsign } : step)));
    }
  }, [isRedacting, timeUnit]);

  const onChangeSelect = (e, stepId, field) => {
    const { name, value } = e.target;
    if (value !== null) {
      const valueToAssign = convertTypes(value, field);
      setSteps((prevSteps) => prevSteps.map((step, index) => (index === stepId ? { ...step, [name]: valueToAssign } : step)));
      dispatch(detectorProgramThunks.updateStep({
        detectorType, tabId: parentId, stepId, name, value: valueToAssign,
      }));  
    }
  };

  const rangeClamper = (value, name, stepId, detectorType) => {
    const ranges = RANGES_PER_DETECTOR[detectorType];
    if (!(name in ranges)) return value;

    const numericValue = Number(value);
    if (isNaN(numericValue)) return INVALID_FORMAT;

    let clamped = numericValue;
    const [min, max] = ranges[name];

    if (min !== undefined && clamped < min) clamped = min;
    if (max !== undefined && clamped > max) clamped = max;

    setSteps(prev => prev.map((step, i) =>
      i === stepId ? { ...step, [name]: clamped } : step
    ));
    return clamped
  };

  const handleBlur = (event, stepId, field, timeUnit) => {
    const { name, value } = event.target;
    let adjustableValue = value;
    if (name === 'to') {
      adjustableValue = Number(adjustableValue);
      const isValid = clearInvalidTo(adjustableValue, steps, stepId, setSteps, setInvalidToCellIndex, storedSteps, timeUnit);
      if (!isValid) return;

      const newSteps = clearInvalidAllTo(steps);
      newSteps[stepId].to = adjustableValue;
      if (stepId < steps.length - 1) newSteps[stepId + 1].from = adjustableValue;
      const convertedUnitsSteps = newSteps.map((step) => ({ ...step, from: tryConvertTimeFrom(step.from, timeUnit), to: tryConvertTimeFrom(step.to, timeUnit) }));
      dispatch(detectorProgramThunks.setStepsTable({ detectorType, tabId: parentId, stepsTable: convertedUnitsSteps }));
      return;
    }

    const nullableValues = ['',null]
    if (field?.isNullable && nullableValues.includes(adjustableValue)) {
      adjustableValue = null;

/*       if (field?.disableable) setStepsChecks(prev => prev.map((step, index) => {
        if (index !== stepId) return step
        return {...step, [name]: adjustableValue}
      })) */
    } else {
      adjustableValue = rangeClamper(value, name, stepId, detectorType)
      if (adjustableValue === INVALID_FORMAT) return
      adjustableValue = convertTypes(adjustableValue, field);
    }

    dispatch(detectorProgramThunks.updateStep({
      detectorType, tabId: parentId, stepId, name, value: adjustableValue,
    }));
  };

  const useOutsideClick = (callback) => {
    const ref = useRef();

    useEffect(() => {
      const handleClick = (event) => {
        if (ref.current && !ref.current.contains(event.target)) {
          callback();
        }
      };

      document.addEventListener('click', handleClick);
      return () => {
        document.removeEventListener('click', handleClick);
      };
    }, [ref, handleOutsideClick]);

    return ref;
  };

  const prevRedacting = useRef(isRedacting);

  useEffect(() => {
    const justStoppedEditing = prevRedacting.current && !isRedacting;

    if (justStoppedEditing && isRunning) {
      if (areAllToValuesValid(steps)) {
        dispatch(updateProgram({ tabId: parentId, measurementType: 'chroma' }));
      } else {
        dispatch(
          errorsActions.addError({
            errorId: -1,
            fetchedError: {
            // No numeric fields provided so key will be based on message (or default to empty values)
              message: 'Программа детектора некорректна, изменения не были применены',
            },
          }),
        );
      }
    }

    prevRedacting.current = isRedacting;
  }, [isRedacting, isRunning]);

  const handleOutsideClick = useCallback(() => {
    if (isRedacting === false) return;
    if (document.activeElement) { // so no greedy and rudely interrupting Plotly breaks blur again
      document.activeElement.blur();
    }
    dispatch(detectorProgramThunks.setReadacting({detectorType, tabId: parentId, value: false }));
  },[parentId, isRedacting]);

  const handleDoubleClick = (event) => {
    event.target.focus();
    if (isRedacting === true) return;
    dispatch(detectorProgramThunks.setReadacting({detectorType, tabId: parentId, value: true }));
  };

  const handleFocus = (stepIndex) => {
    setFocusedStep(stepIndex);
    dispatch(detectorProgramThunks.setFocusedStep({detectorType, tabId: parentId, value: stepIndex }));
  };

  const ref = useOutsideClick(handleOutsideClick);

  const handleRef = (elem, index) => {
    const refs = cellsRefs.current;
    if (elem !== null && !refs.includes(elem)) refs[index] = elem;
  };

  const handleTooltipClose = () => setInvalidToCellIndex(null);

  const renderStepId = (stepIndex, getTestId = defaultGetTestId) => (
    <td key="stepId" style={currentTableConfig.find((f) => f.name === 'stepId')?.style} className={styles.tableDefinition}>
      <input
        name="stepId"
        value={stepIndex + 1}
        readOnly
        onFocus={() => handleFocus(stepIndex)}
        className={styles.input}
        data-testid={getTestId('stepId', stepIndex, 'input')}
      />
    </td>
  );

  const renderToField = (field, step, stepIndex, getTestId = defaultGetTestId) => {
    const isUnfilled = step.to === '';
    const isReadOnly = isStepFieldReadOnly(isRunning, stepIndex, activeStep, field, isRedacting);
    const testId = getTestId('to', stepIndex, 'input');

    return (
      <td key="to" style={currentTableConfig.find((f) => f.name === 'to')?.style} className={styles.tableDefinition}>
        <StepInput
          name="to"
          value={step.to ?? ''}
          onChange={(e) => onChangeInput(e, stepIndex, field.format)}
          onBlur={isReadOnly ? undefined : (e) => handleBlur(e, stepIndex, field, timeUnit)}
          onFocus={() => handleFocus(stepIndex)}
          extraClassNames={[
            isUnfilled ? 'bg-warning' : '', // Add bg-warning class if value is empty
          ].join(' ')}
          ref={(elem) => handleRef(elem, stepIndex)}
          readOnly={isReadOnly}
          testId={testId}
        />
        {stepIndex === invalidToCellIndex && cellsRefs.current[stepIndex] && (
          <OverlayTooltip
            message='"До" должно быть позже чем "от"'
            targetRef={cellsRefs.current[stepIndex]}
            onTimeout={handleTooltipClose}
            timeout={3000}
          />
        )}
      </td>
    );
  };

  const handleCheckboxChange = (e, stepIndex, field) => {
    const {checked, name} = e.target;

    setStepsChecks(prev => {
      const newChecks = prev.map((checksStep, index) => index === stepIndex 
        ? {...checksStep, [name]: checked} 
        : checksStep
      )
      return newChecks
    })

    if (!checked) {
      setSteps(prev =>
        prev.map((s, i) => (i === stepIndex ? { ...s, [name]: null } : s))
      );
      dispatch(
        detectorProgramThunks.updateStep({
          detectorType,
          tabId: parentId,
          stepId: stepIndex,
          name,
          value: null,
        })
      );
    }

  }

  const renderDisablableInt = (field, step, stepIndex, getTestId = defaultGetTestId) => { 
    const isReadOnly = isStepFieldReadOnly(isRunning, stepIndex, activeStep, field, isRedacting);
    
    const stepChecks = stepsChecks[stepIndex] || {};
    const isChecked = stepChecks[field.name] ?? false;

    const checkboxTestId = getTestId(field.name, stepIndex, 'checkbox');
    const inputTestId = getTestId(field.name, stepIndex, 'input');

    return (
      <td key={field.name} style={field.style} className={styles.tableDefinition}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <input
            type="checkbox"
            name={field.name}
            checked={isChecked}
            onChange={(e) => handleCheckboxChange(e, stepIndex, field)}
            disabled={isReadOnly}
            style={{ marginRight: '5px' }}

            data-testid={checkboxTestId}
          />
          <StepInput
            name={field.name}
            value={step[field.name] ?? ''}
            onChange={(e) => onChangeInput(e, stepIndex, field.format, field)}
            onBlur={isReadOnly ? undefined : (e) => handleBlur(e, stepIndex, field)} // Only trigger blur if editable
            onFocus={() => handleFocus(stepIndex)}
            readOnly={isReadOnly || !isChecked}

            testId={inputTestId}
          />
        </div>

      </td>
    );
  } 

  const renderSelect = (field, step, stepIndex, getTestId = defaultGetTestId) => {
    const isReadOnly = isStepFieldReadOnly(
      isRunning,
      stepIndex,
      activeStep,
      field,
      isRedacting,
    );

    const selectTestId = getTestId(field.name, stepIndex, 'select');
    const selectTDTestId = getTestId(field.name, stepIndex, 'selectTD');

    return (
      <td 
        key={field.name} style={field.style} className={styles.tableDefinition}
        data-testid={selectTDTestId}
      >
        <select
          name={field.name}
          value={step[field.name] ?? ''}
          onChange={(e) => onChangeSelect(e, stepIndex, field)} // pass all meta for numeric selects
          onBlur={isReadOnly ? undefined : (e) => handleBlur(e, stepIndex, field)}
          onFocus={() => handleFocus(stepIndex)}
          className={[styles.input, styles.inputEditable].join(' ')}
          style={{ pointerEvents: isReadOnly ? 'none' : 'auto' }}

          data-testid={selectTestId}
        >
          {field.options.map((opt) => (
            <option key={opt.value} value={opt.value} style={field?.optionStyle ? field?.optionStyle : {}}>
              {opt.label}
            </option>
          ))}
        </select>
      </td>
    );
  };

  const renderField = (field, step, stepIndex, getTestId = defaultGetTestId) => {
    const isReadOnly = isStepFieldReadOnly(isRunning, stepIndex, activeStep, field, isRedacting);

    const testId = getTestId(field.name, stepIndex, 'input');

    return (
      <td key={field.name} style={field.style} className={styles.tableDefinition}>
        <StepInput
          name={field.name}
          value={step[field.name] ?? ''}
          onChange={(e) => onChangeInput(e, stepIndex, field.format)}
          onBlur={isReadOnly ? undefined : (e) => handleBlur(e, stepIndex, field)} // Only trigger blur if editable
          onFocus={() => handleFocus(stepIndex)}
          readOnly={isReadOnly}
          testId={testId}
        />
      </td>
    );
  };

  const renderFieldOrSelect = (field, step, stepIndex, getTestId) => {
    if (field.format === 'select') {
      return renderSelect(field, step, stepIndex, getTestId);
    }
    if (field.name === 'stepId') return renderStepId(stepIndex);
    if (field.name === 'to') return renderToField(field, step, stepIndex, getTestId);
      if (field.name === 'temperature' && detectorType === DETECTOR_TYPES.RID) {
        return renderDisablableInt(field, step, stepIndex, getTestId);
      }
      
    return renderField(field, step, stepIndex, getTestId);
  };

  const getRowClassName = (stepIndex) => {
    if (isRunning && stepIndex === activeStep) return 'bg-primary-subtle';
    if (isRunning && stepIndex < activeStep) return 'bg-secondary-subtle';
    if (isRedacting && stepIndex === focusedStep) return styles.focusedRow;
    return undefined;
  };

  const tableClassNames = [styles.table, isRedacting ? styles.tablePrimaryThickBorder : ''].filter(Boolean).join(' ');

  const removeRow = (stepIndex) => {
    if (!isRedacting) return;
    if (steps.length <= 1) return; // Prevent removing the last step
    dispatch(detectorProgramThunks.deleteStepByIndex({ detectorType, tabId: parentId, index: stepIndex }));
  };

  const addRow = () => {
    if (!isRedacting) return;
    dispatch(detectorProgramThunks.addStep({ detectorType, tabId: parentId }));
  };

  const getDeleteCellClassName = (stepIndex) => {
    const classes = [styles.deleteCell];
    if (stepIndex > activeStep && isRedacting) {
      return classes.join(' ');
    }
    classes.push(styles.hiddenDelete);
    return classes.join(' ');
  };

  return (
    <div 
      ref={ref} 
      className={styles.stepTable} 
      onDoubleClick={handleDoubleClick}
      data-testid="step-table-container"
    >
      <table className={tableClassNames}>
        <thead>
          <tr>
            {currentTableConfig.map((field) => (
              <th key={field.name} className={styles.tableHeader} 
                data-testid={getTestId(field.name, -1, 'header')}>
                {field.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {steps?.map((step, stepIndex) => (
            <tr
              key={stepIndex}
              className={getRowClassName(stepIndex)}
              data-testid={getTestId('row', stepIndex, 'row')}
            >
              {currentTableConfig.map((field) => renderFieldOrSelect(field, step, stepIndex, getTestId))}

              <td className={getDeleteCellClassName(stepIndex)}>
                <span 
                  className="py-1 fw-bold" 
                  onClick={() => removeRow(stepIndex)}
                  data-testid={getTestId('delete', stepIndex, 'button')}
                >
                  ×
                </span>
              </td>

            </tr>
          ))}

          {isRedacting && (
            <tr
              className={styles.plusRow}
              style={{ width: '100%' }}
              onClick={() => addRow()}
              data-testid={getTestId('add', -1, 'row')}
            >
              <td
                className={styles.plusCell}
                colSpan={1}
                data-testid={getTestId('add', -1, 'button')}
              >
                +
              </td>
            </tr>
          )}

        </tbody>
      </table>
      <AdditionalStep tabId={parentId} isRedacting={isRedacting} />
    </div>
  );
}

export default StepTable;
