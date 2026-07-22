const amqp = require('amqplib');
const fs = require('fs');
const { mockPeaks, mockAutosamplerState } = require('../server/mockData/mockIndex');

let measuredChromatogram = { x: [], y: [] };
let backgroundChromatogramm = { x: [], y: [] };
let photometryPoints = { x: [], y: [] };
let basePoints = { x: [], y: [] };
let flowRateA1Points = { x: [], y: [] };
let flowRateA2Points = { x: [], y: [] };
let flowRateB1Points = { x: [], y: [] };
let flowRateB2Points = { x: [], y: [] };
let pressurePumpA1Points = { x: [], y: [] };
let pressurePumpA2Points = { x: [], y: [] };
let pressurePumpB1Points = { x: [], y: [] };
let pressurePumpB2Points = { x: [], y: [] };
let temperaturePoints = { x: [], y: [] };

const frequency = 10; // Frequency of the sine wave
const amplitude = 10; // Amplitude of the sine wave

const connectionUrl = 'amqp://localhost:5672';
let channel;

// ---- detector init progress mock ----

let initProgress = 0;
let initPhase = 'progress';
// phases: 'progress' -> 'nulls' -> 'silent'

let nullCounter = 0;
let silentCounter = 0;

function getNextInitializingProgress() {
  // 1) растём 0 → 100
  if (initPhase === 'progress') {
    const value = initProgress;
    initProgress += 10;

    if (initProgress > 100) {
      initPhase = 'nulls';
      nullCounter = 0;
    }

    return value;
  }

  // 2) 5 раз null
  if (initPhase === 'nulls') {
    nullCounter += 1;

    if (nullCounter >= 5) {
      initPhase = 'silent';
      silentCounter = 0;
    }

    return null;
  }

  // 3) 5 раз вообще ничего
  if (initPhase === 'silent') {
    silentCounter += 1;

    if (silentCounter >= 5) {
      initPhase = 'progress';
      initProgress = 0;
    }

    return undefined; // важно: поле НЕ будет отправлено
  }
}

async function startConsuming() {
/*   await channel.purgeQueue('main_set');
  console.log('Purged all messages from main_set queue'); */

  channel.consume('main_set', async (msg) => {
    if (msg !== null) {
      const content = JSON.parse(msg.content.toString());
      try {
        const [queueNameSet, queueNameReqv] = content.queueNames;
        console.log(`Received queue name: ${queueNameReqv}`);
        currentXMeasurement = 0;
        currentYMeasurement = 0;
        currentXTermostat = 0;
        currentYTermostat = 0;
        currentXPumps = 0;
        currentYPumps = 0;
        currentXDetector = 0;
        currentYDetector = 0;

        measuredChromatogram = { x: [], y: [] };
        backgroundChromatogramm = { x: [], y: [] };
        photometryPoints = { x: [], y: [] };
        basePoints = { x: [], y: [] };
        flowRateA1Points = { x: [], y: [] };
        flowRateA2Points = { x: [], y: [] };
        flowRateB1Points = { x: [], y: [] };
        flowRateB2Points = { x: [], y: [] };
        pressurePumpA1Points = { x: [], y: [] };
        pressurePumpA2Points = { x: [], y: [] };
        pressurePumpB1Points = { x: [], y: [] };
        pressurePumpB2Points = { x: [], y: [] };
        temperaturePoints = { x: [], y: [] };

        await sendPointsToQueue(queueNameReqv);
        channel.ack(msg);
        startConsumingMeasurementParams(queueNameSet, queueNameReqv);
      } catch (error) {
        console.log('ignored');
        channel.ack(msg);
      }
    }
  });
}

function generateLinearCurve(from = 1, to = 100, step = 1) {
  const curve = { x: [], y: [] };
  for (let i = from; i <= to; i += step) {
    curve.x.push(i);
    curve.y.push(i); // or apply a function like `i * scale`
  }
  return curve;
}

