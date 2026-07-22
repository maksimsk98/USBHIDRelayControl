import React from 'react';
import { Container } from 'react-bootstrap';

import CalibrationDepForm from './DependencyForm';
import PointTable from './PointTable';

function CalibDepenedencySubTab(props) {
  const { parentId } = props.params;

  return (
    <Container
      fluid
      style={{
        display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', overflowX: 'auto',
      }}
    >
      <CalibrationDepForm parentId={parentId} />
      <PointTable parentId={parentId} />
    </Container>
  );
}

export default CalibDepenedencySubTab;
