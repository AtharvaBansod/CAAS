import { PresenceStatus } from './presence-types';

export class PresenceState {
  private static readonly VALID_TRANSITIONS: Map<PresenceStatus, Set<PresenceStatus>> = new Map([
    ['online', new Set<PresenceStatus>(['away', 'busy', 'offline', 'invisible'])],
    ['away', new Set<PresenceStatus>(['online', 'busy', 'offline', 'invisible'])],
    ['busy', new Set<PresenceStatus>(['online', 'away', 'offline', 'invisible'])],
    ['offline', new Set<PresenceStatus>(['online', 'away', 'busy', 'invisible'])],
    ['invisible', new Set<PresenceStatus>(['online', 'away', 'busy', 'offline'])],
  ]);

  /**
   * Checks if a transition from currentStatus to newStatus is valid.
   * @param currentStatus The current presence status.
   * @param newStatus The desired new presence status.
   * @returns True if the transition is valid, false otherwise.
   */
  public static isValidTransition(currentStatus: PresenceStatus, newStatus: PresenceStatus): boolean {
    if (currentStatus === newStatus) {
      return true; // Self-transitions are always valid
    }
    const allowedTransitions = this.VALID_TRANSITIONS.get(currentStatus);
    return allowedTransitions ? allowedTransitions.has(newStatus) : false;
  }

  /**
   * Determines the effective presence status based on connected devices.
   * If any device is online, the user is online, unless explicitly set to invisible.
   * @param currentStatus The user's explicitly set status.
   * @param hasConnectedDevices True if the user has any active connected devices.
   * @returns The effective presence status.
   */
  public static getEffectiveStatus(currentStatus: PresenceStatus, hasConnectedDevices: boolean): PresenceStatus {
    if (currentStatus === 'invisible') {
      return 'invisible';
    }
    if (hasConnectedDevices) {
      return 'online';
    }
    return 'offline';
  }
}
