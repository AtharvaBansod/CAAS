/**
 * Session Serializer
 * Phase 2 - Authentication - Task AUTH-005
 * 
 * Serializes and deserializes session data for Redis storage
 */

import { Session } from './types';

export class SessionSerializer {
  /**
   * Serialize session to JSON string
   */
  static serialize(session: Session): string {
    return JSON.stringify(session);
  }

  /**
   * Deserialize session from JSON string
   */
  static deserialize(data: string): Session {
    try {
      const session = JSON.parse(data);
      return this.validateAndNormalize(session);
    } catch (error) {
      throw new Error(`Failed to deserialize session: ${error}`);
    }
  }

  /**
   * Validate and normalize session data
   */
  private static validateAndNormalize(session: any): Session {
    // Required fields
    if (!session.id || !session.user_id || !session.tenant_id) {
      throw new Error('Session missing required fields');
    }

    // Normalize timestamps
    const normalized: Session = {
      id: session.id,
      user_id: session.user_id,
      tenant_id: session.tenant_id,
      device_id: session.device_id || 'unknown',
      device_info: session.device_info || {
        type: 'web',
        os: 'unknown',
        user_agent: '',
      },
      ip_address: session.ip_address || '0.0.0.0',
      location: session.location,
      created_at: this.normalizeTimestamp(session.created_at),
      last_activity: this.normalizeTimestamp(session.last_activity),
      expires_at: this.normalizeTimestamp(session.expires_at),
      is_active: session.is_active !== false,
      mfa_verified: session.mfa_verified === true,
    };

    return normalized;
  }

  /**
   * Normalize timestamp (handle both seconds and milliseconds)
   */
  private static normalizeTimestamp(timestamp: any): number {
    if (typeof timestamp === 'number') {
      // If timestamp is in seconds (< year 3000), convert to milliseconds
      return timestamp < 32503680000 ? timestamp * 1000 : timestamp;
    }
    return Date.now();
  }

  /**
   * Create session snapshot for logging
   */
  static createSnapshot(session: Session): Record<string, any> {
    return {
      id: session.id,
      user_id: session.user_id,
      tenant_id: session.tenant_id,
      device_type: session.device_info.type,
      ip_address: this.maskIpAddress(session.ip_address),
      created_at: new Date(session.created_at).toISOString(),
      last_activity: new Date(session.last_activity).toISOString(),
      is_active: session.is_active,
    };
  }

  /**
   * Mask IP address for privacy
   */
  private static maskIpAddress(ip: string): string {
    const parts = ip.split('.');
    if (parts.length === 4) {
      // IPv4: mask last octet
      return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
    }
    // IPv6 or other: mask last part
    const ipv6Parts = ip.split(':');
    if (ipv6Parts.length > 1) {
      return ipv6Parts.slice(0, -2).join(':') + ':xxxx:xxxx';
    }
    return 'xxx.xxx.xxx.xxx';
  }
}
