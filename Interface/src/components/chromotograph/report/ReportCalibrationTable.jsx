import React from 'react';
import { Table } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import { selectCalibrationTableSubstances } from '../../../services/selectors/peaks/peaksBase';

import styles from './ReportTable.module.css';

const thStyle = {
  border: '1px solid #000',
  padding: '4px',
  fontWeight: 'bold',
  fontSize: '12px',
  textAlign: 'center',
};

const tdStyle = {
  border: '1px solid #000',
  padding: '4px',
  fontSize: '12px',
};

function ReportCalibrationTable({ parentId, mockData, docxMode = false }) {
  const substancesRedux = useSelector((state) => selectCalibrationTableSubstances(state, parentId));

  const substances = mockData ?? substancesRedux;

  if (docxMode && (!substances || substances.length === 0)) {
    return (
      <div style={{ marginTop: 6 }}>
        Градуировочные данные отсутствуют
      </div>
    );
  }

  if (!substances || substances.length === 0) {
    return (
      <div className={styles.tableContainer}>
        <div className={styles.emptyMessage}>
          Градуировочные данные отсутствуют
        </div>
      </div>
    );
  }

  if (docxMode) {
    return (
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginTop: 6,
        }}
      >
        <thead>
          <tr>
            <th style={thStyle}>Номер</th>
            <th style={thStyle}>Компонент</th>
            <th style={thStyle}>Время</th>
            <th style={thStyle}>k1</th>
            <th style={thStyle}>СКО</th>
            <th style={thStyle}>КК</th>
          </tr>
        </thead>
        <tbody>
          {substances.map((s, i) => (
            <tr key={s.index ?? s.name ?? i}>
              <td style={tdStyle}>{s.index ?? ''}</td>
              <td style={tdStyle}>{s.name ?? ''}</td>
              <td style={tdStyle}>
                {typeof s.retentionTime === 'number'
                  ? s.retentionTime.toFixed(2)
                  : ''}
              </td>
              <td style={tdStyle}>
                {typeof s.coefficients?.k1 === 'number'
                  ? s.coefficients.k1.toFixed(3)
                  : ''}
              </td>
              <td style={tdStyle}>
                {typeof s.meanSquareDeviationAbs === 'number'
                  ? s.meanSquareDeviationAbs.toFixed(3)
                  : ''}
              </td>
              <td style={tdStyle}>
                {typeof s.correlationCoefficient === 'number'
                  ? s.correlationCoefficient.toFixed(3)
                  : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <div className={styles.tableContainer}>
      <Table bordered className={styles.reportBootstrapTable}>
        <thead>
          <tr>
            <th>Номер</th>
            <th>Компонент</th>
            <th>Время</th>
            <th>k1</th>
            <th>СКО</th>
            <th>КК</th>
          </tr>
        </thead>
        <tbody>
          {substances.map((s, i) => (
            <tr key={s.index ?? s.name ?? i}>
              <td>{s.index ?? ''}</td>
              <td>{s.name ?? ''}</td>
              <td>{typeof s.retentionTime === 'number' ? s.retentionTime.toFixed(2) : ''}</td>
              <td>{typeof s.coefficients?.k1 === 'number' ? s.coefficients.k1.toFixed(3) : ''}</td>
              <td>{typeof s.meanSquareDeviationAbs === 'number' ? s.meanSquareDeviationAbs.toFixed(3) : ''}</td>
              <td>{typeof s.correlationCoefficient === 'number' ? s.correlationCoefficient.toFixed(3) : ''}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

export default ReportCalibrationTable;
