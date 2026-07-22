import { useSelector } from 'react-redux';
import { Table } from 'react-bootstrap';

import { selectEffectiveDetectorType, selectLumexStepsData, selectTimeUnit } from '../../../services/reduxImportDispatcher';
import { COMMON_FIELDS, DETECTOR_FIELDS } from '../../../constants/stepFields';
import { SENSITIVITY_MAP } from '../../../constants/constants';

import styles from './ReportTable.module.css';
import { tryConvertTimeTo } from '../../../utils/validation';

function DetectorProgramTable({ parentId, docxMode = false }) {
  const stepsData = useSelector((state) => selectLumexStepsData(state, parentId));
  const detectorType = useSelector((state) => selectEffectiveDetectorType(state, parentId ));
  const timeUnit = useSelector((state) => selectTimeUnit(state, parentId));

  const columns = [...COMMON_FIELDS, ...(DETECTOR_FIELDS[detectorType] || [])];

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
            {columns.map((col) => (
              <th
                key={col.name}
                style={{
                  border: '1px solid #000',
                  padding: '4px',
                  fontWeight: 'bold',
                  fontSize: '12px',
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stepsData.map((step, idx) => (
            <tr key={idx}>
              {columns.map((col) => {
                let value = step[col.name];

                if (col.name === 'stepId') {
                  value = idx + 1;
                } else if (col.name === 'sensitivity') {
                  value = SENSITIVITY_MAP[value] ?? value;
                } else if (col.name === 'from' || col.name === 'to') {
                  value = tryConvertTimeTo(value, timeUnit);
                }

                return (
                  <td
                    key={col.name}
                    style={{ border: '1px solid #000', padding: '4px' }}
                  >
                    {value}
                  </td>
                );
              })}
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
            {columns.map((col) => (
              <th key={col.name}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stepsData.map((step, idx) => (
            <tr key={idx}>
              {columns.map((col) => {
                let value = step[col.name];

                if (col.name === 'stepId') return <td key={col.name}>{idx + 1}</td>;

                if (col.name === 'sensitivity') {
                  return (
                    <td key={col.name}>
                      {SENSITIVITY_MAP[value] ?? value}
                    </td>
                  );
                }

                if (col.name === 'from' || col.name === 'to') {
                  value = tryConvertTimeTo(value, timeUnit);
                }

                return <td key={col.name}>{value}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </Table>
    </div>

  );
}

export default DetectorProgramTable;
