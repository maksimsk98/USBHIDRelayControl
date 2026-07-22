const amqp = require('amqplib');
const { mockAutosamplerConfig } = require('../../server/mockData/mockAutosamplerConfig');
const { mockAutosamplerState } = require('../../server/mockData/mockAutosamplerState');

const RABBITMQ_URL = 'amqp://localhost:5672';
const QUEUE_SET = 'autosampler_set';
const QUEUE_REQV = 'autosampler_reqv';
const POLLING_ID = 'utilPollingId';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const randomDelay = (min = 100, max = 500) => Math.floor(Math.random() * (max - min + 1)) + min;

let currentAutosamplerMode = 'none';

const mockResponder = async () => {
  const connection = await amqp.connect(RABBITMQ_URL);
  const channel = await connection.createChannel();

  await channel.assertQueue(QUEUE_SET, { durable: true });
  await channel.assertQueue(QUEUE_REQV, { durable: true });

  console.log(`[✔] Waiting for messages on "${QUEUE_SET}"...`);

  channel.consume(QUEUE_SET, async (msg) => {
    if (!msg) return;

    try {
      const content = JSON.parse(msg.content.toString());
      const { operation } = content;

      console.log(`[📨] Received operation: "${operation}"`);

      let response = null;
      switch (operation) {
        case 'getAutosamplerProperties':
          response = { ...mockAutosamplerConfig };
          break;

        case 'fetchAutosamplerState':
          response = { ...mockAutosamplerState, currentAutosamplerMode };
          break;

        case 'controlAutosamplerProgram':
          currentAutosamplerMode = 'autosamplerProgram';
          break;
        default:
          console.warn(`[⚠] Unknown operation: "${operation}"`);
          break;
      }

      if (response) {
        const jitter = randomDelay(150, 1200); // simulate 150–1200 ms delay
        console.log(`[⏱] Simulating delay of ${jitter} ms for "${operation}"`);
        await delay(jitter);

        const enrichedResponse = {
          ...response,
        };
        channel.sendToQueue(QUEUE_REQV, Buffer.from(JSON.stringify(enrichedResponse)));
        console.log(`[📤] Responded with mock data for "${operation}"`);
      }
    } catch (error) {
      console.error('[💥] Failed to process message:', error);
    }

    channel.ack(msg);
  });
};

mockResponder().catch(console.error);
