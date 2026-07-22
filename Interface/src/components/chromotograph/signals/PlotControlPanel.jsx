import React from 'react';
import {
  Table, Form, Row, Col,
} from 'react-bootstrap';
import { useSelector } from 'react-redux';
import { selectChromaPlotTable, selectDetectorType, selectUsedDetectorType } from '../../../services/reduxImportDispatcher';
import { DETECTOR_TYPES, DETECTOR_Y_AXIS_LABEL } from '../../../constants/constants';
import ParamsControl from './ParamsControl';

function SignalsControlPanel(props) {
  const {
    detectorTracesVisible,
    setDetectorTracesVisible,
    flowRateTracesVisible,
    setFlowRateTracesVisible,
    pressureTracesVisible,
    setPressureTracesVisible,
    temperatureTracesVisible,
    setTemperatureTracesVisible,
    parentId,
  } = props;

  const selectedDetectorType = useSelector(selectDetectorType);
  const fileDetectorType = useSelector((state) => selectUsedDetectorType(state, parentId)); // if file load detector
  const determiningDetectorType = fileDetectorType ?? selectedDetectorType;

  const { photoParams, referenceParams, mainParams } = useSelector((state) => selectChromaPlotTable(state, parentId));

  const handleCheckboxChange = (event) => {
    const { name, checked } = event.target;

    if (name in detectorTracesVisible) {
      setDetectorTracesVisible((prevState) => ({
        ...prevState,
        [name]: checked,
      }));
    } else if (name in flowRateTracesVisible) {
      setFlowRateTracesVisible((prevState) => ({
        ...prevState,
        [name]: checked,
      }));
    } else if (name in pressureTracesVisible) {
      setPressureTracesVisible((prevState) => ({
        ...prevState,
        [name]: checked,
      }));
    } else if (name in temperatureTracesVisible) {
      setTemperatureTracesVisible((prevState) => ({
        ...prevState,
        [name]: checked,
      }));
    }
  };

  const handleFlowRateCheckbox = (event) => {
    const { name, checked } = event.target;
    if (name === 'flowRateAPoints') {
      setFlowRateTracesVisible((prevState) => ({
        ...prevState,
        flowRateA1Points: checked,
        flowRateA2Points: checked,
      }));
    }
    if (name === 'flowRateBPoints') {
      setFlowRateTracesVisible((prevState) => ({
        ...prevState,
        flowRateB1Points: checked,
        flowRateB2Points: checked,
      }));
    }
  };

  const handlePressureCheckbox = (event) => {
    const { name, checked } = event.target;
    if (name === 'pressureAPoints') {
      setPressureTracesVisible((prevState) => ({
        ...prevState,
        pressureA1Points: checked,
        pressureA2Points: checked,
      }));
    }
    if (name === 'pressureBPoints') {
      setPressureTracesVisible((prevState) => ({
        ...prevState,
        pressureB1Points: checked,
        pressureB2Points: checked,
      }));
    }
  };

  const cellStyle = {
    height: '35px',
    maxWidth: '150px',
    minWidth: '70px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const lineStyle = (color) => ({
    content: '""',
    display: 'inline-block',
    height: '3px',
    backgroundColor: color,
    marginRight: '5px',
    flex: '0 0 20px',
  });

  const labelWithLineStyle = {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'nowrap',
  };

  return (
    <Row style={{ margin: '0px 0px' }}>
      <Col>
        <Table style={{ maxWidth: '600px', marginBottom: '5px', tableLayout: 'auto' }} striped bordered hover size="sm">
          <thead>
            <tr>
              <th />
              <th style={cellStyle}>Сигнал</th>
              <th style={cellStyle}>Абс. СКО</th>
              <th style={cellStyle}>Отн. СКО</th>
              <th style={cellStyle}>Размах</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ ...cellStyle, minWidth: '180px' }}>
                <div style={labelWithLineStyle}>
                  <span style={lineStyle('magenta')} />
                  <Form.Check
                    type="checkbox"
                    label={DETECTOR_Y_AXIS_LABEL[determiningDetectorType]}
                    name="measuredChromatogram"
                    checked={detectorTracesVisible.measuredChromatogram}
                    onChange={handleCheckboxChange}
                  />
                </div>
              </td>
              <td style={cellStyle}>{mainParams.signal?.toFixed(6) ?? ''}</td>
              <td style={cellStyle}>{mainParams.absMSD?.toFixed(6) ?? ''}</td>
              <td style={cellStyle}>{mainParams.relMSD?.toFixed(6) ?? ''}</td>
              <td style={cellStyle}>{mainParams.range?.toFixed(6) ?? ''}</td>
            </tr>
            <tr>
              <td style={{ ...cellStyle, minWidth: '180px' }}>
                <div style={labelWithLineStyle}>
                  <span style={lineStyle('blue')} />
                  <Form.Check
                    type="checkbox"
                    label="Фотометрия"
                    name="signalPhoto"
                    checked={detectorTracesVisible.signalPhoto}
                    onChange={handleCheckboxChange}
                  />
                </div>
              </td>
              <td style={cellStyle}>{photoParams.signal?.toFixed(6) ?? ''}</td>
              <td style={cellStyle}>{photoParams.absMSD?.toFixed(6) ?? ''}</td>
              <td style={cellStyle}>{photoParams.relMSD?.toFixed(6) ?? ''}</td>
              <td style={cellStyle}>{photoParams.range?.toFixed(6) ?? ''}</td>
            </tr>
            <tr>
              <td style={{ ...cellStyle, minWidth: '180px' }}>
                <div style={labelWithLineStyle}>
                  <span style={lineStyle('green')} />
                  <Form.Check
                    type="checkbox"
                    label="Опорный"
                    name="signalRef"
                    checked={detectorTracesVisible.signalRef}
                    onChange={handleCheckboxChange}
                  />
                </div>
              </td>
              <td style={cellStyle}>{referenceParams.signal?.toFixed(6) ?? ''}</td>
              <td style={cellStyle}>{referenceParams.absMSD?.toFixed(6) ?? ''}</td>
              <td style={cellStyle}>{referenceParams.relMSD?.toFixed(6) ?? ''}</td>
              <td style={cellStyle}>{referenceParams.range?.toFixed(6) ?? ''}</td>
            </tr>
          </tbody>
        </Table>
      </Col>
      <Col>
        <Table style={{ maxWidth: '320px', marginBottom: '5px' }} striped bordered hover size="sm">
          <thead>
            <tr>
              <th />
              <th style={cellStyle}>A</th>
              <th style={cellStyle}>B</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Расход</td>
              <td style={cellStyle}>
                <div style={labelWithLineStyle}>
                  <span style={lineStyle('blue')} />
                  <Form.Check
                    type="checkbox"
                    name="flowRateAPoints"
                    checked={flowRateTracesVisible.flowRateA1Points && flowRateTracesVisible.flowRateA2Points}
                    onChange={handleFlowRateCheckbox}
                  />
                </div>
              </td>
              <td style={cellStyle}>
                <div style={labelWithLineStyle}>
                  <span style={lineStyle('green')} />
                  <Form.Check
                    type="checkbox"
                    name="flowRateBPoints"
                    checked={flowRateTracesVisible.flowRateB1Points && flowRateTracesVisible.flowRateB2Points}
                    onChange={handleFlowRateCheckbox}
                  />
                </div>
              </td>
            </tr>
            <tr>
              <td>Давление</td>
              <td style={cellStyle}>
                <div style={labelWithLineStyle}>
                  <span style={lineStyle('blue')} />
                  <Form.Check
                    type="checkbox"
                    name="pressureAPoints"
                    checked={pressureTracesVisible.pressureA1Points && pressureTracesVisible.pressureA2Points}
                    onChange={handlePressureCheckbox}
                  />
                </div>
              </td>
              <td style={cellStyle}>
                <div style={labelWithLineStyle}>
                  <span style={lineStyle('green')} />
                  <Form.Check
                    type="checkbox"
                    name="pressureBPoints"
                    checked={pressureTracesVisible.pressureB1Points && pressureTracesVisible.pressureB2Points}
                    onChange={handlePressureCheckbox}
                  />
                </div>
              </td>
            </tr>
            <tr>
              <td>Температура</td>
              <td style={cellStyle}>
                <div style={labelWithLineStyle}>
                  <span style={lineStyle('blue')} />
                  <Form.Check
                    type="checkbox"
                    name="columnTemp"
                    checked={temperatureTracesVisible.columnTemp}
                    onChange={handleCheckboxChange}
                  />
                </div>
              </td>
              <td style={cellStyle} />
            </tr>
          </tbody>
        </Table>
      </Col>
      <Col>
        <ParamsControl parentId={parentId} />
      </Col>
    </Row>
  );
}

export default SignalsControlPanel;
