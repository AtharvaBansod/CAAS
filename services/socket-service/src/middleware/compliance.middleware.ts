/**
 * Compliance Middleware for Socket Service
 * Phase 4.5.z - Task 01: Socket Service Compliance Integration
 * 
 * Logs all real-time events to compliance service for audit trail
 */

import { createComplianceClient, ComplianceClient } from '@caas/compliance-client';

let complianceClient: ComplianceClient | null = null;

export function initializeComplianceClient(baseURL: string): ComplianceClient {
  complianceClient = createComplianceClient({
    baseURL,
    timeout: 10000,
    retries: 3,
    circuitBreaker: {
      failureThreshold: 30,
      resetTimeout: 60000,
      monitoringPeriod: 30000,
    },
    batching: {
      enabled: true,
      maxBatchSize: 100,
      flushInterval: 5000,
    },
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    if (complianceClient) {
      await complianceClient.shutdown();
    }
  });

  process.on('SIGINT', async () => {
    if (complianceClient) {
      await complianceClient.shutdown();
    }
  });

  return complianceClient;
}

export function getComplianceClient(): ComplianceClient | null {
  return complianceClient;
}

/**
 * Log socket events
 */
export async function logSocketEvent(
  action: string,
  userId: string,
  tenantId: string,
  metadata?: Record<string, any>
): Promise<void> {
  if (!complianceClient) {
    console.warn('Compliance client not initialized');
    return;
  }

  try {
    await complianceClient.logAudit({
      tenant_id: tenantId,
      user_id: userId,
      action,
      resource_type: 'socket_event',
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to log socket event:', error);
  }
}

/**
 * Helper functions for specific socket events
 */
export const SocketAuditEvents = {
  async socketConnected(
    userId: string,
    tenantId: string,
    socketId: string,
    ipAddress: string
  ) {
    await logSocketEvent('SOCKET_CONNECTED', userId, tenantId, {
      socket_id: socketId,
      ip_address: ipAddress,
    });
  },

  async socketDisconnected(
    userId: string,
    tenantId: string,
    socketId: string,
    duration: number
  ) {
    await logSocketEvent('SOCKET_DISCONNECTED', userId, tenantId, {
      socket_id: socketId,
      duration_ms: duration,
    });
  },

  async messageSent(
    userId: string,
    tenantId: string,
    conversationId: string,
    messageId: string
  ) {
    await logSocketEvent('MESSAGE_SENT', userId, tenantId, {
      conversation_id: conversationId,
      message_id: messageId,
    });
  },

  async roomJoined(userId: string, tenantId: string, roomId: string) {
    await logSocketEvent('ROOM_JOINED', userId, tenantId, {
      room_id: roomId,
    });
  },

  async roomLeft(userId: string, tenantId: string, roomId: string) {
    await logSocketEvent('ROOM_LEFT', userId, tenantId, {
      room_id: roomId,
    });
  },

  async callStarted(userId: string, tenantId: string, callId: string, participants: string[]) {
    await logSocketEvent('CALL_STARTED', userId, tenantId, {
      call_id: callId,
      participants,
      participant_count: participants.length,
    });
  },

  async callEnded(userId: string, tenantId: string, callId: string, duration: number) {
    await logSocketEvent('CALL_ENDED', userId, tenantId, {
      call_id: callId,
      duration_ms: duration,
    });
  },

  async presenceUpdated(userId: string, tenantId: string, status: string) {
    await logSocketEvent('PRESENCE_UPDATED', userId, tenantId, {
      status,
    });
  },

  async typingStarted(userId: string, tenantId: string, conversationId: string) {
    await logSocketEvent('TYPING_STARTED', userId, tenantId, {
      conversation_id: conversationId,
    });
  },

  async typingStopped(userId: string, tenantId: string, conversationId: string) {
    await logSocketEvent('TYPING_STOPPED', userId, tenantId, {
      conversation_id: conversationId,
    });
  },
};
