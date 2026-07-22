import React, { useState } from 'react';
import {
  Button, Col, Row, Table,
} from 'react-bootstrap';
import styles from './GradientTable.module.css';
import {
  isFloatWithinLimits, isNonNegIntStrWithinLimits, isValidFromToRange, normalizeDecimalInput,
} from '../../../utils/validation';

function GradientTable({
  parentId,
  showTooltip,
  setRows,
  rows,
  handleRefChange,
  TooltipRenderer,
}) {
  const [focusedIndex, setFocusedIndex] = useState(null); // Track focused row index

  const handleInputChange = (e, index, column) => {
    let value = normalizeDecimalInput(e);

    if (column === 'to') {
      if (!isFloatWithinLimits(value, null, 2)) return;
    } else if (!isNonNegIntStrWithinLimits(value, 8)) return;

    if ((column === 'A_H' || column === 'A_K') && parseInt(value) > 100) value = 100;

    const updatedRows = [...rows];
    updatedRows[index][column] = value;
    setRows(updatedRows);
  };

  const handleInputBlur = (index, column) => {
    const updatedRows = [...rows];

    if (column === 'A_H' || column === 'A_K') {
      const A_H = parseFloat(updatedRows[index].A_H);
      const A_K = parseFloat(updatedRows[index].A_K);
      if (!isNaN(A_H)) updatedRows[index].B_H = (100 - A_H);
      if (!isNaN(A_K)) updatedRows[index].B_K = (100 - A_K);
    }

    if (column === 'to') {
      const from = updatedRows[index]?.from;
      const to = updatedRows[index]?.to;

      // Only proceed if `to` is valid and greater than `from`
      if (!isValidFromToRange(from, to)) {
        updatedRows[index].to = '';
        if (index < updatedRows.length - 1) {
          updatedRows[index + 1].from = ''; // Clear next "from"
        }
        showTooltip(index, 'to', '"До" должно быть больше "от"'); // show tooltip
        setRows(updatedRows);
        return;
      }

      if (index < updatedRows.length - 1) {
        updatedRows[index + 1].from = updatedRows[index].to;
      }
    }

    setRows(updatedRows);
  };

  const addRow = () => {
    const isFocused = focusedIndex !== null && focusedIndex < rows.length;

    // Determine 'from' based on focus or last row
    const newFrom = isFocused
      ? rows[focusedIndex].to ?? ''
      : rows.length > 0
        ? rows[rows.length - 1].to ?? ''
        : 0;

    const newRow = {
      from: newFrom,
      to: '',
      flowRate: '',
      A_H: '',
      A_K: '',
      B_H: '',
      B_K: '',
    };

    const updatedRows = [...rows];

    if (isFocused) {
      updatedRows.splice(focusedIndex + 1, 0, newRow);
      setFocusedIndex(focusedIndex + 1);
    } else {
      updatedRows.push(newRow);
      setFocusedIndex(updatedRows.length - 1);
    }

    setRows(updatedRows);
  };

  const deleteRow = () => {
    // Never allow the very last line to be removed
    if (rows.length === 1) return;

    // Decide which row we are removing
    const indexToDelete = focusedIndex !== null ? focusedIndex : rows.length - 1;

    const nextRows = rows.filter((_, i) => i !== indexToDelete);

    // Repair ‘from’ on the new neighbour if we removed a middle row
    if (indexToDelete > 0 && indexToDelete < rows.length - 1) {
      nextRows[indexToDelete].from = nextRows[indexToDelete - 1].to;
    }

    // Ensure first row’s from == 0
    nextRows[0].from = 0;

    // Set focus (row above, or first row if we deleted row 0)
    const nextFocus = indexToDelete === 0 ? 0 : indexToDelete - 1;

    setRows(nextRows);
    setFocusedIndex(nextFocus);
  };

  // Handle row focus on click
  const handleFocusRow = (index) => {
    setFocusedIndex(index);
  };

  return (
    <div>
      <Row className="flex-nowrap">
        <Col xs="auto">
          <Table bordered responsive className={styles.gradientTable}>
            <thead>
              <tr>
                <th>Этап</th>
                <th>От</th>
                <th>До</th>
                <th>Расход</th>
                <th>A(н)</th>
                <th>A(к)</th>
                <th>B(н)</th>
                <th>B(к)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={index}
                  onClick={() => handleFocusRow(index)}
                  className={index === focusedIndex ? styles.focusedRow : ''}
                >
                  <td>{index + 1}</td>

                  <td className={styles.tableCell}>
                    <input
                      type="text"
                      value={row.from ?? ''}
                      className={styles.inputField}
                      readOnly
                    />
                  </td>

                  <td className={styles.tableCell}>
                    <input
                      type="text"
                      value={row.to ?? ''}
                      onChange={(e) => handleInputChange(e, index, 'to')}
                      onBlur={() => handleInputBlur(index, 'to')}
                      ref={(el) => handleRefChange?.(el, index, 'to')}
                      className={styles.inputField}
                    />
                  </td>

                  <td className={styles.tableCell}>
                    <input
                      type="text"
                      value={row.flowRate ?? ''}
                      onChange={(e) => handleInputChange(e, index, 'flowRate')}
                      className={styles.inputField}
                      ref={(el) => handleRefChange?.(el, index, 'flowRate')}
                    />
                  </td>

                  <td className={styles.tableCell}>
                    <input
                      type="text"
                      value={row.A_H ?? ''}
                      onChange={(e) => handleInputChange(e, index, 'A_H')}
                      onBlur={() => handleInputBlur(index, 'A_H')}
                      ref={(el) => handleRefChange?.(el, index, 'A_H')}
                      className={styles.inputField}
                    />
                  </td>

                  <td className={styles.tableCell}>
                    <input
                      type="text"
                      value={row.A_K ?? ''}
                      onChange={(e) => handleInputChange(e, index, 'A_K')}
                      onBlur={() => handleInputBlur(index, 'A_K')}
                      ref={(el) => handleRefChange?.(el, index, 'A_K')}
                      className={styles.inputField}
                    />
                  </td>

                  <td className={styles.tableCell}>
                    <input
                      type="text"
                      value={row.B_H ?? ''}
                      className={styles.inputField}
                      readOnly
                    />
                  </td>

                  <td className={styles.tableCell}>
                    <input
                      type="text"
                      value={row.B_K ?? ''}
                      className={styles.inputField}
                      readOnly
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Col>

        <Col xs="auto">
          <div className="d-flex align-items-end flex-column">
            <Button style={{ width: '110px' }} className="mb-1" onClick={addRow}>
              Добавить
            </Button>
            <Button style={{ width: '110px' }} className="mb-1" onClick={deleteRow}>
              Удалить
            </Button>
          </div>
        </Col>
      </Row>

      {/* Render any visible tooltips here */}
      {TooltipRenderer}
    </div>
  );
}

export default GradientTable;