async function startConsumingMeasurementParams(queueNameSet, queueNameReqv) {
  let peaksSent = false;
  let calcSent = false;

  const { consumerTag } = await channel.consume(queueNameSet, async (msg) => {
    if (msg !== null) {
      const content = JSON.parse(msg.content.toString());
      if (Object.keys(content).includes('setDetectorProg')) {
        console.log(`Received measurement params: ${JSON.stringify(content)}`);
      }
      if (Object.keys(content).includes('operation')) {
        if (content.operation === 'get_state') await sendPointsToQueue(queueNameReqv);
      }
      if (content.operation === 'fetchPeaks') {
        console.log(`Received fetchPeaks request, replying with mockPeakTable to ${queueNameReqv}`);
        channel.sendToQueue(queueNameReqv, Buffer.from(JSON.stringify({
          operation: 'fetchPeaks',
          peakTable: mockPeaks.peakTable,
        })));
        peaksSent = true;
      }
      if (content.operation === 'getCalculatedCurve') {
        console.log(`Received getCalculatedCurve request, replying with linear curve to ${queueNameReqv}`);
        const calculatedChromatogram = generateLinearCurve(1, 100, 1);
        channel.sendToQueue(queueNameReqv, Buffer.from(JSON.stringify({
          operation: 'getCalculatedCurve',
          calculatedChromatogram,
        })));
        calcSent = true;
      }

      channel.ack(msg);

      // If both sent stop this consumer
      if (peaksSent && calcSent) {
        console.log(`Both peaks & calc sent, stopping consumer on ${queueNameSet}`);
        setImmediate(async () => {
          try {
            await channel.cancel(consumerTag);
            console.log(`Consumer ${consumerTag} stopped cleanly`);
          } catch (err) {
            console.error('Error cancelling consumer:', err);
          }
        });
      }
    }
  });
}

async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(connectionUrl);
    channel = await connection.createChannel();
    await channel.assertQueue('main_set');
    console.log('Producer connected to RabbitMQ');
    startConsuming();
  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error);
  }
}

function getRandomValue(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}

function generateRandomPoints(min, max, numPoints) {
  const values = { x: [], y: [] };
  for (let i = 0; i < numPoints; i++) {
    values.x.push(Math.floor(Math.random() * (max - min) + min));
    values.y.push(Math.floor(Math.random() * (max - min) + min));
  }
  return values;
}

function generateLinearPoints(x, y, numPoints) {
  const values = { x: [], y: [] };
  for (let i = 0; i < numPoints; i++) {
    values.x.push(x++);
    values.y.push(y++);
  }
  return values;
}

function generateMeasurementLinearPoints(x, y, numPoints) {
  const values = { x: [], y: [] };
  for (let i = 0; i < numPoints; i++) {
    values.x.push(x++);
    values.y.push(y++);
  }
  return { values, lastX: x, lastY: y };
}

function generateSinusoidalPoints(startX, numPoints) {
  const values = { x: [], y: [] };
  for (let i = 0; i < numPoints; i++) {
    const x = startX + i;
    const y = amplitude * Math.sin(frequency * x);
    values.x.push(x);
    values.y.push(y);
  }
  return { values, lastX: startX + numPoints };
}

// Separate variables for each data type's current x and y values

let currentXMeasurement = 0;
let currentYMeasurement = 0;
let currentXTermostat = 0;
let currentYTermostat = 0;
let currentXPumps = 0;
let currentYPumps = 0;
let currentXDetector = 0;
let currentYDetector = 0;

async function sendPointsToQueue(queueName) {
  const { values, lastX, lastY } = generateMeasurementLinearPoints(currentXMeasurement, currentYMeasurement, 10);

  /* const { values, lastX } = generateSinusoidalPoints(currentXMeasurement, 10); */
  currentXMeasurement = lastX;
  currentYMeasurement = lastY;

  let status;
  let activeStep = 0;

  if (lastX < 10) {
    status = 'preparePump';
  } else if (lastX >= 10 && lastX < 20) {
    status = 'prepareThermo';
  } else if (lastX >= 20 && lastX < 30) {
    status = 'readyStart';
  } else if (lastX >= 30 && lastX < 90) {
    status = 'measurementRunning';
  } else if (lastX >= 90 && lastX < 150) {
    status = 'measurementRunning';
    activeStep = 1;
  } else if (lastX === 150) status = 'finished';

  if (lastX > 150) return;

  const measurementBatch = {
    measuredChromatogram: values,
    signalPhoto: values,
    signalRef: values,
    activeStep,
    status,
    isAfterUpdate: false,
    activeStepPumpProgram: getRandomValue(0, 4),
    photoParams: {},
    referenceParams: {},
    mainParams: {},
  };
  console.log(measurementBatch);
  channel.sendToQueue(queueName, Buffer.from(JSON.stringify(measurementBatch)));
}

function generateLinearTermostatData() {
  return {
    columnTemp: generateLinearPoints(currentXTermostat, currentYTermostat, 10),
    roomTemp: generateLinearPoints(currentXTermostat, currentYTermostat, 10),
    status: 'connected',
  };
}

