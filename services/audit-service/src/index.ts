/**
 * Audit Service Entry Point
 */

export * from './types';
export * from './audit-logger';
export * from './audit-storage';
export * from './audit-query-service';
export * from './hash-chain';

export { securityAuditLogger } from './audit-logger';
export { auditStorage } from './audit-storage';
export { auditQueryService } from './audit-query-service';
export { hashChain } from './hash-chain';

console.log('Audit Service initialized');
