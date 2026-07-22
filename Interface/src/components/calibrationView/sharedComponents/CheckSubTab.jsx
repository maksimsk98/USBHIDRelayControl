import React from 'react';
import { Container, Table } from 'react-bootstrap';

import { useSelector } from 'react-redux';

import { selectCheckPointsByTabId } from '../../../services/reduxImportDispatcher';

import { EMPTY_ARRAY } from '../../../constants/constants';

function CheckSubTab(props) {
  const { parentId } = props.params;
  const pointData = useSelector(((state) => selectCheckPointsByTabId(state, parentId))) ?? EMPTY_ARRAY;

  return (
    <Container fluid style={{ overflowX: 'auto' }}>
      <Table className="mt-2" bordered style={{ fontSize: '12px' }}>
        <thead>
          <tr>
            <th>Точка</th>
            <th>Площадь</th>
            <th>Концентрация</th>
            <th>Выч. конц</th>
            <th>Абс. отклонение</th>
            <th>Отн. отклонение</th>
          </tr>
        </thead>
        <tbody>
          {pointData.map((row, index) => (
            <tr key={index}>
              <td>{index + 1}</td>
              <td>{row.response?.toFixed(2) ?? ''}</td>
              <td>{row.concentration?.toFixed(2) ?? ''}</td>
              <td>{row.calculatedConcentration?.toFixed(2) ?? ''}</td>
              <td>{row.absDeviation?.toFixed(2) ?? ''}</td>
              <td>{row.relDeviation?.toFixed(2) ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
}

export default CheckSubTab;
