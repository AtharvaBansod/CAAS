// User Lifecycle Events
export interface UserCreatedEvent {
  user_id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  created_by?: string;
  created_at: number;
  profile: UserProfile;
  preferences: UserPreferences;
}

export interface UserUpdatedEvent {
  user_id: string;
  updated_by: string;
  updated_at: number;
  changes: UserChanges;
}

export interface UserDeletedEvent {
  user_id: string;
  deleted_by: string;
  deleted_at: number;
  reason?: string;
  data_retention_days: number;
}

// Presence Events
export interface UserOnlineEvent {
  user_id: string;
  device_info: DeviceInfo;
  came_online_at: number;
  last_seen: number;
}

export interface UserOfflineEvent {
  user_id: string;
  device_info: DeviceInfo;
  went_offline_at: number;
  last_activity: number;
}

export interface UserStatusChangedEvent {
  user_id: string;
  old_status: UserStatus;
  new_status: UserStatus;
  changed_at: number;
  expires_at?: number;
}

// Device Events
export interface DeviceRegisteredEvent {
  user_id: string;
  device: DeviceInfo;
  registered_at: number;
  push_token?: string;
}

export interface DeviceRemovedEvent {
  user_id: string;
  device_id: string;
  removed_at: number;
  removed_by: string;
  reason?: string;
}

// Supporting Types
export interface UserProfile {
  first_name?: string;
  last_name?: string;
  bio?: string;
  location?: string;
  timezone?: string;
  language?: string;
  phone_number?: string;
  company?: string;
  job_title?: string;
  website?: string;
  social_links?: Record<string, string>;
}

export interface UserPreferences {
  notifications: NotificationPreferences;
  privacy: PrivacyPreferences;
  appearance: AppearancePreferences;
  language: string;
  timezone: string;
}

export interface NotificationPreferences {
  email_notifications: boolean;
  push_notifications: boolean;
  sms_notifications: boolean;
  desktop_notifications: boolean;
  notification_sound: boolean;
  quiet_hours: {
    enabled: boolean;
    start_time: string;
    end_time: string;
  };
  frequency: 'immediate' | 'batched' | 'daily_digest';
}

export interface PrivacyPreferences {
  show_online_status: boolean;
  show_last_seen: boolean;
  show_read_receipts: boolean;
  allow_friend_requests: boolean;
  searchable_by_email: boolean;
  searchable_by_phone: boolean;
}

export interface AppearancePreferences {
  theme: 'light' | 'dark' | 'auto';
  font_size: 'small' | 'medium' | 'large';
  compact_mode: boolean;
  show_avatars: boolean;
  animate_emojis: boolean;
}

export interface UserStatus {
  status: 'online' | 'offline' | 'away' | 'busy' | 'invisible';
  message?: string;
  emoji?: string;
}

export interface DeviceInfo {
  device_id: string;
  device_type: 'web' | 'mobile' | 'desktop' | 'tablet' | 'api';
  platform: string;
  os_version?: string;
  app_version?: string;
  browser?: string;
  browser_version?: string;
  user_agent?: string;
  ip_address?: string;
  location?: {
    country: string;
    region?: string;
    city?: string;
  };
}

export interface UserChanges {
  profile?: {
    field: keyof UserProfile;
    old_value: any;
    new_value: any;
  }[];
  preferences?: {
    field: string;
    old_value: any;
    new_value: any;
  }[];
  email?: {
    old_value: string;
    new_value: string;
  };
  display_name?: {
    old_value: string;
    new_value: string;
  };
  avatar_url?: {
    old_value: string;
    new_value: string;
  };
}
