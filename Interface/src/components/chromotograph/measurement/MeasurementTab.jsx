import React, { useState, useEffect } from 'react';
import { Allotment } from 'allotment';

import { Container, Row, Col } from 'react-bootstrap';

import { useSelector } from 'react-redux';
import StepTable from './detectorPrograms/StepTable.jsx';
import PumpParameters from './PumpParameters.jsx';
import ChromaPlot from '../ChromaPlot.jsx';
import PumpTable from './PumpTable.jsx';

import { DETECTOR_TYPES, EMPTY_OBJECT } from '../../../constants/constants.js';
import AveragingAndTimeUnit from './AvaragingAndTimeUnit.jsx';

import { selectDetectorType, selectIsTabFinished, selectIsTabInitialized, selectPumpMode, selectWithoutControl } from '../../../services/reduxImportDispatcher.js';
import DetectorParams from './detectorPrograms/DetectorParams.jsx';

function MeasurementTab(props) {
  const parentId = props.params.chromaTabId;

  const { thermostatTemp: storedThermostatTemp } = useSelector((state) => state.chromaMiscReducer[parentId] ?? EMPTY_OBJECT);
  const storedPumpMode = useSelector((state) => selectPumpMode(state, parentId) ?? 'none');
  const withoutControl = useSelector(selectWithoutControl);
  const isInitialized = useSelector(state => selectIsTabInitialized(state, parentId))
  const suppressControlElements = withoutControl && !isInitialized
  const detectorType = useSelector(selectDetectorType)

  const [showIsocrat, setShowIsocrat] = useState(false);
  const [showGradient, setShowGradient] = useState(false);
  const [thermostatTemp, setThermostatTemp] = useState(storedThermostatTemp);

  useEffect(() => {
    setThermostatTemp(storedThermostatTemp);
  }, [storedThermostatTemp]);

  const handleIsocratShow = () => {
    setShowIsocrat(true);
  };
  const handleGradientShow = () => {
    setShowGradient(true);
  };
  const handleGradientClose = () => setShowGradient(false);
  const handleIsocratClose = () => setShowIsocrat(false);

  const toggleParamModal = (pumpMode) => {
    const modalShowMapping = {
      isocrat: handleIsocratShow,
      gradient: handleGradientShow,
    };
    if (pumpMode === 'none') {
      return; // Do nothing if mode is 'none'
    }
    modalShowMapping[pumpMode]();
  };

  const handleParamClick = (event) => {
    toggleParamModal(storedPumpMode);
  };

  const pumpParams = useSelector((state) => state.pumpProgramReducer[parentId]);
  const { pumpMode } = pumpParams;


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
                <StepTable parentId={parentId} />
              </Col>
              <Col xs="auto">
                <DetectorParams parentId={parentId} />
              </Col>
              <Col xs="auto">
                <AveragingAndTimeUnit parentId={parentId} />
              </Col>
              {!suppressControlElements && (
                <>
                  <Col xs="auto">
                    <PumpParameters
                      parentId={parentId}
                      toggleParamModal={toggleParamModal}
                      setThermostatTemp={setThermostatTemp}
                      handleParamClick={handleParamClick}
                      showIsocrat={showIsocrat}
                      handleIsocratClose={handleIsocratClose}
                      showGradient={showGradient}
                      handleGradientClose={handleGradientClose}
                      thermostatTemp={thermostatTemp}
                      storedPumpMode={storedPumpMode}
                    />
                  </Col>
                  {pumpMode !== 'none'
                    ? (
                      <Col
                        xs="auto"
                        style={{
                          height: '100%', minWidth: '360px', maxWidth: '420px', flex: '1 1 0',
                        }}
                      >
                        <PumpTable
                          parentId={parentId}
                          handleClick={handleParamClick}
                        />
                      </Col>
                    )
                    : null}
                </>
              )}
            </Row>
          </div>

        </Allotment.Pane>
        <Allotment.Pane minSize={50}>
          <div style={{ height: '100%', width: '100%' }}>
            <ChromaPlot key={`plot-${parentId}`} parentId={parentId} parentTab="measurement" />
          </div>
        </Allotment.Pane>
      </Allotment>
    </Container>
  );
}

export default MeasurementTab;
