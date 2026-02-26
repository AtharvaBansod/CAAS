import { Server } from 'socket.io';
import { PresenceStore } from './presence-store';
import { UserPresence, PresenceStatus, ConnectedDevice, PresenceMetadata } from './presence-types';
import { PresenceNotifier } from './presence-notifier';
import { LastSeenTracker } from './last-seen-tracker';

export class PresenceManager {
  private notifier?: PresenceNotifier;
  private lastSeenTracker?: LastSeenTracker;

  constructor(private io: Server, private presenceStore: PresenceStore, private idleTimeoutSeconds: number) {}

  setNotifier(notifier: PresenceNotifier): void {
    this.notifier = notifier;
  }

  setLastSeenTracker(tracker: LastSeenTracker): void {
    this.lastSeenTracker = tracker;
  }

  async addSubscriber(userId: string, subscriberId: string): Promise<void> {
    await this.presenceStore.addSubscriber(userId, subscriberId);
  }

  async removeSubscriber(userId: string, subscriberId: string): Promise<void> {
    await this.presenceStore.removeSubscriber(userId, subscriberId);
  }

  async setStatus(userId: string, status: PresenceStatus, customStatus?: string): Promise<void> {
    let presence = await this.presenceStore.get(userId);
    if (!presence) {
      // If no presence exists, create a basic offline one.
      // This scenario might happen if a user sets status before connecting a device.
      presence = {
        user_id: userId,
        status: 'offline',
        last_seen: new Date(),
        devices: [],
      };
    }

    presence.status = status;
    presence.custom_status = customStatus;
    presence.last_seen = new Date(); // Update last seen when status changes

    await this.presenceStore.set(userId, presence);
    
    // Update last seen
    if (this.lastSeenTracker) {
      await this.lastSeenTracker.updateLastSeen(userId);
    }
    
    // Notify subscribers about status change
    if (this.notifier) {
      await this.notifier.notifyStatusChange(userId, status, customStatus);
    }
  }

  async getStatus(userId: string): Promise<UserPresence | null> {
    return this.presenceStore.get(userId);
  }

  async getBulkStatus(userIds: string[]): Promise<Map<string, UserPresence>> {
    return this.presenceStore.mget(userIds);
  }

  async setOnline(userId: string, metadata: PresenceMetadata): Promise<void> {
    let presence = await this.presenceStore.get(userId);

    if (!presence) {
      presence = {
        user_id: userId,
        status: 'online',
        last_seen: new Date(),
        devices: [],
      };
    }

    const existingDeviceIndex = presence.devices.findIndex(d => d.device_id === metadata.device_id);

    const newDevice: ConnectedDevice = {
      device_id: metadata.device_id,
      platform: metadata.platform,
      last_active: metadata.last_active, // Use last_active from metadata
      ip_address: metadata.ip_address,
    };

    if (existingDeviceIndex > -1) {
      presence.devices[existingDeviceIndex] = newDevice;
    } else {
      presence.devices.push(newDevice);
    }

    // If the user was offline/away/invisible and now has active devices, set status to online
    if (presence.status !== 'online' && presence.devices.length > 0) {
      presence.status = 'online';
    }
    presence.last_seen = new Date();

    await this.presenceStore.set(userId, presence);
    
    // Update last seen
    if (this.lastSeenTracker) {
      await this.lastSeenTracker.updateLastSeen(userId, metadata.platform);
    }
    
    // Notify subscribers about status change
    if (this.notifier) {
      await this.notifier.notifyStatusChange(userId, presence.status);
    }
  }

  async setOffline(userId: string, deviceId: string): Promise<void> {
    const presence = await this.presenceStore.get(userId);

    if (!presence) {
      return; // Nothing to do if no presence exists
    }

    // Remove the specific device
    presence.devices = presence.devices.filter(d => d.device_id !== deviceId);

    // If no devices are left, set status to offline
    if (presence.devices.length === 0) {
      presence.status = 'offline';
      presence.last_seen = new Date(); // Update last seen when truly offline
      
      // Update last seen
      if (this.lastSeenTracker) {
        await this.lastSeenTracker.updateLastSeen(userId);
      }
    } else {
      // If there are still devices, but this was the last active one,
      // we might need to re-evaluate overall status (e.g., if all remaining are idle)
      // This will be handled by the checkIdleUsersAndSetAway method
    }

    await this.presenceStore.set(userId, presence);
    
    // Notify subscribers about status change
    if (this.notifier) {
      await this.notifier.notifyStatusChange(userId, presence.status);
    }
  }

  async checkIdleUsersAndSetAway(): Promise<void> {
    const allUserIds = await this.presenceStore.getAllUserIds(); // Assuming PresenceStore has this method
    const now = new Date();
    const idleThreshold = now.getTime() - (this.idleTimeoutSeconds * 1000);

    for (const userId of allUserIds) {
      const presence = await this.presenceStore.get(userId);

      if (!presence || presence.status === 'offline' || presence.status === 'invisible') {
        continue; // Only check online or away users
      }

      const activeDevices = presence.devices.filter(device => device.last_active.getTime() > idleThreshold);

      if (activeDevices.length === 0 && presence.status === 'online') {
        // All devices are idle, set status to away
        presence.status = 'away';
        presence.last_seen = now;
        await this.presenceStore.set(userId, presence);
        
        // Notify subscribers about status change
        if (this.notifier) {
          await this.notifier.notifyStatusChange(userId, 'away');
        }
        
        console.log(`User ${userId} set to AWAY due to inactivity.`);
      } else if (activeDevices.length > 0 && presence.status === 'away') {
        // User was away but now has active devices, set status back to online
        presence.status = 'online';
        presence.last_seen = now;
        await this.presenceStore.set(userId, presence);
        
        // Notify subscribers about status change
        if (this.notifier) {
          await this.notifier.notifyStatusChange(userId, 'online');
        }
        
        console.log(`User ${userId} set to ONLINE due to activity.`);
      }
    }
  }
}
