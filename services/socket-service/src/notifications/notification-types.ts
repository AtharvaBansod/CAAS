export interface NotificationPayload {
    id: string;
    user_id: string;
    tenant_id: string;
    type: NotificationType;
    title: string;
    body: string;
    data?: Record<string, any>;
    created_at: Date;
    read: boolean;
    priority: 'low' | 'normal' | 'high' | 'urgent';
}

export type NotificationType =
    | 'message'
    | 'call_missed'
    | 'call_incoming'
    | 'mention'
    | 'system'
    | 'other';

export interface PushNotificationConfig {
    fcm_server_key?: string;
    apns_key_id?: string;
    apns_team_id?: string;
    apns_key_path?: string;
}
