import React from 'react';
import { Table } from 'react-bootstrap';
import _ from 'lodash';

import styles from './CalibPeaksTable.module.css';
import { normalizeDecimalInput, tryConvertTimeTo } from '../../../../utils/validation';

const isValidConcentration = (value) =>
  // Allow only numbers and at most one decimal point
  /^(\d+(\.\d*)?|\.\d+)$/.test(value);
function CalibPeaksTable({
  headerLayoutParams = null,
  containerStyle,
  tableStyle,
  headers,
  tableData,
  handleInputSelect,
  setTableData,
}) {
  /* console.log(tableData, headers); */

  const handleInputBlur = (event, peakIndex, columnKey) => {
    const newValue = event.target.value.trim();
    const newState = _.cloneDeep(tableData);

    if (columnKey === 'component') {
      // Check if the new component name exists elsewhere in the table
      const duplicateIndex = tableData.findIndex((row, index) => index !== peakIndex && row.component === newValue);

      if (duplicateIndex !== -1) {
        // Clear the duplicate component name
        newState[duplicateIndex].component = '';
      }
      newState[peakIndex][columnKey] = newValue;
    }

    if (columnKey === 'concentration') {
      // Convert to a number or reset to an empty string if invalid
      const numericValue = newValue === '' || isNaN(Number(newValue)) ? 0 : Number(newValue);
      newState[peakIndex][columnKey] = numericValue;
    }

    setTableData(newState);
  };

  const handleInputChange = (event, peakIndex, columnKey) => {
    const newState = [...tableData];
    const value = normalizeDecimalInput(event);
    if (columnKey === 'concentration') {
      if (isValidConcentration(value) || value === '') {
        newState[peakIndex][columnKey] = value === '' ? 0 : value;
      }
    } else {
      newState[peakIndex][columnKey] = value;
    }

    setTableData(newState);
  };

  return (
    <div style={containerStyle}>
      <Table bordered className={styles.inputTable} style={tableStyle}>
        <thead style={headerLayoutParams}>
          <tr>
            {headers.map((header, index) => <th key={index}>{header}</th>)}
          </tr>
        </thead>
        <tbody>
          {tableData.map((peak, rowIndex) => (
            <tr key={rowIndex}>
              <td>{peak.peakNumber}</td>
              <td className={styles.tableCell}>
                <input
                  type="text"
                  className={styles.inputField}
                  value={tryConvertTimeTo(peak.time, 'min')}
                  onChange={(e) => handleInputChange(e, rowIndex, 'time')}
                  readOnly
                />
              </td>
              <td className={styles.tableCell}>
                {/* <CustomInputSelect
                  className={styles.inputField}
                  value={peak.component}
                  onChange={(e) => handleInputChange(e, rowIndex, 'component')}
                  onBlur={(e) => handleInputBlur(e, rowIndex, 'component')}
                  onSelect={handleInputSelect(rowIndex, 'component')}
                /> */}
                <input
                  type="text"
                  className={styles.inputField}
                  value={peak.component}
                  onChange={(e) => handleInputChange(e, rowIndex, 'component')}
                  onBlur={(e) => handleInputBlur(e, rowIndex, 'component')}
                />
              </td>
              <td className={styles.tableCell}>
                <input
                  type="text"
                  maxLength="16"
                  className={styles.inputField}
                  value={peak.concentration}
                  onChange={(e) => handleInputChange(e, rowIndex, 'concentration')}
                  onBlur={(e) => handleInputBlur(e, rowIndex, 'concentration')}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

export default CalibPeaksTable;
