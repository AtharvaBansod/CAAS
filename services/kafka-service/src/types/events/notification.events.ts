export interface NotificationQueuedEvent {
  notification_id: string;
  tenant_id: string;
  recipient_id: string;
  type: string;
  priority: 'high' | 'normal' | 'low';
  payload: any;
  queued_at: number;
}

export interface NotificationSentEvent {
  notification_id: string;
  tenant_id: string;
  recipient_id: string;
  channel: 'push' | 'email' | 'sms' | 'websocket';
  sent_at: number;
  provider_response?: any;
}

export interface NotificationFailedEvent {
  notification_id: string;
  tenant_id: string;
  recipient_id: string;
  channel: string;
  failed_at: number;
  error: string;
  retry_count: number;
}
