/**
 * Compliance Middleware for Auth Service
 * Phase 4.5.z - Task 01: Auth Service Compliance Integration
 * 
 * Logs all authentication events to compliance service for audit trail
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
 * Log authentication events
 */
export async function logAuthEvent(
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
      resource_type: 'authentication',
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to log auth event:', error);
  }
}

/**
 * Helper functions for specific auth events
 */
export const AuthAuditEvents = {
  async userLogin(userId: string, tenantId: string, ipAddress: string, userAgent: string) {
    await logAuthEvent('USER_LOGIN', userId, tenantId, {
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  },

  async userLogout(userId: string, tenantId: string, sessionId: string) {
    await logAuthEvent('USER_LOGOUT', userId, tenantId, {
      session_id: sessionId,
    });
  },

  async tokenRefresh(userId: string, tenantId: string, oldTokenId: string, newTokenId: string) {
    await logAuthEvent('TOKEN_REFRESH', userId, tenantId, {
      old_token_id: oldTokenId,
      new_token_id: newTokenId,
    });
  },

  async mfaEnabled(userId: string, tenantId: string, mfaMethod: string) {
    await logAuthEvent('MFA_ENABLED', userId, tenantId, {
      mfa_method: mfaMethod,
    });
  },

  async mfaDisabled(userId: string, tenantId: string) {
    await logAuthEvent('MFA_DISABLED', userId, tenantId, {});
  },

  async sessionCreated(userId: string, tenantId: string, sessionId: string, deviceInfo: any) {
    await logAuthEvent('SESSION_CREATED', userId, tenantId, {
      session_id: sessionId,
      device_info: deviceInfo,
    });
  },

  async sessionRevoked(userId: string, tenantId: string, sessionId: string, reason: string) {
    await logAuthEvent('SESSION_REVOKED', userId, tenantId, {
      session_id: sessionId,
      reason,
    });
  },

  async loginFailed(userId: string, tenantId: string, ipAddress: string, reason: string) {
    await logAuthEvent('LOGIN_FAILED', userId, tenantId, {
      ip_address: ipAddress,
      reason,
    });
  },

  async passwordChanged(userId: string, tenantId: string) {
    await logAuthEvent('PASSWORD_CHANGED', userId, tenantId, {});
  },

  async passwordResetRequested(userId: string, tenantId: string, ipAddress: string) {
    await logAuthEvent('PASSWORD_RESET_REQUESTED', userId, tenantId, {
      ip_address: ipAddress,
    });
  },
};