function generateLinearPumpData() {
  return {
    A1: {
      flowRate: generateLinearPoints(currentXPumps, currentYPumps, 10),
      pressure: generateLinearPoints(currentXPumps, currentYPumps, 10),
      volume: generateLinearPoints(currentXPumps, currentYPumps, 10),
      volumeMax: 100,
      status: 'connected',
      state: Math.random() > 0.5 ? 'DischargeFinished' : 'Wait',
    },
    A2: {
      flowRate: generateLinearPoints(currentXPumps, currentYPumps + 10, 10), // A2 starts 10 units higher on y-axis
      pressure: generateLinearPoints(currentXPumps, currentYPumps + 10, 10), // A2 starts 10 units higher on y-axis
      volume: generateLinearPoints(currentXPumps, currentYPumps + 10, 10), // A2 starts 10 units higher on y-axis
      volumeMax: 100,
      status: 'connected',
      state: 'Wait',
    },
    B1: {
      flowRate: generateLinearPoints(currentXPumps, currentYPumps + 20, 10), // B1 starts 20 units higher on y-axis
      pressure: generateLinearPoints(currentXPumps, currentYPumps + 20, 10), // B1 starts 20 units higher on y-axis
      volume: generateLinearPoints(currentXPumps, currentYPumps + 20, 10), // B1 starts 20 units higher on y-axis
      volumeMax: 100,
      status: 'connected',
      state: 'Wait',
    },
    B2: {
      flowRate: generateLinearPoints(currentXPumps, currentYPumps + 30, 10), // B2 starts 30 units higher on y-axis
      pressure: generateLinearPoints(currentXPumps, currentYPumps + 30, 10), // B2 starts 30 units higher on y-axis
      volume: generateLinearPoints(currentXPumps, currentYPumps + 30, 10), // B2 starts 30 units higher on y-axis
      volumeMax: 100,
      status: 'connected',
      state: 'Wait',
    },
    activeStepPumpProgram: 1,
  };
}

function generateLinearDetectorData() {
  const initializingProgress = getNextInitializingProgress();

  return {

    excitationWavelength: getRandomValue(150, 250),
    registrationWavelength: getRandomValue(150, 250),
    signalFluor: generateLinearPoints(currentXDetector, currentYDetector, 10),
    sensitivity: 'low',

    /* wavelength: getRandomValue(150, 250), */

    signalPhoto: generateLinearPoints(currentXDetector, currentYDetector, 10),
    signalRef: generateLinearPoints(currentXDetector, currentYDetector, 10),
    status: 'connected',

    ...(initializingProgress !== undefined && {
      initializingProgress,
    }),
  };
}

async function sendLinearTermostatData() {
  const data = generateLinearTermostatData();
  try {
    await channel.sendToQueue('termostat_reqv', Buffer.from(JSON.stringify(data)));
    currentXTermostat += 10; // Increment currentXTermostat
    currentYTermostat += 10; // Increment currentYTermostat
  } catch (error) {
    console.error('Error sending data to RabbitMQ:', error);
  }
}

async function sendLinearPumptData() {
  const data = generateLinearPumpData();
  try {
    await channel.sendToQueue('pumps_reqv', Buffer.from(JSON.stringify(data)));
    currentXPumps += 10; // Increment currentXIsocrat
    currentYPumps += 10; // Increment currentYIsocrat
  } catch (error) {
    console.error('Error sending data to RabbitMQ:', error);
  }
}

async function sendLinearDetectorData() {
  const data = generateLinearDetectorData();
  console.log(data);
  try {
    await channel.sendToQueue('detector_reqv', Buffer.from(JSON.stringify(data)));
    currentXDetector += 10; // Increment currentXDetector
    currentYDetector += 10; // Increment currentYDetector
  } catch (error) {
    console.error('Error sending data to RabbitMQ:', error);
  }
}

async function sendMockAuto() {
  try {
    await channel.sendToQueue('autosampler_reqv', Buffer.from(JSON.stringify(mockAutosamplerState)));
    currentXDetector += 10; // Increment currentXDetector
    currentYDetector += 10; // Increment currentYDetector
  } catch (error) {
    console.error('Error sending data to RabbitMQ:', error);
  }
}

function startSendingLinearData() {
  setInterval(() => {
    sendLinearTermostatData();
    sendLinearPumptData();
    sendLinearDetectorData();
    sendMockAuto();
  }, 1000); // Send data every second
}

connectRabbitMQ();
startSendingLinearData();
