/**
 * Authorization Audit Logger
 * 
 * Logs all authorization decisions for security and compliance
 */

import { AuthzAuditEntry, PolicyChangeEntry, RoleChangeEntry } from './types';

export class AuthorizationAuditLogger {
  private storage: any; // AuditStorage
  private kafkaProducer: any; // Kafka producer

  constructor(storage: any, kafkaProducer?: any) {
    this.storage = storage;
    this.kafkaProducer = kafkaProducer;
  }

  /**
   * Log authorization decision
   */
  async logDecision(entry: Omit<AuthzAuditEntry, 'id' | 'timestamp'>): Promise<void> {
    const auditEntry: AuthzAuditEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      ...entry,
    };

    // Store in database
    await this.storage.storeDecision(auditEntry);

    // Stream to Kafka for real-time analysis
    if (this.kafkaProducer) {
      await this.kafkaProducer.send({
        topic: 'authorization.decisions',
        messages: [{
          key: auditEntry.subject.user_id,
          value: JSON.stringify(auditEntry),
        }],
      });
    }

    // Check for anomalies
    await this.checkAnomalies(auditEntry);
  }

  /**
   * Log policy change
   */
  async logPolicyChange(entry: Omit<PolicyChangeEntry, 'id' | 'timestamp'>): Promise<void> {
    const changeEntry: PolicyChangeEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      ...entry,
    };

    await this.storage.storePolicyChange(changeEntry);

    if (this.kafkaProducer) {
      await this.kafkaProducer.send({
        topic: 'authorization.policy_changes',
        messages: [{
          key: entry.policy_id,
          value: JSON.stringify(changeEntry),
        }],
      });
    }
  }

  /**
   * Log role change
   */
  async logRoleChange(entry: Omit<RoleChangeEntry, 'id' | 'timestamp'>): Promise<void> {
    const changeEntry: RoleChangeEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      ...entry,
    };

    await this.storage.storeRoleChange(changeEntry);

    if (this.kafkaProducer) {
      await this.kafkaProducer.send({
        topic: 'authorization.role_changes',
        messages: [{
          key: entry.user_id,
          value: JSON.stringify(changeEntry),
        }],
      });
    }
  }

  /**
   * Check for authorization anomalies
   */
  private async checkAnomalies(entry: AuthzAuditEntry): Promise<void> {
    // Check for high deny rate
    if (entry.decision === 'deny') {
      const recentDenies = await this.storage.countRecentDenies(
        entry.subject.user_id,
        5 * 60 * 1000 // 5 minutes
      );

      if (recentDenies > 10) {
        await this.alertAnomaly({
          type: 'high_deny_rate',
          user_id: entry.subject.user_id,
          count: recentDenies,
          entry,
        });
      }
    }

    // Check for privilege escalation attempts
    if (entry.action.includes('admin') && entry.decision === 'deny') {
      await this.alertAnomaly({
        type: 'privilege_escalation_attempt',
        user_id: entry.subject.user_id,
        action: entry.action,
        entry,
      });
    }
  }

  /**
   * Alert on anomaly
   */
  private async alertAnomaly(anomaly: any): Promise<void> {
    console.warn('Authorization anomaly detected:', anomaly);

    if (this.kafkaProducer) {
      await this.kafkaProducer.send({
        topic: 'security.alerts',
        messages: [{
          key: anomaly.user_id,
          value: JSON.stringify({
            type: 'authorization_anomaly',
            ...anomaly,
            timestamp: new Date(),
          }),
        }],
      });
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
