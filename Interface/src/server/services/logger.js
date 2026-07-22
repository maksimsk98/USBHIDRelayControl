const { createLogger, transports, format } = require('winston');

const { combine, timestamp, printf } = format;
const moment = require('moment-timezone');

const generateLogFilename = () => `${moment().tz('Europe/Moscow').format('YYYY_MM_DD_HH_mm_ss')}.log`;

const customTimestampFormat = () => moment().tz('Europe/Moscow').format('YYYY-MM-DDTHH:mm:ss.SSSZ');

const logFormat = printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`);

const logger = createLogger({
  format: combine(
    format.timestamp({ format: customTimestampFormat }),
    logFormat,
  ),
  transports: [
    new transports.File({
      filename: `logs/errors_${generateLogFilename()}`,
      level: 'error',
      format: combine(
        timestamp(),
        logFormat,
      ),
    }),

    // General log file transport
    new transports.File({
      filename: `logs/general_${generateLogFilename()}`,
      format: combine(
        timestamp(),
        logFormat,
      ),
    }),

    // Console transport for warnings
    new transports.Console({
      level: 'warn',
      format: combine(
        timestamp(),
        format.colorize(), // Colorize output in console
        logFormat,
      ),
    }),
  ],
});

const queueLevels = {
  levels: {
    createQueue: 0,
    deleteQueue: 1,
  },
  colors: {
    createQueue: 'green',
    deleteQueue: 'red',
  },
};

const queueFormat = printf(({ message }) => `${message}`);

const queueNamesLogger = createLogger({
  format: queueFormat,
  level: 'deleteQueue',
  levels: queueLevels.levels,
  transports: [
    new transports.File({
      filename: `logs/queues_${generateLogFilename()}`,
      /*    format: combine(
        timestamp(),
        logFormat,
      ), */
    }),
  ],
});

module.exports = { logger, queueNamesLogger };
