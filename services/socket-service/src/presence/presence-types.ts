export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline' | 'invisible';

export interface ConnectedDevice {
  device_id: string;
  platform: string;
  last_active: Date;
  ip_address?: string;
}

export interface UserPresence {
  user_id: string;
  status: PresenceStatus;
  custom_status?: string;
  last_seen: Date;
  devices: ConnectedDevice[];
}

export interface PresenceMetadata {
  device_id: string;
  platform: string;
  ip_address?: string;
  last_active: Date;
}
