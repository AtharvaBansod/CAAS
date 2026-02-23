/**
 * Compliance Middleware for Crypto Service
 * Phase 4.5.z - Task 01: Crypto Service Compliance Integration
 * 
 * Logs all cryptographic operations to compliance service for audit trail
 * IMPORTANT: Never log sensitive data (keys, plaintext, ciphertext)
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
 * Log crypto events
 */
export async function logCryptoEvent(
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
      resource_type: 'cryptographic_operation',
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to log crypto event:', error);
  }
}

/**
 * Helper functions for specific crypto events
 */
export const CryptoAuditEvents = {
  async keyGenerated(userId: string, tenantId: string, keyType: string, keyId: string) {
    await logCryptoEvent('KEY_GENERATED', userId, tenantId, {
      key_type: keyType,
      key_id: keyId,
    });
  },

  async keyRotated(userId: string, tenantId: string, oldKeyId: string, newKeyId: string) {
    await logCryptoEvent('KEY_ROTATED', userId, tenantId, {
      old_key_id: oldKeyId,
      new_key_id: newKeyId,
    });
  },

  async encryptionPerformed(
    userId: string,
    tenantId: string,
    resourceType: string,
    resourceId: string,
    algorithm: string
  ) {
    await logCryptoEvent('ENCRYPTION_PERFORMED', userId, tenantId, {
      resource_type: resourceType,
      resource_id: resourceId,
      algorithm,
    });
  },

  async decryptionPerformed(
    userId: string,
    tenantId: string,
    resourceType: string,
    resourceId: string,
    algorithm: string
  ) {
    await logCryptoEvent('DECRYPTION_PERFORMED', userId, tenantId, {
      resource_type: resourceType,
      resource_id: resourceId,
      algorithm,
    });
  },

  async keyAccessed(userId: string, tenantId: string, keyId: string, operation: string) {
    await logCryptoEvent('KEY_ACCESSED', userId, tenantId, {
      key_id: keyId,
      operation,
    });
  },

  async keyDeleted(userId: string, tenantId: string, keyId: string, reason: string) {
    await logCryptoEvent('KEY_DELETED', userId, tenantId, {
      key_id: keyId,
      reason,
    });
  },

  async signatureCreated(userId: string, tenantId: string, resourceId: string, algorithm: string) {
    await logCryptoEvent('SIGNATURE_CREATED', userId, tenantId, {
      resource_id: resourceId,
      algorithm,
    });
  },

  async signatureVerified(
    userId: string,
    tenantId: string,
    resourceId: string,
    valid: boolean
  ) {
    await logCryptoEvent('SIGNATURE_VERIFIED', userId, tenantId, {
      resource_id: resourceId,
      valid,
    });
  },
};
