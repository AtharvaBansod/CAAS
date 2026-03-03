/**
 * Structured Logger
 * Phase 5 - Observability
 * 
 * Provides structured logging with correlation context
 */

import pino from 'pino';
import { LogContext, TelemetryConfig } from './types';

let logger: pino.Logger | null = null;

/**
 * Initialize structured logger
 */
export function initializeLogger(config: TelemetryConfig): pino.Logger {
  if (logger) {
    return logger;
  }

  logger = pino({
    name: config.serviceName,
    level: config.logLevel || process.env.LOG_LEVEL || 'info',
    formatters: {
      level: (label) => {
        return { level: label };
      },
    },
    base: {
      service: config.serviceName,
      environment: config.environment || process.env.NODE_ENV || 'development',
      version: config.serviceVersion || '1.0.0',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: [
        'password',
        'token',
        'accessToken',
        'refreshToken',
        'apiKey',
        'secret',
        'authorization',
        'cookie',
        '*.password',
        '*.token',
        '*.accessToken',
        '*.refreshToken',
        '*.apiKey',
        '*.secret',
      ],
      remove: true,
    },
  });

  return logger;
}

/**
 * Get logger instance
 */
export function getLogger(): pino.Logger {
  if (!logger) {
    throw new Error('Logger not initialized. Call initializeLogger first.');
  }
  return logger;
}

/**
 * Create child logger with context
 */
export function createChildLogger(context: LogContext): pino.Logger {
  const baseLogger = getLogger();
  return baseLogger.child(context);
}

/**
 * Log with correlation context
 */
export function logWithContext(level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal', message: string, context?: LogContext) {
  const baseLogger = getLogger();
  if (context) {
    baseLogger[level](context, message);
  } else {
    baseLogger[level](message);
  }
}
