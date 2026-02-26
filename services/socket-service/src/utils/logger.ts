import pino from 'pino';

export function getLogger(name: string) {
  return pino({
    name,
    level: process.env.LOG_LEVEL || 'info',
    transport:
      process.env.NODE_ENV !== 'production'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:HH:MM:ss',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
  });
}
