const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const amqp = require('amqplib');

const { logger } = require('./services/logger');

// ─── Config ─────────────────────────────────────────────────────────────────
const app = express();
const PORT = process.env.EXPRESS_PORT || 5000;
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

const QUEUE_COMMAND = 'panel_command_set';   // сервер → бэкенд
const QUEUE_STATUS  = 'panel_command_reqv';  // бэкенд → сервер

const VALID_USERS = ['Maxim', 'Bogdan', 'Vladislav', 'Alexander', 'Konstantin'];

// ─── Panel state (file-persisted) ───────────────────────────────────────────
const PANEL_STATE_FILE = path.join(process.cwd(), 'panel-state.json');
const DEFAULT_STATE = { activeUser: null, powerOn: false };

function loadState() {
  try {
    if (fs.existsSync(PANEL_STATE_FILE)) {
      return JSON.parse(fs.readFileSync(PANEL_STATE_FILE, 'utf8'));
    }
  } catch (_) { /* ignore */ }
  return { ...DEFAULT_STATE };
}

function saveState(state) {
  try { fs.writeFileSync(PANEL_STATE_FILE, JSON.stringify(state)); } catch (_) { /* ignore */ }
}

let panelState = loadState();

// ─── RabbitMQ ───────────────────────────────────────────────────────────────
let rabbitConnection = null;
let commandChannel = null;
let statusChannel = null;

async function connectRabbitMQ() {
  try {
    rabbitConnection = await amqp.connect(RABBITMQ_URL);

    rabbitConnection.on('close', () => logger.warn('RabbitMQ connection closed'));
    rabbitConnection.on('error', (err) => logger.error('RabbitMQ error: ' + err.message));

    commandChannel = await rabbitConnection.createChannel();
    statusChannel  = await rabbitConnection.createChannel();

    await commandChannel.assertQueue(QUEUE_COMMAND, { durable: true });
    await statusChannel.assertQueue(QUEUE_STATUS, { durable: true });

    // Слушаем ответы из panel_command_reqv
    statusChannel.consume(QUEUE_STATUS, (msg) => {
      if (!msg) return;
      try {
        const data = JSON.parse(msg.content.toString());
        logger.warn(`[panel_command_reqv] Получен статус: ${JSON.stringify(data)}`);
        if (data.activeUser !== undefined) panelState.activeUser = data.activeUser;
        if (data.powerOn !== undefined) panelState.powerOn = data.powerOn;
        saveState(panelState);
      } catch (e) {
        logger.error(`Ошибка при разборе сообщения из ${QUEUE_STATUS}: ${e.message}`);
      }
      statusChannel.ack(msg);
    });

    logger.warn('RabbitMQ подключён, очереди готовы');
  } catch (err) {
    logger.error('Не удалось подключиться к RabbitMQ: ' + err.message);
    throw err;
  }
}

function publishCommand(payload) {
  if (!commandChannel) {
    logger.error('RabbitMQ command channel не готов');
    return false;
  }
  const msg = Buffer.from(JSON.stringify(payload));
  commandChannel.sendToQueue(QUEUE_COMMAND, msg, { persistent: true });
  logger.warn(`[panel_command_set] Отправлена команда: ${JSON.stringify(payload)}`);
  return true;
}

async function shutdownRabbitMQ() {
  try {
    if (commandChannel) await commandChannel.close();
    if (statusChannel) await statusChannel.close();
    if (rabbitConnection) await rabbitConnection.close();
    logger.warn('RabbitMQ отключён');
  } catch (e) {
    logger.error('Ошибка при отключении RabbitMQ: ' + e.message);
  }
}

// ─── Express ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

app.get('/api/panel-state', (_req, res) => {
  res.json(panelState);
});

app.post('/api/panel-state', (req, res) => {
  const { activeUser, powerOn } = req.body;

  if (activeUser !== null && activeUser !== undefined && !VALID_USERS.includes(activeUser)) {
    return res.status(400).json({ error: 'Недопустимый пользователь' });
  }
  if (powerOn !== undefined && typeof powerOn !== 'boolean') {
    return res.status(400).json({ error: 'powerOn должен быть boolean' });
  }

  if (activeUser !== undefined) panelState.activeUser = activeUser;
  if (powerOn !== undefined) panelState.powerOn = powerOn;
  saveState(panelState);

  publishCommand({ activeUser: panelState.activeUser, powerOn: panelState.powerOn });

  return res.json(panelState);
});

// ─── Serve static build ─────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'development') {
  const buildDir = path.join(process.cwd(), 'build');
  app.use(express.static(buildDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(buildDir, 'index.html'));
  });
}

// ─── Start ──────────────────────────────────────────────────────────────────
(async () => {
  await connectRabbitMQ();

  const server = app.listen(PORT, () => {
    logger.warn(`Сервер запущен на порту ${PORT}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(`Порт ${PORT} уже занят`);
    } else {
      logger.error('Ошибка сервера: ' + err.message);
    }
    process.exit(1);
  });

  const shutdown = async () => {
    logger.warn('Остановка сервера...');
    try {
      server.close();
      await shutdownRabbitMQ();
    } catch (e) {
      logger.error('Ошибка при остановке: ' + e.message);
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
})();
