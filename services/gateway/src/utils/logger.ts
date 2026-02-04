import pino from 'pino';
import { config } from '../config';

export const logger = pino({
  level: config.LOG_LEVEL,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
  redact: {
    paths: ['req.headers.authorization', 'password', 'token'],
    censor: '***',
  },
});

export const createLogger = (name: string) => {
  return logger.child({ module: name });
};
