/**
 * Compliance Middleware for Media Service
 * Phase 4.5.z - Task 01: Media Service Compliance Integration
 * 
 * Logs all media operations to compliance service for audit trail
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
 * Log media events
 */
export async function logMediaEvent(
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
      resource_type: 'media',
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to log media event:', error);
  }
}

/**
 * Helper functions for specific media events
 */
export const MediaAuditEvents = {
  async mediaUploaded(
    userId: string,
    tenantId: string,
    mediaId: string,
    fileType: string,
    fileSize: number
  ) {
    await logMediaEvent('MEDIA_UPLOADED', userId, tenantId, {
      media_id: mediaId,
      file_type: fileType,
      file_size: fileSize,
    });
  },

  async mediaDownloaded(userId: string, tenantId: string, mediaId: string) {
    await logMediaEvent('MEDIA_DOWNLOADED', userId, tenantId, {
      media_id: mediaId,
    });
  },

  async mediaDeleted(userId: string, tenantId: string, mediaId: string, reason?: string) {
    await logMediaEvent('MEDIA_DELETED', userId, tenantId, {
      media_id: mediaId,
      reason,
    });
  },

  async mediaAccessed(userId: string, tenantId: string, mediaId: string, accessType: string) {
    await logMediaEvent('MEDIA_ACCESSED', userId, tenantId, {
      media_id: mediaId,
      access_type: accessType,
    });
  },

  async mediaProcessed(
    userId: string,
    tenantId: string,
    mediaId: string,
    processingType: string
  ) {
    await logMediaEvent('MEDIA_PROCESSED', userId, tenantId, {
      media_id: mediaId,
      processing_type: processingType,
    });
  },

  async thumbnailGenerated(userId: string, tenantId: string, mediaId: string) {
    await logMediaEvent('THUMBNAIL_GENERATED', userId, tenantId, {
      media_id: mediaId,
    });
  },

  async mediaShared(
    userId: string,
    tenantId: string,
    mediaId: string,
    sharedWith: string[]
  ) {
    await logMediaEvent('MEDIA_SHARED', userId, tenantId, {
      media_id: mediaId,
      shared_with: sharedWith,
      share_count: sharedWith.length,
    });
  },
};
