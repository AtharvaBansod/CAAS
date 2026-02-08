/**
 * Revocation Reasons
 * Phase 2 - Authentication - Task AUTH-004
 */

import { RevocationReason } from './types';

export class RevocationReasons {
  /**
   * Get human-readable description for revocation reason
   */
  static getDescription(reason: RevocationReason): string {
    const descriptions: Record<RevocationReason, string> = {
      [RevocationReason.LOGOUT]: 'User logged out',
      [RevocationReason.PASSWORD_CHANGE]: 'Password was changed',
      [RevocationReason.SECURITY_BREACH]: 'Security breach detected',
      [RevocationReason.ADMIN_ACTION]: 'Revoked by administrator',
      [RevocationReason.TOKEN_REUSE]: 'Token reuse detected',
      [RevocationReason.DEVICE_REMOVED]: 'Device was removed',
      [RevocationReason.SESSION_EXPIRED]: 'Session expired',
      [RevocationReason.USER_DELETED]: 'User account deleted',
      [RevocationReason.TENANT_SUSPENDED]: 'Tenant account suspended',
    };

    return descriptions[reason] || 'Unknown reason';
  }

  /**
   * Check if reason requires user notification
   */
  static requiresNotification(reason: RevocationReason): boolean {
    return [
      RevocationReason.PASSWORD_CHANGE,
      RevocationReason.SECURITY_BREACH,
      RevocationReason.ADMIN_ACTION,
      RevocationReason.TOKEN_REUSE,
      RevocationReason.DEVICE_REMOVED,
    ].includes(reason);
  }

  /**
   * Check if reason is security-related
   */
  static isSecurityRelated(reason: RevocationReason): boolean {
    return [
      RevocationReason.SECURITY_BREACH,
      RevocationReason.TOKEN_REUSE,
      RevocationReason.PASSWORD_CHANGE,
    ].includes(reason);
  }

  /**
   * Get severity level
   */
  static getSeverity(reason: RevocationReason): 'low' | 'medium' | 'high' | 'critical' {
    const severityMap: Record<RevocationReason, 'low' | 'medium' | 'high' | 'critical'> = {
      [RevocationReason.LOGOUT]: 'low',
      [RevocationReason.SESSION_EXPIRED]: 'low',
      [RevocationReason.DEVICE_REMOVED]: 'medium',
      [RevocationReason.PASSWORD_CHANGE]: 'medium',
      [RevocationReason.ADMIN_ACTION]: 'medium',
      [RevocationReason.USER_DELETED]: 'high',
      [RevocationReason.TENANT_SUSPENDED]: 'high',
      [RevocationReason.TOKEN_REUSE]: 'critical',
      [RevocationReason.SECURITY_BREACH]: 'critical',
    };

    return severityMap[reason] || 'medium';
  }
}
