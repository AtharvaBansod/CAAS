import { logger } from '../../utils/logger';

export interface AuditLogEntry {
  action: string;
  resource: string;
  resourceId?: string;
  actor: {
    id: string;
    type: 'user' | 'system' | 'api_key';
    tenantId?: string;
  };
  metadata?: Record<string, any>;
  status: 'success' | 'failure';
  error?: string;
}

export const auditLogger = {
  log: (entry: AuditLogEntry) => {
    logger.info({
      type: 'audit',
      ...entry,
      timestamp: new Date().toISOString(),
    }, `Audit: ${entry.action} on ${entry.resource}`);
  }
};
