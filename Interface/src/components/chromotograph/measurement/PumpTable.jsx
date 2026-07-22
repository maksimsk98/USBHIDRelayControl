import React from 'react';
import { Table } from 'react-bootstrap';

import { useSelector } from 'react-redux';
import styles from './PumpTable.module.css';

import { selectActiveStage, selectIsThisMeasurementActive, selectLastStepTo, selectTimeUnit } from '../../../services/reduxImportDispatcher';
import { tryConvertTimeTo } from '../../../utils/validation';
import { selectGradientPumpStep } from '../../../services/selectors/mainGradient/mainGradientBase';

// I KNOW THAT A_H SHOULD AT LEAST BE A_N BUT I AM JUST FOLLOWING ORDERS

function PumpTable(props) {
  const { parentId, handleClick, passedData = null } = props;

  const lastStepTo = useSelector((state) => selectLastStepTo(state, { tabId: parentId }));
  const timeUnit = useSelector((state) => selectTimeUnit(state, parentId));
  const convertedLastTo = tryConvertTimeTo(lastStepTo, timeUnit);

  const pumpParams = useSelector((state) => state.pumpProgramReducer[parentId]);
  const { pumpMode, isocratProgram, gradientProgram } = passedData ?? pumpParams;

  const isThisMeasActive = useSelector(state => selectIsThisMeasurementActive(state, parentId))

  const activeStage = useSelector((state) => selectActiveStage(state, parentId));
  const activeGradientStep = useSelector(selectGradientPumpStep);
  const currentStep = activeGradientStep ?? activeStage ?? null
  const effectiveStep = isThisMeasActive ? currentStep : null;

  const getRowClassName = (rowIndex, effectiveStep) => {
    if (effectiveStep === undefined || effectiveStep === null) return undefined;
    if (rowIndex === effectiveStep) return 'table-primary';
    if (rowIndex < effectiveStep) return 'table-secondary';
    return undefined;
  };

  const formIsocratTable = () => {
    if (!isocratProgram) return null;

    const {
      isContinuousSupply,
      isocratVolume,
      gradientVolume,
      flowRate,
      startFlowRate,
      conditioningTime,
    } = isocratProgram;

    const isocraticTimeRaw = isocratVolume / flowRate;
    const gradientTimeRaw = gradientVolume / flowRate;
    const firstSwitchToRaw = isocraticTimeRaw + gradientTimeRaw;
    const secondSupplyToRaw = firstSwitchToRaw + isocraticTimeRaw;
    const secondSwitchToRaw = secondSupplyToRaw + gradientTimeRaw;

    const isocraticTime = Math.round(isocraticTimeRaw);
    const gradientTime = Math.round(gradientTimeRaw);
    const firstSwitchTo = Math.round(firstSwitchToRaw);
    const secondSupplyTo = Math.round(secondSupplyToRaw);
    const secondSwitchTo = Math.round(secondSwitchToRaw);

    const tableData = [
      {
        step: 'Набор', from: '', to: '', flowRate: '', A_H: '', A_K: '',
      },
      {
        step: 'Разгон', from: '', to: '', flowRate: startFlowRate, A_H: '', A_K: '',
      },
      {
        step: 'Кондиционирование', from: 0, to: conditioningTime, flowRate, A_H: 100, A_K: 100,
      },
      {
        step: 'Ожидание', from: '', to: '', flowRate: '', A_H: '', A_K: '',
      },
      {
        step: 'Подача',
        from: 0,
        to: isContinuousSupply ? isocraticTime : convertedLastTo,
        flowRate,
        A_H: 100,
        A_K: 100,
      },
      ...(isContinuousSupply
        ? [
          {
            step: 'Переключение', from: isocraticTime, to: firstSwitchTo, flowRate, A_H: 100, A_K: 0,
          },
          {
            step: 'Подача', from: firstSwitchTo, to: secondSupplyTo, flowRate, A_H: 0, A_K: 0,
          },
          {
            step: 'Переключение', from: secondSupplyTo, to: secondSwitchTo, flowRate, A_H: 0, A_K: 100,
          },
        ]
        : []),
    ];

    return renderTable(tableData);
  };

  const formGradientTable = () => {
    if (!gradientProgram) return null;

    const {
      startFlowRate,
      conditioningTime,
      steps = [],
    } = gradientProgram;

    const { flowRate: firstFlowRate = '', A_H: firstA_H = '' } = steps[0] ?? {};

    const tableData = [
      {
        step: 'Набор', from: '', to: '', flowRate: '', A_H: '', A_K: '',
      },
      {
        step: 'Разгон', from: '', to: '', flowRate: startFlowRate, A_H: '', A_K: '',
      },
      {
        step: 'Кондиционирование', from: 0, to: conditioningTime, flowRate: firstFlowRate, A_H: firstA_H, A_K: firstA_H,
      },
      {
        step: 'Ожидание', from: '', to: '', flowRate: '', A_H: '', A_K: '',
      },
      ...steps.map((step, index) => ({
        step: index + 1,
        from: step.from,
        to: step.to,
        flowRate: step.flowRate,
        A_H: step.A_H,
        A_K: step.A_K,
      })),
    ];

    return renderTable(tableData);
  };

  const renderTable = (tableData) => (
    <Table size="sm" bordered className={styles.table} onDoubleClick={handleClick}>

      <thead>
        <tr>
          <th className={styles.tableHeader}>Этап</th>
          <th className={styles.tableHeader}>От</th>
          <th className={styles.tableHeader}>До</th>
          <th className={styles.tableHeader}>Расход</th>
          <th className={styles.tableHeader}>A(н)</th>
          <th className={styles.tableHeader}>A(к)</th>
        </tr>
      </thead>
      <tbody>
        {tableData.map((row, index) => (
          <tr key={index} className={getRowClassName(index, effectiveStep)}>
            <td className={styles.tableDefinition} style={{ minWidth: '120px', width: '140px' }}>{row.step}</td>
            <td className={styles.tableDefinition} style={{ minWidth: '40px', width: '60px' }}>{row.from}</td>
            <td className={styles.tableDefinition} style={{ minWidth: '40px', width: '60px' }}>{row.to}</td>
            <td className={styles.tableDefinition} style={{ minWidth: '40px', width: '60px' }}>{row.flowRate}</td>
            <td className={styles.tableDefinition} style={{ minWidth: '40px', width: '60px' }}>{row.A_H}</td>
            <td className={styles.tableDefinition} style={{ minWidth: '40px', width: '60px' }}>{row.A_K}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );

  const modeRenderMap = {
    isocrat: formIsocratTable,
    gradient: formGradientTable,
  };

  const renderContent = modeRenderMap[pumpMode] || (() => null);

  return (
    <div className={styles.pumpTable}>
      {renderContent()}
    </div>
  );
}

export default PumpTable;
