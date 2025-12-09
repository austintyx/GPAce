import { createLogger, format, transports } from 'winston';

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'error.log', level: 'error' }),
    new transports.File({ filename: 'combined.log' })
  ],
});

export const logInfo = (message) => {
  logger.info(message);
};

export const logError = (message) => {
  logger.error(message);
};

export const logDebug = (message) => {
  logger.debug(message);
};