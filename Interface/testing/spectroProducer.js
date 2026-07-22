// spectroProducer.js
const amqp = require('amqplib');

const connectionUrl = 'amqp://localhost:5672';
let channel;

// State
let currentX = 0;
let currentY = 0;
let finishedSent = false;

let scanStart = 0;
let scanEnd = 100; // default if no program arrived
let scanStep = 1;

const lastConsumerTagRef = { tag: null };

const { MOCK_PROCESSED_CURVES } = require('./mockProcessedCurves');

async function stopSpectroConsumer(consumerTag) {
  console.log('Mock spectro: stopping measurement and resetting state');

  // Cancel consumer
  if (consumerTag) {
    try {
      await channel.cancel(consumerTag);
      console.log('Mock spectro: consumer cancelled');
    } catch (e) {
      console.warn('Mock spectro: consumer already canceled or invalid:', e.message);
    }
  }

  // Reset state
  currentX = 0;
  currentY = 0;
  finishedSent = false;

  scanStart = 0;
  scanEnd = 100;
  scanStep = 1;

  console.log(
    `Mock spectro: ranges reset → scanStart=${scanStart}, scanEnd=${scanEnd}, step=${scanStep}`,
  );
}

/**
 * Generate up to `numPoints` points starting from `startX`.
 * currentX is treated as "next X to emit", not "last emitted".
 */
function generateLinearPoints(startX, numPoints) {
  const data = { x: [], y: [] };

  let x = startX;

  for (let i = 0; i < numPoints; i++) {
    if (x > scanEnd) break; // stop at end of scan range

    data.x.push(x);
    data.y.push(x - scanStart); // simple linear shape, tied to wavelength

    x += scanStep;
  }

  // x is now the "next" X to emit on the next call
  const nextX = x;
  return { data, nextX };
}

/** Generates mock status based on last emitted position */
function getStatus(lastX) {
  return lastX >= scanEnd ? 'finished' : 'measurementRunning';
}

/** Send a small spectro packet to queue */
async function sendSpectroPoints(queueName) {
  if (finishedSent) return; // once finished, ignore further sends

  const { data, nextX } = generateLinearPoints(currentX, 10);

  // If we have no data to send (already past scanEnd), mark finished and bail
  if (!data.x.length) {
    finishedSent = true;
    return;
  }

  currentX = nextX;
  // currentY is not really used, keep for symmetry if needed later
  currentY = data.y[data.y.length - 1];

  const lastX = data.x[data.x.length - 1];
  const status = getStatus(lastX);

  let packet;

  if (status === 'finished') {
    packet = {
      measuredSpectroscopic: data,
      processedCurves: MOCK_PROCESSED_CURVES, // <--- injected CONST
      status,
    };
  } else {
    packet = {
      measuredSpectroscopic: data,
      status,
    };
  }

  await channel.sendToQueue(queueName, Buffer.from(JSON.stringify(packet)));
  console.log(`Sent spectro batch to ${queueName}: status=${status}, lastX=${lastX}`);

  if (status === 'finished') {
    console.log(`Measurement finished at X=${lastX}`);
    finishedSent = true;

    // AUTO-STOP consumer (synthetic stop)
    if (lastConsumerTagRef?.tag) {
      await stopSpectroConsumer(lastConsumerTagRef.tag);
    }
  }
}

/** Listens for control messages and responds */
async function startConsumingMain() {
  await channel.assertQueue('main_set');
  console.log('Spectro producer waiting on main_set');

  channel.consume('main_set', async (msg) => {
    if (!msg) return;
    const content = JSON.parse(msg.content.toString());
    try {
      const [queueNameSet, queueNameReqv] = content.queueNames;
      console.log('Received spectro main_set message:', content);
      startSpectroMeasurement(queueNameSet, queueNameReqv);
    } catch (err) {
      console.error('Invalid message on main_set, ignoring:', err);
    } finally {
      channel.ack(msg);
    }
  });
}

/** Responds to messages on measurement queues */
async function startSpectroMeasurement(queueNameSet, queueNameReqv) {
  // Do NOT reset currentX to 0 here; we will initialize it when we get setDetectorProg
  currentY = 0;
  finishedSent = false;

  const { consumerTag } = await channel.consume(queueNameSet, async (msg) => {
    if (!msg) return;
    const content = JSON.parse(msg.content.toString());

    // Configure scan range
    if (content.operation === 'setDetectorProg') {
      const prog = content.detectorProg || {};
      scanStart = Number(prog.from) || 0;
      scanEnd = Number(prog.to) || scanStart + 100;

      const range = scanEnd - scanStart;
      scanStep = range > 0 ? range / 100 : 1;

      // INITIALIZE currentX to scanStart when we get program
      currentX = scanStart;
      currentY = 0;
      finishedSent = false;

      console.log(
        `Mock spectro: configured scanning range ${scanStart} → ${scanEnd} (step=${scanStep})`,
      );

      channel.ack(msg);
      return;
    }

    // Data polling
    if (content.operation === 'getMeasurSpectrState') {
      await sendSpectroPoints(queueNameReqv);
      channel.ack(msg);
      return;
    }

    // Stop measurement
    if (content.operation === 'stopMeasurSpectr') {
      console.log('Mock spectro: manual STOP command received');
      await stopSpectroConsumer(consumerTag);

      const stopReply = {
        status: 'finished',
        measuredSpectroscopic: { x: [], y: [] },
        processedCurves: MOCK_PROCESSED_CURVES, // <-- Inject mock processed here
      };

      await channel.sendToQueue(queueNameReqv, Buffer.from(JSON.stringify(stopReply)));
      console.log('Mock spectro: last packet on stop sent');

      channel.ack(msg);
      return;
    }

    // Import from file passthrough
    if (content.operation === 'importDataFromFile') {
      console.log(`Mock: received importDataFromFile for fileId=${content.fileId}`);

      const reply = {
        operation: 'importDataFromFile',
        success: true,
      };

      await channel.sendToQueue(queueNameReqv, Buffer.from(JSON.stringify(reply)));
      console.log('Mock: responded to importDataFromFile');

      channel.ack(msg);
      return;
    }

    // Change correction mock response
    if (content.operation === 'changeCorrection') {
      const CORRECTION_K_MAP = {
        full: 1,
        transmittance: 2,
        reference: 3,
        off: 4,
      };

      const key = content.correction;
      console.log(`Mock spectro: received changeCorrection = ${key}`);

      // fallback k = 1 if garbage key comes
      const k = CORRECTION_K_MAP[key] ?? 1;

      const x = [];
      const y = [];

      for (let xi = scanStart; xi <= scanEnd; xi += scanStep) {
        x.push(xi);
        y.push(k * xi); // y = k * x
      }

      const reply = {
        operation: 'changeCorrection',
        curve: { x, y, k },
      };

      await channel.sendToQueue(queueNameReqv, Buffer.from(JSON.stringify(reply)));

      console.log(
        `Mock spectro: changeCorrection → k=${k}, points=${x.length}, range ${scanStart}→${scanEnd}`,
      );

      channel.ack(msg);
      return;
    }

    // Fallback for unknown operations
    console.log('Unknown operation on measurement queue:', content);
    channel.ack(msg);
  });

  lastConsumerTagRef.tag = consumerTag;

  console.log(`Spectro consumer started on ${queueNameSet}`);
}

/** Connect to RabbitMQ */
async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(connectionUrl);
    channel = await connection.createChannel();
    await channel.assertQueue('main_set');
    console.log('Spectro producer connected to RabbitMQ');
    await startConsumingMain();
  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error);
  }
}

connectRabbitMQ();
