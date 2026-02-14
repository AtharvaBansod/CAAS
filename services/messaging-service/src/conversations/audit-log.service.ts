import { AuditLogRepository } from './audit-log.repository';
import { AuditLog } from './audit-log.types';

export class AuditLogService {
  constructor(private auditLogRepository: AuditLogRepository) {}

  async logAdminAction(log: Omit<AuditLog, 'timestamp'>): Promise<void> {
    await this.auditLogRepository.createAuditLog(log as AuditLog);
  }
}
