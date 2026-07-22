import React, { useMemo, useState, useEffect } from 'react';

import { useSelector } from 'react-redux';
import {
  selectPeaksById,
  selectPeakValleyAvailable,
  selectTimeUnit,
} from '../../../services/reduxImportDispatcher';
import styles from './ReportTable.module.css';
import { safeToFixed } from '../../../utils/validation';

// HACK: NBSP to force line-box for empty cells.
// Needed because empty divs have zero line-height in flex column layout.
const renderWithNbspHack = (value) => {
  if (value === null || value === undefined || value === '') {
    return '\u00A0'; // HACK
  }
  return value;
};

function ReportPeaksTable({
  parentId,
  peakTableParams = {},
  mockData = null,
  docxMode = false,
  onHiddenColumnsChange,
  calibMetaData,
}) {
  const reduxData = useSelector((s) => selectPeaksById(s, parentId)) ?? [];
  const data = mockData ?? reduxData;

  const timeUnit = useSelector((s) => selectTimeUnit(s, parentId));

  const [hoveredRow, setHoveredRow] = useState(null);

  const {
    concentrationUnits,
    reperPeak,
  } = calibMetaData ?? {};

  const canShowPeakValley = useSelector((s) => selectPeakValleyAvailable(s, parentId));
  const canShowRRT = reperPeak != null && reperPeak !== '';

  const columns = useMemo(() => {
    const cols = [];
    const concentrationLabel = `Концентрация${concentrationUnits ? ` (${concentrationUnits})` : ''}`;

    const add = (key, label, render) => cols.push({ key, label, render });

    if (peakTableParams.number) add('number', 'Пик', (p) => p.peakNumber);

    if (peakTableParams.exitTime) {
      add(
        'exitTime',
        `Время (${timeUnit === 'min' ? 'мин.' : 'сек.'})`,
        (p) => safeToFixed(
          p.time / (timeUnit === 'min' ? 60 : 1),
          2,
        ),
      );
    }

    if (peakTableParams.height) add('height', 'Высота', (p) => safeToFixed(p.height, 3));

    if (peakTableParams.halfWidth) add('halfWidth', 'Полуширина', (p) => safeToFixed(p.halfwidth, 3));

    if (peakTableParams.area) add('area', 'Площадь', (p) => safeToFixed(p.area, 2));

    if (peakTableParams.componentName) add('componentName', 'Компонент', (p) => p.component);

    if (peakTableParams.concentration) {
      add('concentration', concentrationLabel, (p) => {
        if (Number.isFinite(p.concentrationRef) && p.concentrationRef !== 0) return safeToFixed(p.concentrationRef, 3);

        if (Number.isFinite(p.concentrationCalc) && p.concentrationCalc !== 0) return safeToFixed(p.concentrationCalc, 3);

        return '';
      });
    }

    if (peakTableParams.asymmetry) add('asymmetry', 'Асимметрия', (p) => safeToFixed(p.asymmetry, 2));

    if (peakTableParams.efficiency) add('efficiency', 'Эффективность', (p) => safeToFixed(p.efficiency, 1));

    if (peakTableParams.resolution) add('resolution', 'Разрешение', (p) => safeToFixed(p.resolution, 2));

    if (peakTableParams.relativeTime) add('relativeTime', 'Относительное время', (p) => p.relativeTime);

    // RRT / Relative time
    if (peakTableParams.relativeTime && canShowRRT) { add('relativeTime', 'Время отн.', (p) => (p.relativeTime != null ? safeToFixed(p.relativeTime, 2) : '')); }

    // Peak / Valley
    if (peakTableParams.peakValley && canShowPeakValley) {
      add('pvLeft', 'P/V слева', (p) => (p.pvLeft != null ? safeToFixed(p.pvLeft, 2) : ''));

      add('pvRight', 'P/V справа', (p) => (p.pvRight != null ? safeToFixed(p.pvRight, 2) : ''));
    }

    return cols;
  }, [peakTableParams, timeUnit, concentrationUnits]);

  const { visibleColumns, hiddenColumnLabels } = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        visibleColumns: [],
        hiddenColumnLabels: [],
      };
    }

    const visible = [];
    const hiddenLabels = [];

    for (const col of columns) {
      const hasAnyValue = data.some((row) => {
        const v = col.render(row);
        return v !== null && v !== undefined && v !== '';
      });

      if (hasAnyValue) {
        visible.push(col);
      } else {
        hiddenLabels.push(col.label);
      }
    }

    return {
      visibleColumns: visible,
      hiddenColumnLabels: hiddenLabels,
    };
  }, [columns, data]);

  useEffect(() => {
    if (!onHiddenColumnsChange) return;

    if (!data || data.length === 0) {
      onHiddenColumnsChange([]);
      return;
    }

    onHiddenColumnsChange(hiddenColumnLabels);
  }, [hiddenColumnLabels, data, onHiddenColumnsChange]);

  if (docxMode && (!data || data.length === 0)) {
    return (
      <div style={{ marginTop: 6 }}>
        Пики отсутствуют
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={styles.tableContainer}>
        <div className={styles.emptyMessage}>
          Пики отсутствуют
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
            {visibleColumns.map((col) => (
              <th
                key={col.key}
                style={{
                  border: '1px solid #000',
                  padding: '4px',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  textAlign: 'center',
                  verticalAlign: 'middle',
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => (
            <tr key={rowIdx}>
              {visibleColumns.map((col) => (
                <td
                  key={col.key}
                  style={{
                    border: '1px solid #000',
                    padding: '4px',
                    fontSize: '12px',
                    textAlign:
                      typeof col.render(row) === 'number' ? 'right' : 'left',
                  }}
                >
                  {
                    // HACK: force non-zero height for empty cells
                    renderWithNbspHack(col.render(row))
                  }
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <div className={styles.tableContainer}>
      <div className={styles.tableWrapper}>
        {visibleColumns.map((col) => (
          <div key={col.key} className={styles.column}>
            <div className={styles.headerCell}>{col.label}</div>

            {data.map((row, idx) => (
              <div
                key={idx}
                className={
                  hoveredRow === idx
                    ? `${styles.bodyCell} ${styles.hover}`
                    : styles.bodyCell
                }
                onMouseEnter={() => {
                  setHoveredRow(idx);
                }}
                onMouseLeave={() => setHoveredRow(null)}
              >
                {
                  // HACK: force non-zero height for empty cells
                  renderWithNbspHack(col.render(row))
                }
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ReportPeaksTable;
