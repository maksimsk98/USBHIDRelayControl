import React, {
  useState, useEffect, useReducer, useMemo,
} from 'react';

import {
  Col, Container, Form, Row,
} from 'react-bootstrap';

import { Allotment } from 'allotment';
import { useDispatch, useSelector } from 'react-redux';
import PeakPlot from './PeakPlot.jsx';
import { chromaMiscActions, selectIsActCalculatedEmpty, selectIsTabFinished, selectPeakAnnotationParams, selectTabType } from '../../../services/reduxImportDispatcher.js';

import PeakParams from './PeakParams.jsx';

import ChromatogramOptionsOverlay from './ChromatogramOptionsOverlay.jsx';
import InteractivePeakTable from './InteractivePeakTable.jsx';

const plotTypes = ['measuredChromatogram', 'calculatedChromatogram'];

const radioReducer = (state, { payload = {}, type }) => {
  const { name, toggleConter } = payload;
  switch (type) {
    case 'add':
      return [...state, name];
    case 'delete':
      let newState = state.filter((plot) => plot !== name);
      if (newState.length === 0 && toggleConter) {
        const counterpart = plotTypes.find((plot) => plot !== payload);
        newState = [counterpart]; // Ensure the counterpart is checked
      }
      return newState;
    default:
      return state;
  }
};

function PeaksTab(props) {
  const dispatch = useDispatch()

  const parentId = props.params.chromaTabId;
  const tabType = useSelector((state) => selectTabType(state, parentId));
  const isTabFinished = useSelector((state) => selectIsTabFinished(state, parentId));
  const isCalculatedEmpty = useSelector((state) => selectIsActCalculatedEmpty(state, { tabId: parentId }));
  const isMeasurement = tabType === 'measurement';
  const initState = isMeasurement ? ['measuredChromatogram'] : ['calculatedChromatogram'];
  const [displayedPlots, checkBoxDispatch] = useReducer(radioReducer, initState);



  /* const [useAnnotations, setUseAnnotations] = useState(true);
  const [orientation, setOrientation] = useState('vertical');
  const [namingMode, setNamingMode] = useState('index'); */

  const annotationsConfig = useSelector(state => selectPeakAnnotationParams(state, parentId))
  const {useAnnotations, orientation, namingMode} = annotationsConfig
  const handleUseAnnotationsChange = (e) => {
    dispatch(chromaMiscActions.setUsePeakAnnotations({
      id: parentId,
      value: e.target.checked,
    }));
  };

  const handleOrientationChange = (value) => {
    dispatch(chromaMiscActions.setPeakAnnotationOrientation({
      id: parentId,
      value,
    }));
  };

  const handleNamingModeChange = (value) => {
    dispatch(chromaMiscActions.setPeakAnnotationNamingMode({
      id: parentId,
      value,
    }));
  };

  const handleCheckboxChange = (event) => {
    const isChecked = event.target.checked;
    const { name } = event.target;
    if (isChecked) {
      checkBoxDispatch({ type: 'add', payload: { name } });
    } else {
      checkBoxDispatch({ type: 'delete', payload: { name, toggleConter: !isMeasurement } });
    }
  };

  useEffect(() => {
    if (!isCalculatedEmpty && isTabFinished) {
      checkBoxDispatch({ type: 'add', payload: { name: 'calculatedChromatogram' } });
      checkBoxDispatch({ type: 'delete', payload: { name: 'measuredChromatogram' } });
    } else {
      checkBoxDispatch({ type: 'delete', payload: { name: 'calculatedChromatogram' } });
      checkBoxDispatch({ type: 'add', payload: { name: 'measuredChromatogram' } });
    }
  }, [isCalculatedEmpty, isTabFinished]);

  return (
    <Container fluid style={{ height: '100%' }}>
      <Allotment vertical>
        <Allotment.Pane minSize={25} preferredSize={180}>
          <Row style={{
            height: '100%', width: '100%', marginLeft: 0, marginRight: 0, overflowY: 'auto',
          }}
          >
            <Col xs="auto" style={{ height: '100%', overflowY: 'auto' }}>
              <InteractivePeakTable
                parentId={parentId}
                headerLayoutParams={{
                  position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1,
                }}
              />
            </Col>
            <Col xs="auto">
              <div className="border border-secondary-subtle rounded p-2 mb-1">
                <Form.Label className="mb-0">Хроматограммы</Form.Label>
                <Form.Check
                  type="checkbox"
                  label="Измеренная"
                  name="measuredChromatogram"
                  onChange={handleCheckboxChange}
                  value={useAnnotations}
                  checked={displayedPlots.includes('measuredChromatogram')}
                  size="sm"
                />

                <Form.Check
                  type="checkbox"
                  label="Вычисленная"
                  name="calculatedChromatogram"
                  onChange={handleCheckboxChange}
                  checked={!isCalculatedEmpty && isTabFinished && displayedPlots.includes('calculatedChromatogram')}
                  disabled={!isTabFinished || isCalculatedEmpty}
                  size="sm"
                  className="mb-0"
                />
              </div>
              <div className="border border-secondary-subtle rounded p-2">
                <Form.Check
                  type="checkbox"
                  label="Метки пиков"
                  name="annotations"
                  onChange={handleUseAnnotationsChange}
                  size="sm"
                  checked={useAnnotations}
                />

                <ChromatogramOptionsOverlay
                  setOrientation={handleOrientationChange}
                  setNamingMode={handleNamingModeChange}
                  disabled={!useAnnotations}
                />
              </div>

            </Col>
            {isTabFinished && (
            <Col xs="auto">
              <PeakParams parentId={parentId} />
            </Col>
            )}
          </Row>

        </Allotment.Pane>
        <Allotment.Pane minSize={50}>
          <PeakPlot
            displayedPlots={displayedPlots}
            key={`plot-${parentId}`}
            parentId={parentId}
            parentSubTab="peaks"
            annotationsConfig={annotationsConfig}
          />
        </Allotment.Pane>
      </Allotment>
    </Container>
  );
}

export default PeaksTab;
