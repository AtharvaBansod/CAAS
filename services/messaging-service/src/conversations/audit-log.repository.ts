import { Collection, Db } from 'mongodb';
import { AuditLog } from './audit-log.types';

export class AuditLogRepository {
  private auditLogs: Collection<AuditLog>;

  constructor(db: Db) {
    this.auditLogs = db.collection<AuditLog>('audit_logs');
  }

  async createAuditLog(log: AuditLog): Promise<void> {
    await this.auditLogs.insertOne({ ...log, timestamp: new Date() });
  }
}
