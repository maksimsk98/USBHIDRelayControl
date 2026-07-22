import React, { useCallback, useState } from 'react';
import { Table } from 'react-bootstrap';
import 'react-bootstrap-typeahead/css/Typeahead.css';
import { useSelector } from 'react-redux';
import { clampingBlur, intSetter } from '../../utils/setters';
import { selectActualGenMethods } from '../../services/reduxImportDispatcher';
import InjectionRow from './InjectionRow ';
import { selectActiveAutoStep, selectIsAutoControlOn, selectVialLabels } from '../../services/selectors/autosampler/autosamplerBase';
import { isValidRow } from '../../utils/autoSampler';

const rangesMap = {
  injectionsCount: [3, 0, 100],
};

function InjectionTable({
  rows, onRowChange, clearRow, hideUnused,
}) {
  const methods = useSelector(selectActualGenMethods);
  const activeStep = useSelector(selectActiveAutoStep);
  const isRunning = useSelector(selectIsAutoControlOn);
  const vialLabels = useSelector(selectVialLabels);

  const getFinishedDisabled = (stepIndex) => {
    if (!isRunning || activeStep == null) return false;
    return stepIndex < activeStep;
  };

  const getIsActiveRow = (index) => index === activeStep && isRunning;

  const handleInjectionCountChange = useCallback(
    (e, i) => {
      const { name, value } = e.target;

      intSetter({
        name,
        value,
        rangesMap,
        setterDispatch: {
          [name]: (v) => onRowChange(i, name, v),
        },
      });
    },
    [onRowChange],
  );

  const handleInjectionBlur = useCallback((e, i, rangesMap) => {
    const { name, value } = e.target;
    clampingBlur({
      name,
      value,
      rangesMap,
      setterDispatch: {
        [name]: (v) => onRowChange(i, name, v),
      },
      returnAs: 'num',
    });
  }, [onRowChange]);

  const handleTABlur = useCallback((e, typeaheadRef, rowIndex) => {
    if (!methods.includes(e.target.value)) {
      clearRow(rowIndex);
      typeaheadRef.current.clear(); // this resets the text
    }
  }, [methods]);

  const [editingIndex, setEditingIndex] = useState(null);

  return (
    <div style={{
      maxHeight: '396px',
      overflowY: 'auto',
      border: '1px solid #ced4da', // Bootstrap default gray
    }}
    >
      <Table bordered size="sm" className="mb-0">
        <thead>
          <tr>
            <th>Виала</th>
            <th>Имя пробы</th>
            <th>Метод</th>
            <th>Число инжекций</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const isEditing = editingIndex === i;
            const shouldRender = !hideUnused || isValidRow(row) || isEditing;

            return shouldRender ? (
              <InjectionRow
                key={row.vialIndex}
                row={row}
                rowIndex={i}
                onRowChange={onRowChange}
                clearRow={clearRow}
                methods={methods}
                vialLabels={vialLabels}
                disabled={getFinishedDisabled(i)}
                isActive={getIsActiveRow(i)}
                handleInjectionCountChange={handleInjectionCountChange}
                handleTABlur={handleTABlur}
                handleInjectionBlur={handleInjectionBlur}
                rangesMap={rangesMap}
                commonOnFocus={() => setEditingIndex(i)}
                commonOnBlur={() => setEditingIndex(null)}
              />
            ) : null;
          })}
        </tbody>
      </Table>
    </div>

  );
}

export default InjectionTable;
