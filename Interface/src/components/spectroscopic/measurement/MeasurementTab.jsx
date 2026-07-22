import React from 'react';
import { Allotment } from 'allotment';

import { Container, Row, Col } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import SpectroSteps from './SpectroSteps';
import SpectroPlot from '../SpectroPlot';
import SpectroMeasParams from './SpectroMeasParams';
import { selectEffectiveDetectorType } from '../../../services/reduxImportDispatcher';

function MeasurementTab(props) {
  const { tabId } = props.params;

  const detectorType = useSelector((state) => selectEffectiveDetectorType(state, tabId ));

  return (
    <Container fluid style={{ height: '100%' }}>
      <Allotment vertical>
        <Allotment.Pane minSize={25} preferredSize={180}>
          <div style={{ height: '100%', width: '100%', overflowY: 'auto' }}>
            <Row style={{
              rowGap: '12px', alignItems: 'flex-start', height: '100%', width: '100%',
            }}
            >
              <Col
                xs="auto"
                style={{
                  height: '100%', minWidth: '460px', maxWidth: '600px', flex: '1 1 0',
                }}
              >
                <SpectroSteps tabId={tabId} />
              </Col>
              <Col xs="auto">
                <SpectroMeasParams tabId={tabId} detectorType={detectorType} />
              </Col>
            </Row>
          </div>

        </Allotment.Pane>
        <Allotment.Pane minSize={50}>
          <div style={{ height: '100%', width: '100%' }}>
            <SpectroPlot tabId={tabId} />
          </div>
        </Allotment.Pane>
      </Allotment>
    </Container>
  );
}

export default MeasurementTab;
