import React, {
  memo, useMemo, useRef,
} from 'react';
import { useSelector } from 'react-redux';
import FullCellInputTD from '../custom/CustomTDCellInput';
import { selectCurrentInjection } from '../../services/selectors/autosampler/autosamplerBase';

import styles from './InjectionRow.module.css';

const InjectionRow = memo(({
  row,
  rowIndex,
  onRowChange,
  clearRow,
  methods,
  vialLabels,
  disabled,
  isActive,
  handleInjectionCountChange,
  handleTABlur,
  handleInjectionBlur,
  rangesMap: generalRanges,
  commonOnFocus,
  commonOnBlur,
}) => {
  const typeaheadRef = useRef(null);

  const currentInjection = useSelector(selectCurrentInjection);

  const rangesMap = useMemo(() => {
    if (!isActive) return generalRanges;
    const newInjRng = [...generalRanges.injectionsCount];
    newInjRng[1] = currentInjection;
    return {
      injectionsCount: newInjRng,
    };
  }, [isActive, generalRanges, currentInjection]);

  return (
    <tr className={isActive ? styles.focusedRow : ''}>
      <td>{vialLabels[row.vialIndex]}</td>
      <FullCellInputTD
        type="input"
        name="sampleName"
        value={row.sampleName}
        onChange={(e) => onRowChange(rowIndex, 'sampleName', e.target.value)}
        rowIndex={rowIndex}
        disabled={disabled || isActive}
      />
      <FullCellInputTD
        ref={typeaheadRef}
        type="typeahead"
        name="method"
        selected={row.method ? [row.method] : []}
        options={methods}
        onChange={([sel]) => onRowChange(rowIndex, 'method', sel ?? '')}
        onBlur={(e) => {
          commonOnBlur();
          handleTABlur(e, typeaheadRef, rowIndex);
        }}
        onFocus={commonOnFocus}
        rowIndex={rowIndex}
        disabled={disabled || isActive}
      />
      <FullCellInputTD
        type="input"
        name="injectionsCount"
        value={row.injectionsCount || ''} // no money no honey (we don't care about 0 as it is no op , so blank)
        onChange={(e) => handleInjectionCountChange(e, rowIndex)}
        onBlur={(e) => {
          commonOnBlur();
          handleInjectionBlur(e, rowIndex, rangesMap);
        }}
        onFocus={commonOnFocus}
        rowIndex={rowIndex}
        disabled={disabled}
      />
    </tr>
  );
});

export default InjectionRow;
