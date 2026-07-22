import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Table } from 'react-bootstrap';

import {
  peaksActions, selectComponentNamesOptions, selectIsSomeDefinedRef, selectIsPeaksRedacting, selectPeaksById, selectTimeUnit,
} from '../../../services/reduxImportDispatcher';

import { EMPTY_ARRAY } from '../../../constants/constants';

import styles from './InteractivePeakTable.module.css';
import { changeSubstanceName } from '../../../services/thunks/peaks/peaksThunks';

function InteractivePeakTable({
  parentId,
  peakTableParams = {
    number: true,
    exitTime: true,
    componentName: true,
    concentrationRef: true,
    concentrationCalc: true,
    /* concentration: false, */
    height: true,
    area: true,
    halfWidth: true,
    asymmetry: false,
    efficiency: false,
    resolution: false,
    relativeTime: false,
    peakValley: false,
  },
  headerLayoutParams = null,
  containerStyle,
  tableStyle,
}) {
  const dispatch = useDispatch();

  const data = useSelector((state) => selectPeaksById(state, parentId)) ?? EMPTY_ARRAY;
  const timeUnit = useSelector((state) => selectTimeUnit(state, parentId));

  const componentOptions = useSelector((state) => selectComponentNamesOptions(state, parentId));

  // optimistic local mirror: peakNumber -> component
  const [localComponents, setLocalComponents] = React.useState({});
  const [pendingByPeak, setPendingByPeak] = React.useState({});

  const isDefinedRefConc = useSelector((state) => selectIsSomeDefinedRef(state, parentId));

  // sync from redux → local (when data обновился извне)
  React.useEffect(() => {
    const next = {};
    data.forEach((p) => {
      next[p.peakNumber] = p.component ?? '';
    });
    setLocalComponents(next);
  }, [data]);

  const handleComponentChange = React.useCallback(
    (peakNumber, newSubstanceName) => {
      if (pendingByPeak[peakNumber]) return;

      // 1. найти row (0-based) для API
      const row = data.findIndex((p) => p.peakNumber === peakNumber);
      if (row === -1) return;

      const prevValue = localComponents[peakNumber];
      if (prevValue === newSubstanceName) return;

      // 2. optimistic update
      setLocalComponents((prev) => ({
        ...prev,
        [peakNumber]: newSubstanceName,
      }));

      setPendingByPeak((prev) => ({
        ...prev,
        [peakNumber]: true,
      }));

      // 3. сервер
      dispatch(
        changeSubstanceName({
          row,
          newSubstanceName,
          tabId: parentId,
        }),
      )
        .unwrap()
        .catch(() => {
          // 4. rollback (локальный)
          setLocalComponents((prev) => ({
            ...prev,
            [peakNumber]: prevValue,
          }));
        })
        .finally(() => {
          // 5. снять pending в любом случае
          setPendingByPeak((prev) => ({
            ...prev,
            [peakNumber]: false,
          }));
        });
    },
    [data, localComponents, pendingByPeak, dispatch, parentId],
  );

  const hasComponentOptions = componentOptions && componentOptions.length > 0;

  const canChange = hasComponentOptions && !isDefinedRefConc;

  const tableRef = React.useRef(null);

  const isRedacting = useSelector((state) => selectIsPeaksRedacting(state, parentId));

  const handleDoubleClick = React.useCallback(() => {
    dispatch(
      peaksActions.togglePeaksRedacting(parentId),
    );
  }, [dispatch, parentId, isRedacting]);

  React.useEffect(() => {
    if (!isRedacting) return;

    const handleClickOutside = (e) => {
      if (isRedacting === false) return;
      if (!tableRef.current?.contains(e.target)) {
        dispatch(
          peaksActions.setPeaksRedacting({
            tabId: parentId,
            value: false,
          }),
        );
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isRedacting, dispatch, parentId]);

  return (
    <Table
      ref={tableRef}
      bordered
      style={{ fontSize: '12px', marginBottom: '0px' }}
      className={isRedacting ? styles.tableRedacting : undefined}
      onDoubleClick={handleDoubleClick}
    >
      <thead style={headerLayoutParams}>
        <tr>
          {peakTableParams.number && <th>Пик</th>}
          {peakTableParams.exitTime && <th>{`Время (${timeUnit === 'min' ? 'мин.' : 'сек.'})`}</th>}
          {peakTableParams.height && <th>Высота</th>}
          {peakTableParams.halfWidth && <th>Полуширина</th>}
          {peakTableParams.area && <th>Площадь</th>}
          {peakTableParams.componentName && <th>Компонент</th>}
          {/* {peakTableParams.concentration && <th>Концентрация</th>} */}
          {peakTableParams.concentrationRef && <th>Реф. конц.</th>}
          {peakTableParams.concentrationCalc && <th>Выч. конц.</th>}
          {peakTableParams.asymmetry && <th>Асимметрия</th>}
          {peakTableParams.efficiency && <th>Эффективность</th>}
          {peakTableParams.resolution && <th>Разрешение</th>}
          {peakTableParams.relativeTime && <th>Относительное время</th>}
          {peakTableParams.peakValley && <th>Пик-долина</th>}
        </tr>
      </thead>
      <tbody>
        {data.map((peak) => (
          <tr key={peak.peakNumber}>
            {peakTableParams.number && <td>{peak.peakNumber}</td>}
            {peakTableParams.exitTime && <td>{(peak.time / (timeUnit === 'min' ? 60 : 1)).toFixed(2)}</td>}
            {peakTableParams.height && <td>{peak.height}</td>}
            {peakTableParams.halfWidth && <td>{peak.halfwidth}</td>}
            {peakTableParams.area && <td>{peak.area}</td>}

            {peakTableParams.componentName && (
              <td>
                {!canChange ? (
                  <div className={`${styles.input} ${styles.inputReadonly}`}>
                    {localComponents[peak.peakNumber] || '\u00A0'}
                  </div>
                ) : (
                  <select
                    className={`${styles.input} ${styles.cellControl}`}
                    style={{
                      pointerEvents: isRedacting ? 'auto' : 'none',
                    }}
                    value={localComponents[peak.peakNumber] ?? ''}
                    onChange={(e) => handleComponentChange(peak.peakNumber, e.target.value)}
                  >
                    <option value="" />
                    {componentOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}
              </td>
            )}

            {/* {peakTableParams.concentration && <td>{peak.concentration}</td>} */}
            {peakTableParams.concentrationRef && <td>{peak.concentrationRef}</td>}
            {peakTableParams.concentrationCalc && <td>{peak.concentrationCalc}</td>}
            {peakTableParams.asymmetry && <td>{peak.asymmetry}</td>}
            {peakTableParams.efficiency && <td>{peak.efficiency}</td>}
            {peakTableParams.resolution && <td>{peak.resolution}</td>}
            {peakTableParams.relativeTime && <td>{peak.relativeTime}</td>}
            {peakTableParams.peakValley && <td>{peak.peakValley}</td>}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

export default InteractivePeakTable;
