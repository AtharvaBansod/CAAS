/**
 * Correlation ID Middleware for Socket Service
 * Phase 4.5.z Task 08: End-to-End Request Tracking
 */

import { Socket } from 'socket.io';
import { randomUUID } from 'crypto';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

/**
 * Socket.IO middleware to extract/generate correlation ID
 */
export function correlationSocketMiddleware(socket: Socket, next: (err?: Error) => void) {
  const correlationId = getSocketCorrelationId(socket);
  setSocketCorrelationId(socket, correlationId);
  
  // Log connection with correlation ID
  console.log(`[Correlation] Socket ${socket.id} connected with correlation ID: ${correlationId}`);
  
  next();
}

/**
 * Extract or generate correlation ID for socket connection
 */
export function getSocketCorrelationId(socket: Socket): string {
  // Try to get from handshake headers
  const correlationId = socket.handshake.headers[CORRELATION_ID_HEADER] as string;
  
  if (correlationId) {
    return correlationId;
  }

  // Try to get from auth (if passed during connection)
  const authCorrelationId = socket.handshake.auth?.correlationId;
  if (authCorrelationId) {
    return authCorrelationId;
  }

  // Generate new one
  return randomUUID();
}

/**
 * Store correlation ID in socket data
 */
export function setSocketCorrelationId(socket: Socket, correlationId: string): void {
  (socket as any).correlationId = correlationId;
}

/**
 * Get correlation ID from socket
 */
export function getCorrelationIdFromSocket(socket: Socket): string {
  return (socket as any).correlationId || randomUUID();
}

/**
 * Generate new correlation ID for socket event
 */
export function generateEventCorrelationId(socket: Socket, eventName: string): string {
  const baseId = getCorrelationIdFromSocket(socket);
  return `${baseId}:${eventName}:${Date.now()}`;
}
