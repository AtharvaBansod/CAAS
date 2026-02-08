/**
 * Security Audit Logger
 */

import { auditStorage } from './audit-storage';
import { AuditEvent, AuditEntry } from './types';

export class SecurityAuditLogger {
  /**
   * Log single audit event
   */
  async log(event: AuditEvent, tenantId: string): Promise<AuditEntry> {
    return auditStorage.store({
      ...event,
      tenant_id: tenantId,
      timestamp: event.timestamp || new Date(),
    });
  }

  /**
   * Log batch of events
   */
  async logBatch(events: AuditEvent[], tenantId: string): Promise<AuditEntry[]> {
    const entries: AuditEntry[] = [];

    for (const event of events) {
      const entry = await this.log(event, tenantId);
      entries.push(entry);
    }

    return entries;
  }

  /**
   * Log authentication event
   */
  async logAuth(
    action: 'login' | 'logout' | 'failed_login' | 'password_change',
    userId: string | undefined,
    ipAddress: string,
    userAgent: string,
    tenantId: string,
    result: 'success' | 'failure' = 'success',
    metadata: Record<string, unknown> = {}
  ): Promise<AuditEntry> {
    return this.log(
      {
        event_type: `authentication.${action}`,
        actor: { user_id: userId, ip_address: ipAddress, user_agent: userAgent },
        target: { type: 'user', id: userId || 'unknown' },
        action,
        result,
        metadata,
        timestamp: new Date(),
      },
      tenantId
    );
  }

  /**
   * Log authorization event
   */
  async logAuthz(
    action: 'access_granted' | 'access_denied' | 'role_change',
    userId: string,
    resourceType: string,
    resourceId: string,
    tenantId: string,
    result: 'success' | 'failure' = 'success',
    metadata: Record<string, unknown> = {}
  ): Promise<AuditEntry> {
    return this.log(
      {
        event_type: `authorization.${action}`,
        actor: { user_id: userId, ip_address: '', user_agent: '' },
        target: { type: resourceType, id: resourceId },
        action,
        result,
        metadata,
        timestamp: new Date(),
      },
      tenantId
    );
  }

  /**
   * Log data access event
   */
  async logDataAccess(
    action: 'read' | 'write' | 'delete' | 'export',
    userId: string,
    dataType: string,
    dataId: string,
    tenantId: string,
    metadata: Record<string, unknown> = {}
  ): Promise<AuditEntry> {
    return this.log(
      {
        event_type: `data.${action}`,
        actor: { user_id: userId, ip_address: '', user_agent: '' },
        target: { type: dataType, id: dataId },
        action,
        result: 'success',
        metadata,
        timestamp: new Date(),
      },
      tenantId
    );
  }
}

export const securityAuditLogger = new SecurityAuditLogger();
