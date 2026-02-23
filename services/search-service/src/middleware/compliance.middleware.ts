/**
 * Compliance Middleware for Search Service
 * Phase 4.5.z - Task 01: Search Service Compliance Integration
 * 
 * Logs all search operations to compliance service for audit trail
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
 * Log search events
 */
export async function logSearchEvent(
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
      resource_type: 'search',
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to log search event:', error);
  }
}

/**
 * Helper functions for specific search events
 */
export const SearchAuditEvents = {
  async searchPerformed(
    userId: string,
    tenantId: string,
    searchQuery: string,
    resultsCount: number
  ) {
    await logSearchEvent('SEARCH_PERFORMED', userId, tenantId, {
      search_query: searchQuery,
      results_count: resultsCount,
    });
  },

  async indexCreated(tenantId: string, indexName: string, documentCount: number) {
    await logSearchEvent('INDEX_CREATED', 'system', tenantId, {
      index_name: indexName,
      document_count: documentCount,
    });
  },

  async indexUpdated(tenantId: string, indexName: string, documentId: string) {
    await logSearchEvent('INDEX_UPDATED', 'system', tenantId, {
      index_name: indexName,
      document_id: documentId,
    });
  },

  async indexDeleted(tenantId: string, indexName: string, documentId: string) {
    await logSearchEvent('INDEX_DELETED', 'system', tenantId, {
      index_name: indexName,
      document_id: documentId,
    });
  },

  async bulkIndexOperation(tenantId: string, indexName: string, operationCount: number) {
    await logSearchEvent('BULK_INDEX_OPERATION', 'system', tenantId, {
      index_name: indexName,
      operation_count: operationCount,
    });
  },

  async searchFilterApplied(
    userId: string,
    tenantId: string,
    filterType: string,
    filterValue: string
  ) {
    await logSearchEvent('SEARCH_FILTER_APPLIED', userId, tenantId, {
      filter_type: filterType,
      filter_value: filterValue,
    });
  },
};
