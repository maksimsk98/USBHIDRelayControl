import React from 'react';
import { Allotment } from 'allotment';

import { Container } from 'react-bootstrap';

import ChromaPlot from '../ChromaPlot.jsx';
import PasportForm from './PassportForm.jsx';

function PassportTab(props) {
  const parentId = props.params.chromaTabId;

  return (
    <Container fluid style={{ height: '100%' }}>
      <Allotment vertical>
        <Allotment.Pane minSize={25} preferredSize={270}>
          <div style={{ height: '100%', width: '100%', overflowY: 'auto' }}>
            <PasportForm parentId={parentId} />
          </div>
        </Allotment.Pane>
        <Allotment.Pane minSize={50}>
          <div style={{ height: '100%', width: '100%' }}>
            <ChromaPlot key={`plot-${parentId}`} parentId={parentId} parentTab="passport" />
          </div>
        </Allotment.Pane>
      </Allotment>
    </Container>
  );
}

export default PassportTab;
