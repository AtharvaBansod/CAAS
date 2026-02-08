/**
 * Session Binding
 * Phase 2 - Authentication - Task AUTH-008
 * 
 * Binds sessions to device fingerprint, IP, and location
 */

import { Session } from '../types';
import { DeviceFingerprint } from '../device-fingerprint';
import { SessionBindingLevel } from './types';

export class SessionBinding {
  constructor(private bindingLevel: SessionBindingLevel) {}

  /**
   * Validate session binding
   */
  validate(
    session: Session,
    currentIp: string,
    currentFingerprint?: string,
    currentLocation?: { country: string }
  ): { valid: boolean; reason?: string } {
    switch (this.bindingLevel) {
      case SessionBindingLevel.NONE:
        return { valid: true };

      case SessionBindingLevel.DEVICE:
        return this.validateDevice(session, currentFingerprint);

      case SessionBindingLevel.IP:
        return this.validateIpAndDevice(session, currentIp, currentFingerprint);

      case SessionBindingLevel.STRICT:
        return this.validateStrict(session, currentIp, currentFingerprint, currentLocation);

      default:
        return { valid: true };
    }
  }

  /**
   * Validate device fingerprint only
   */
  private validateDevice(
    session: Session,
    currentFingerprint?: string
  ): { valid: boolean; reason?: string } {
    if (!currentFingerprint) {
      return { valid: false, reason: 'Device fingerprint required' };
    }

    const sessionFingerprint = DeviceFingerprint.fromDeviceInfo(session.device_info);
    const matches = DeviceFingerprint.match(sessionFingerprint, currentFingerprint);

    if (!matches) {
      return { valid: false, reason: 'Device fingerprint mismatch' };
    }

    return { valid: true };
  }

  /**
   * Validate device and IP subnet
   */
  private validateIpAndDevice(
    session: Session,
    currentIp: string,
    currentFingerprint?: string
  ): { valid: boolean; reason?: string } {
    // Check device
    const deviceCheck = this.validateDevice(session, currentFingerprint);
    if (!deviceCheck.valid) {
      return deviceCheck;
    }

    // Check IP subnet (first 3 octets)
    if (!this.isSameSubnet(session.ip_address, currentIp)) {
      return { valid: false, reason: 'IP subnet mismatch' };
    }

    return { valid: true };
  }

  /**
   * Validate device, exact IP, and region
   */
  private validateStrict(
    session: Session,
    currentIp: string,
    currentFingerprint?: string,
    currentLocation?: { country: string }
  ): { valid: boolean; reason?: string } {
    // Check device
    const deviceCheck = this.validateDevice(session, currentFingerprint);
    if (!deviceCheck.valid) {
      return deviceCheck;
    }

    // Check exact IP
    if (session.ip_address !== currentIp) {
      return { valid: false, reason: 'IP address mismatch' };
    }

    // Check region if available
    if (session.location && currentLocation) {
      if (session.location.country !== currentLocation.country) {
        return { valid: false, reason: 'Geographic region mismatch' };
      }
    }

    return { valid: true };
  }

  /**
   * Check if IPs are in same subnet
   */
  private isSameSubnet(ip1: string, ip2: string): boolean {
    const parts1 = ip1.split('.');
    const parts2 = ip2.split('.');

    if (parts1.length !== 4 || parts2.length !== 4) {
      // Not IPv4, require exact match
      return ip1 === ip2;
    }

    // Check first 3 octets
    return (
      parts1[0] === parts2[0] &&
      parts1[1] === parts2[1] &&
      parts1[2] === parts2[2]
    );
  }

  /**
   * Get binding level
   */
  getBindingLevel(): SessionBindingLevel {
    return this.bindingLevel;
  }

  /**
   * Set binding level
   */
  setBindingLevel(level: SessionBindingLevel): void {
    this.bindingLevel = level;
  }
}
