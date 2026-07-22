import React from 'react';
import { useSelector } from 'react-redux';
import { Table } from 'react-bootstrap';

import { selectPeaksById, selectTimeUnit } from '../../../../services/reduxImportDispatcher';

import { EMPTY_ARRAY } from '../../../../constants/constants';

function PeaksTable({
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
  timeUnit,
}) {
  const data = useSelector((state) => selectPeaksById(state, parentId)) ?? EMPTY_ARRAY;
  const storedTimeUnit = useSelector((state) => selectTimeUnit(state, parentId));

  const effectiveTimeUnit = timeUnit ?? storedTimeUnit;

  return (
    <Table bordered style={{ fontSize: '12px', marginBottom: '0px' }}>
      <thead style={headerLayoutParams}>
        <tr>
          {peakTableParams.number && <th>Пик</th>}
          {peakTableParams.exitTime && <th>{`Время (${effectiveTimeUnit === 'min' ? 'мин.' : 'сек.'})`}</th>}
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
            {peakTableParams.exitTime && <td>{(peak.time / (effectiveTimeUnit === 'min' ? 60 : 1)).toFixed(2)}</td>}
            {peakTableParams.height && <td>{peak.height}</td>}
            {peakTableParams.halfWidth && <td>{peak.halfwidth}</td>}
            {peakTableParams.area && <td>{peak.area}</td>}
            {peakTableParams.componentName && <td>{peak.component}</td>}
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

export default PeaksTable;
