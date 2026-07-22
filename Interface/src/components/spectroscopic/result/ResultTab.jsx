import React, { useState, useEffect, useCallback } from 'react';

import { Container, Row, Col } from 'react-bootstrap';

import { Allotment } from 'allotment';
import { useSelector } from 'react-redux';
import SpectroTracesPlot from './SpectroTracesPlot';
import SpectroTracesList from './SpectroTracesList';
import { selectSpectroProcessedPlotsById } from '../../../services/selectors/spectroPlots/spectroPlotsBase';
import ResultParams from './ResultParams';
import { useLineStyleGenerator } from '../../../utils/plotUtils';

function ResultTab(props) {
  const { tabId } = props.params;
  const subTab = props.api.id;

  const rawTraces = useSelector((state) => selectSpectroProcessedPlotsById(state, tabId));

  const initTraces = rawTraces.map((trace, index) => ({
    ...trace,
    name: trace.name ?? `Кривая ${index + 1}`,
    isDisplayed: true,
    originalIndex: index,
  }));

  const [indexedTraces, setIndexedTraces] = useState(initTraces); // array for to be serializable for redux

  useEffect(() => {
    const formatedTraces = rawTraces.map((trace, index) => ({
      ...trace,
      name: trace.polarTitle ?? `Кривая ${index + 1}`,
      isDisplayed: true,
      originalIndex: index,
    }));

    setIndexedTraces(formatedTraces);
  }, [rawTraces]);

  const changeIsDisplayed = useCallback((traceIndex) => {
    setIndexedTraces((prev) => prev.map((trace, index) => (index === traceIndex ? { ...trace, isDisplayed: !trace.isDisplayed } : trace)));
  }, []);

  const displayedTraces = indexedTraces.filter((trace) => trace.isDisplayed);

  const getLineStyle = useLineStyleGenerator();

  const getItemStyle = useCallback((itemIndex, item) => {
    if (item.polarTitle === 'A[+]')console.log(itemIndex, item);
    return getLineStyle({ index: item?.originalIndex ?? itemIndex });
  }, [getLineStyle]);

  return (
    <Container fluid style={{ height: '100%' }}>
      <Allotment vertical>
        <Allotment.Pane minSize={25} preferredSize={180}>
          <div style={{ height: '100%', width: '100%' }}>
            <Row style={{ height: '100%', width: '100%' }}>
              <Col style={{ width: 'fit-content', height: '100%' }}>
                <SpectroTracesList
                  displayedTraces={indexedTraces}
                  tabId={tabId}
                  changeIsDisplayed={changeIsDisplayed}
                  getItemStyle={getItemStyle}
                />
              </Col>
              <Col>
                <ResultParams tabId={tabId} />
              </Col>
            </Row>
          </div>
        </Allotment.Pane>
        <Allotment.Pane minSize={50}>
          <div style={{ height: '100%', width: '100%' }}>
            <SpectroTracesPlot
              tabId={tabId}
              traces={displayedTraces}
              getItemStyle={getItemStyle}
              initiator={subTab}
            />
          </div>
        </Allotment.Pane>
      </Allotment>
    </Container>
  );
}

export default ResultTab;
