import React, {
  useState, forwardRef, useEffect, useRef, useCallback,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import _ from 'lodash';
import styles from './SpectroSteps.module.css';
import {
  selectIsRedactingSpectroSteps, selectSpectroFocusedStep, selectSpectroSteps, selectEffectiveDetectorType, spectroStepsActions,
} from '../../../services/reduxImportDispatcher';
import { useClickOutside } from '../../../hooks/useClickOutside';
import { DETECTOR_TYPES } from '../../../constants/constants';
import { clampingBlur } from '../../../utils/setters';
import { SPECTRO_SCANNING_OPTIONS } from '../../../constants/stepFields';
import { getEffectiveRanges } from '../../../utils/spectroSteps';
import { isNonNegIntStrWithinLimits } from '../../../utils/validation';
import OverlayTooltip from '../../custom/OverlayTooltip';
import { INVALID_SPECTRO_DETECTOR_MAP } from '../../../constants/uiTooltips';

const convertIfNumeric = (name, value, fields) => {
  const field = fields.find((f) => f.name === name);
  if (!field) return value;
  if (field.format === 'int' || field.format === 'float') {
    const num = Number(value);
    return isNaN(num) ? value : num;
  }
  return value;
};

export const DETECTOR_FIELDS = {
  common: [
    {
      name: 'index',
      label: '№',
      editable: false,
      format: 'int',
      className: styles.input,
      style: { width: '4%' },
    },
    {
      name: 'component',
      label: 'Компонент',
      editable: true,
      isRedactingDependant: true,
      format: 'str',
      className: styles.input,
      style: { width: '25%' },
    },
    {
      name: 'from',
      label: 'От',
      editable: true,
      isRedactingDependant: true,
      format: 'int',
      className: styles.input,
      style: { width: '10%' },
    },
    {
      name: 'to',
      label: 'До',
      editable: true,
      isRedactingDependant: true,
      format: 'int',
      className: styles.input,
      style: { width: '10%' },
    },
  ],

  [DETECTOR_TYPES.PANORAMA2]: [
    {
      name: 'scanningType',
      label: 'Сканирование',
      editable: true,
      isRedactingDependant: true,
      format: 'select',
      className: styles.input,
      options: SPECTRO_SCANNING_OPTIONS,
      style: { width: '25%' },
    },
    {
      name: 'fixedWaveLength',
      label: 'Фикс.',
      editable: true,
      isRedactingDependant: true,
      format: 'int',
      className: styles.input,
      style: { width: '10%' },
    },
  ],
};

DETECTOR_FIELDS[DETECTOR_TYPES.PANORAMA] = _.cloneDeep(DETECTOR_FIELDS[DETECTOR_TYPES.PANORAMA2]);

const CustomInput = forwardRef(({
  name, value, readOnly, onChange, onBlur,
}, ref) => {
  const classes = [styles.input, !readOnly ? styles.inputEditable : ''].join(' ');
  return (
    <input
      ref={ref}
      name={name}
      value={value}
      readOnly={readOnly}
      onChange={onChange}
      onBlur={onBlur}
      className={classes}
    />
  );
});

function SpectroSteps({ tabId }) {
  const dispatch = useDispatch();

  const spectroSteps = useSelector((state) => selectSpectroSteps(state, tabId));
  const isRedacting = useSelector((state) => selectIsRedactingSpectroSteps(state, tabId));
  const detectorType = useSelector((state) => selectEffectiveDetectorType(state, tabId ));
  const focusedStep = useSelector((state) => selectSpectroFocusedStep(state, tabId));

  const fields = [
    ...DETECTOR_FIELDS.common,
    ...(DETECTOR_FIELDS[detectorType] || []),
  ];

  const getFieldDef = (name) => fields.find((f) => f.name === name);

  const [rows, setRows] = useState(spectroSteps);

  const tableRef = useRef();
  const isActiveRef = useRef(true);
  const [invalidCell, setInvalidCell] = useState(null);
  const cellRefs = useRef({});
  const [invalidMessage, setInvalidMessage] = useState('');

  const setCellRef = (elem, rowIndex, fieldName) => {
    if (!elem) return;
    if (!cellRefs.current[rowIndex]) cellRefs.current[rowIndex] = {};
    cellRefs.current[rowIndex][fieldName] = elem;
  };

  useEffect(() => {
    setRows(spectroSteps);
  }, [spectroSteps]);

  const handleChange = (e, rowIndex) => {
    const { name, value } = e.target;
    if (!isRedacting) return; // block edits outside redacting mode

    const field = getFieldDef(name);
    if (!field) return;

    if (field.format === 'int') {
      // allow only digits
      if (!isNonNegIntStrWithinLimits(value, 3) && value != '') return;
    }

    if (name === 'scanningType') {
      const oldRow = rows[rowIndex];
      const newRow = { ...oldRow, scanningType: value };

      // recompute ranges with new scanningType
      const nameToClamp = 'fixedWaveLength';
      const effectiveRanges = getEffectiveRanges({
        detectorType,
        scanningType: value,
        row: newRow,
        name: nameToClamp,
      });

      console.log('effective range', value, effectiveRanges.from, effectiveRanges.to, effectiveRanges.fixedWaveLength);

      // clamp helper
      const clamp = (val, range) => {
        if (!range) return val;
        const [, min, max] = range;
        const num = Number(val);
        if (isNaN(num)) return val;
        return Math.min(max, Math.max(min, num));
      };

      const clamped = {
        ...newRow,
        from: clamp(newRow.from, effectiveRanges.from),
        to: clamp(newRow.to, effectiveRanges.to),
        fixedWaveLength: clamp(newRow.fixedWaveLength, effectiveRanges.fixedWaveLength),
      };

      // update local rows
      const updatedRows = rows.map((r, i) => (i === rowIndex ? clamped : r));
      setRows(updatedRows);

      // update Redux immediately
      dispatch(
        spectroStepsActions.setStepsTable({
          tabId,
          stepsTable: updatedRows,
        }),
      );

      return; // important!
    }

    setRows((prev) => prev.map((row, i) => (i === rowIndex ? { ...row, [name]: value } : row)));
  };

  const blurDispatchSingleCell = (rowIndex, name, value) => {
    const updated = rows.map((r, i) => (i === rowIndex ? { ...r, [name]: value } : r));

    setRows(updated);

    dispatch(
      spectroStepsActions.setStepsTable({
        tabId,
        stepsTable: updated,
      }),
    );
  };

  const activeRowRef = useRef(null);

  const setterDispatch = Object.fromEntries(
    fields
      .filter((f) => f.format === 'int' || f.format === 'float')
      .map((f) => [
        f.name,
        (val) => blurDispatchSingleCell(activeRowRef.current, f.name, val),
      ]),
  );

  /*   const setterDispatch = {
    from:            (val) => blurDispatchSingleCell(activeRowRef.current, "from", val),
    to:              (val) => blurDispatchSingleCell(activeRowRef.current, "to", val),
    fixedWaveLength: (val) => blurDispatchSingleCell(activeRowRef.current, "fixedWaveLength", val),
  }; */

  const handleBlur = (e, rowIndex) => {
    const { name, value } = e.target;

    activeRowRef.current = rowIndex;

    const field = fields.find((f) => f.name === name);
    if (!field) return;

    const row = rows[rowIndex];

    // ==== RELATION GUARD (block + revert) ====
    if (name === 'from' || name === 'to') {
      const numericValue = Number(value);

      // local row values (possibly edited)
      const currentFrom = Number(rows[rowIndex].from);
      const currentTo = Number(rows[rowIndex].to);

      const newFrom = name === 'from' ? numericValue : currentFrom;
      const newTo = name === 'to' ? numericValue : currentTo;

      if (!isNaN(newFrom) && !isNaN(newTo) && newFrom >= newTo) {
        // revert to previous Redux value
        setRows((prev) => prev.map((r, i) => (i === rowIndex
          ? { ...r, [name]: spectroSteps[rowIndex][name] }
          : r)));

        // show tooltip on "from" or "to" or "fix" field
        setInvalidCell({ rowIndex, field: name });

        // number-unaware, source-aware
        setInvalidMessage(INVALID_SPECTRO_DETECTOR_MAP[name]);

        return; // BLOCK completely
      }
    }
    // =========================================

    const { scanningType } = row;

    const effectiveRanges = getEffectiveRanges({
      detectorType,
      scanningType,
      row,
      name,
    });

    // INT or FLOAT numeric clamp
    if (field.format === 'int' || field.format === 'float') {
      const { wasClamped } = clampingBlur({
        name,
        value,
        rangesMap: effectiveRanges,
        setterDispatch,
        returnAs: 'int', // or "string"
      });

      if (wasClamped) {
        setInvalidCell({ rowIndex, field: name });
        const [, min, max] = effectiveRanges[name] || [];
        setInvalidMessage(
          `Минимально допустимое значение: ${min}. Максимально допустимое значение: ${max}.`,
        );
      }
      return;
    }

    // STR direct update (no clamp)
    if (field.format === 'str') {
      blurDispatchSingleCell(rowIndex, name, value);
    }
  };

  const handleDoubleClick = () => {
    if (!isRedacting) {
      dispatch(
        spectroStepsActions.setReadacting({ tabId, value: true }),
      );
    }
  };

  const handleOutsideClick = useCallback(() => {
    if (isRedacting) {
      dispatch(
        spectroStepsActions.setReadacting({ tabId, value: false }),
      );
    }
  }, [isRedacting]);

  const ignoreIds = [
    'control-step-redact-button',
    'control-step-add-button',
    'control-step-delete-button',
  ];

  useClickOutside({
    isActiveRef,
    ignoreRefs: [tableRef],
    ignoreIds,
    onOutsideClick: handleOutsideClick,
    enabled: true,
  });

  // Render functions modeled on StepTable’s structure:
  const renderIndexField = (rowIndex) => (
    <td
      key="index"
      className={styles.tableDefinition}
      style={{ width: fields.find((f) => f.name === 'index')?.width }}
    >
      <input
        value={rowIndex + 1}
        readOnly
        className={styles.input}
      />
    </td>
  );

  const renderSelectField = (field, row, rowIndex) => (
    <td
      key={field.name}
      className={styles.tableDefinition}
      style={{ width: field.width }}
    >
      <select
        name={field.name}
        value={row[field.name] ?? ''}
        onChange={(e) => handleChange(e, rowIndex)}
        onBlur={(e) => handleBlur(e, rowIndex)}
        className={[styles.input, styles.inputEditable].join(' ')}
        style={{ pointerEvents: isRedacting ? 'auto' : 'none' }}
      >
        {field.options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </td>
  );

  const clearInvalidTooltip = () => setInvalidCell(null);

  const renderInputField = (field, row, rowIndex) => {
    const isReadOnly = !field.editable || !isRedacting;

    return (
      <td
        key={field.name}
        className={styles.tableDefinition}
        style={{ width: field.width }}
      >
        <CustomInput
          name={field.name}
          value={row[field.name] ?? ''}
          readOnly={isReadOnly}
          onChange={(e) => handleChange(e, rowIndex)}
          onBlur={(e) => handleBlur(e, rowIndex)}
          ref={(el) => (!isReadOnly && (field.format === 'int' || field.format === 'float')
            ? setCellRef(el, rowIndex, field.name)
            : null)}
        />

        {invalidCell
          && invalidCell.rowIndex === rowIndex
          && invalidCell.field === field.name
          && cellRefs.current[rowIndex]?.[field.name] && (
            <OverlayTooltip
              message={invalidMessage}
              targetRef={cellRefs.current[rowIndex][field.name]}
              onTimeout={clearInvalidTooltip}
              timeout={3000}
            />
        )}

      </td>
    );
  };

  const renderFieldOrSelect = (field, row, rowIndex) => {
    if (field.name === 'index') return renderIndexField(rowIndex);
    if (field.format === 'select') return renderSelectField(field, row, rowIndex);
    return renderInputField(field, row, rowIndex);
  };

  const tableClassNames = [styles.table, isRedacting ? styles.tablePrimaryThickBorder : ''].filter(Boolean).join(' ');

  const handleRowClick = (rowIndex) => {
    dispatch(spectroStepsActions.setFocusedStep({ tabId, value: rowIndex }));
  };

  const removeRow = (rowIndex) => {
    if (!isRedacting) return;
    if (rows.length <= 1) return; // prevent removing last row

    dispatch(
      spectroStepsActions.deleteStepByIndex({ tabId, index: rowIndex }),
    );
  };

  const addRow = () => {
    if (!isRedacting) return;
    dispatch(spectroStepsActions.addStep(tabId));
  };

  const getDeleteCellClassName = (rowIndex, isRedacting) => {
    const classes = [styles.deleteCell];
    if (isRedacting && rowIndex > 0) {
      return classes.join(' ');
    }
    classes.push(styles.hiddenDelete);
    return classes.join(' ');
  };

  return (
    <div ref={tableRef} onDoubleClick={handleDoubleClick} className={styles.stepTable}>
      <table className={tableClassNames}>
        <thead>
          <tr>
            {fields.map((field) => (
              <th key={field.name} className={styles.tableHeader}>
                {field.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              onClick={() => handleRowClick(rowIndex)}
              className={rowIndex === focusedStep ? styles.focusedRow : ''}
            >
              {fields.map((field) => renderFieldOrSelect(field, row, rowIndex))}

              <td
                className={getDeleteCellClassName(rowIndex, isRedacting)}
              >
                <span
                  className="py-1 fw-bold"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeRow(rowIndex);
                  }}
                >
                  ×
                </span>
              </td>
            </tr>
          ))}

          {isRedacting && (
            <tr
              className={styles.plusRow}
              onClick={() => addRow()}
            >
              <td className={styles.plusCell} colSpan={1}>
                +
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default SpectroSteps;
