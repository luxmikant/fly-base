import winston from 'winston';
import { config } from '../config';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: config.server.env === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: config.datadog.service },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Datadog-compatible log format
export const ddLogger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    logger.info(message, { ...meta, dd: { service: config.datadog.service, env: config.datadog.env } });
  },
  error: (message: string, error?: Error, meta?: Record<string, unknown>) => {
    logger.error(message, { ...meta, error: error?.stack, dd: { service: config.datadog.service, env: config.datadog.env } });
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    logger.warn(message, { ...meta, dd: { service: config.datadog.service, env: config.datadog.env } });
  },
  debug: (message: string, meta?: Record<string, unknown>) => {
    logger.debug(message, { ...meta, dd: { service: config.datadog.service, env: config.datadog.env } });
  },
};
