import {
  buildSocketAckEnvelope,
  buildSocketErrorEnvelope,
  getSocketEventDefinition,
  SocketNamespace,
} from '@caas/realtime-contracts';
import { Socket } from 'socket.io';
import { getCorrelationIdFromSocket } from '../middleware/correlation.middleware';

type SocketCallback = ((response: unknown) => void) | Function | undefined;

interface LegacyResponseShape {
  status?: string;
  code?: string;
  message?: string;
  retry_after_ms?: number;
  reasons?: unknown;
  error?: unknown;
  details?: Record<string, unknown>;
  [key: string]: unknown;
}

const SUCCESS_STATUSES = new Set(['ok', 'success']);

function inferErrorCode(response: LegacyResponseShape): string {
  if (response.code && typeof response.code === 'string') {
    return response.code;
  }

  const message = `${response.message || ''}`.toLowerCase();

  if (message.includes('required') || message.includes('invalid')) {
    return 'VALIDATION_ERROR';
  }
  if (message.includes('not authenticated') || message.includes('authentication')) {
    return 'UNAUTHENTICATED';
  }
  if (message.includes('not authorized') || message.includes('forbidden') || message.includes('denied')) {
    return 'FORBIDDEN';
  }
  if (message.includes('not found')) {
    return 'NOT_FOUND';
  }
  if (message.includes('rate limit') || message.includes('too many')) {
    return 'RATE_LIMITED';
  }
  if (message.includes('timeout')) {
    return 'TIMEOUT';
  }

  return 'REQUEST_FAILED';
}

function stripEnvelopeFields(response: LegacyResponseShape): Record<string, unknown> {
  const {
    status,
    code,
    message,
    retry_after_ms,
    reasons,
    error,
    details,
    ...rest
  } = response;

  return {
    ...rest,
    ...(retry_after_ms !== undefined ? { retry_after_ms } : {}),
    ...(reasons !== undefined ? { reasons } : {}),
    ...(error !== undefined ? { error } : {}),
    ...(details !== undefined ? { details } : {}),
  };
}

export function createSocketEventResponder(
  socket: Socket,
  namespace: SocketNamespace,
  event: string,
  callback?: SocketCallback
): (response: LegacyResponseShape) => void {
  const eventDefinition = getSocketEventDefinition(namespace, event);

  return (response: LegacyResponseShape) => {
    if (typeof callback !== 'function') {
      return;
    }

    const correlationId = getCorrelationIdFromSocket(socket);
    const normalizedStatus = `${response.status || 'ok'}`.toLowerCase();
    const isSuccess = SUCCESS_STATUSES.has(normalizedStatus);
    const details = stripEnvelopeFields(response);
    const hasDetails = Object.keys(details).length > 0;
    const envelope = isSuccess
      ? buildSocketAckEnvelope({
          eventId: eventDefinition.eventId,
          correlationId,
          code: response.code || 'OK',
          message: response.message || 'Request completed',
          retryable: false,
          ...(hasDetails ? { data: details } : {}),
        })
      : buildSocketErrorEnvelope({
          eventId: eventDefinition.eventId,
          correlationId,
          code: inferErrorCode(response),
          message: response.message || 'Request failed',
          retryable:
            response.retry_after_ms !== undefined ||
            `${response.message || ''}`.toLowerCase().includes('try again later'),
          ...(hasDetails ? { details } : {}),
        });

    (callback as (response: unknown) => void)(envelope);
  };
}
