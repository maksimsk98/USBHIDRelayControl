import { useState } from 'react';
import { Allotment } from 'allotment';
import { Container } from 'react-bootstrap';

import { useSelector } from 'react-redux';
import {
  selectLastStepToIfNotWB, selectIsWritingBaseLine, selectTimeUnit, selectEffectiveDetectorType,
} from '../../../services/reduxImportDispatcher';

import 'allotment/dist/style.css';

import PlotControlPanel from './PlotControlPanel';
import SignalPlot from './SignalPlot';
import { DETECTOR_Y_LABELS } from '../../../constants/constants';

function SignalTab(props) {
  const parentId = props.params.chromaTabId;

  const lastStepBorder = useSelector((state) => selectLastStepToIfNotWB(state, { tabId: parentId }));
  const timeUnit = useSelector((state) => selectTimeUnit(state, parentId));
  const detectorType = useSelector((state) => selectEffectiveDetectorType(state, parentId ));

  const [detectorTracesVisible, setDetectorTracesVisible] = useState({
    measuredChromatogram: true,
    signalPhoto: false,
    signalRef: false,
  });

  const [flowRateTracesVisible, setFlowRateTracesVisible] = useState({
    flowRateA1Points: false,
    flowRateA2Points: false,
    flowRateB1Points: false,
    flowRateB2Points: false,
  });

  const [pressureTracesVisible, setPressureTracesVisible] = useState({
    pressureA1Points: false,
    pressureA2Points: false,
    pressureB1Points: false,
    pressureB2Points: false,
  });

  const [temperatureTracesVisible, setTemperatureTracesVisible] = useState({
    columnTemp: false,
  });

  const yLabel = DETECTOR_Y_LABELS[detectorType];

  const DetectorParams = {
    plotData: ['measuredChromatogram', 'signalPhoto', 'signalRef'],
    axisTitles: {
      xAxis: `Время измерения (${timeUnit === 'min' ? 'мин' : 'сек'})`,
      yAxis: yLabel,
    },
    lineColors: {
      measuredChromatogram: 'FF00FF',
      signalPhoto: '0000FF',
      signalRef: '008000',
    },
  };

  const flowRateParams = {
    plotData: ['flowRateA1Points', 'flowRateA2Points', 'flowRateB1Points', 'flowRateB2Points'],
    axisTitles: {
      xAxis: `Время измерения (${timeUnit === 'min' ? 'мин' : 'сек'})`,
      yAxis: 'Расход<br> (мкл/мин)',
    },
    lineColors: {
      flowRateA1Points: '0000FF',
      flowRateA2Points: '1E90FF',
      flowRateB1Points: '008000',
      flowRateB2Points: '00FF00',
    },
  };

  const pressureParams = {
    plotData: ['pressureA1Points', 'pressureA2Points', 'pressureB1Points', 'pressureB2Points'],
    axisTitles: {
      xAxis: `Время измерения (${timeUnit === 'min' ? 'мин' : 'сек'})`,
      yAxis: 'Давление<br> (МПа)',
    },
    lineColors: {
      pressureA1Points: '0000FF',
      pressureA2Points: '1E90FF',
      pressureB1Points: '008000',
      pressureB2Points: '00FF00',
    },
  };

  const temperatureParams = {
    plotData: ['columnTemp'],
    axisTitles: {
      xAxis: `Время измерения (${timeUnit === 'min' ? 'мин' : 'сек'})`,
      yAxis: 'Температура<br> (°C)',
    },
    lineColors: {
      columnTemp: '0000FF',
    },
  };

  const isVisiblePlot = (tracesVisible) => Object.values(tracesVisible).includes(true);

  return (
    <Container fluid style={{ height: '100%' }}>
      <Allotment vertical>
        <Allotment.Pane minSize={25} preferredSize={155}>
          <div style={{ height: '100%', width: '100%', overflowY: 'auto' }}>
            <PlotControlPanel
              detectorTracesVisible={detectorTracesVisible}
              setDetectorTracesVisible={setDetectorTracesVisible}
              flowRateTracesVisible={flowRateTracesVisible}
              setFlowRateTracesVisible={setFlowRateTracesVisible}
              pressureTracesVisible={pressureTracesVisible}
              setPressureTracesVisible={setPressureTracesVisible}
              temperatureTracesVisible={temperatureTracesVisible}
              setTemperatureTracesVisible={setTemperatureTracesVisible}
              parentId={parentId}
            />
          </div>
        </Allotment.Pane>
        <Allotment.Pane minSize={50}>
          <Allotment style={{ height: '100%' }} vertical>
            {isVisiblePlot(detectorTracesVisible) && (
            <Allotment.Pane minSize={50}>
              <SignalPlot
                parentId={parentId}
                parentSubTab="signals"
                initiator="detector"
                tracesVisible={detectorTracesVisible}
                plotParams={DetectorParams}
                timeUnit={timeUnit}
                lastStepBorder={lastStepBorder}
              />
            </Allotment.Pane>
            )}
            {isVisiblePlot(flowRateTracesVisible) && (
            <Allotment.Pane minSize={50}>
              <SignalPlot
                parentId={parentId}
                parentSubTab="signals"
                initiator="flowRate"
                tracesVisible={flowRateTracesVisible}
                plotParams={flowRateParams}
                timeUnit={timeUnit}
                lastStepBorder={lastStepBorder}
              />
            </Allotment.Pane>
            )}
            {isVisiblePlot(pressureTracesVisible) && (
            <Allotment.Pane minSize={50}>
              <SignalPlot
                parentId={parentId}
                parentSubTab="signals"
                initiator="pressure"
                tracesVisible={pressureTracesVisible}
                plotParams={pressureParams}
                timeUnit={timeUnit}
                lastStepBorder={lastStepBorder}
              />
            </Allotment.Pane>
            )}
            {isVisiblePlot(temperatureTracesVisible) && (
            <Allotment.Pane minSize={50}>
              <SignalPlot
                parentId={parentId}
                parentSubTab="signals"
                initiator="temperature"
                tracesVisible={temperatureTracesVisible}
                plotParams={temperatureParams}
                timeUnit={timeUnit}
                lastStepBorder={lastStepBorder}
              />
            </Allotment.Pane>
            )}
          </Allotment>
        </Allotment.Pane>
      </Allotment>
    </Container>
  );
}

export default SignalTab;
