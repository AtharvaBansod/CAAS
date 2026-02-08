export interface UserActivityEvent {
  user_id: string;
  tenant_id: string;
  activity_type: string;
  resource_type: string;
  resource_id: string;
  timestamp: number;
  metadata: Record<string, any>;
}

export interface FeatureUsageEvent {
  user_id: string;
  tenant_id: string;
  feature_name: string;
  count: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface ErrorOccurredEvent {
  service: string;
  error_code: string;
  message: string;
  stack_trace?: string;
  user_id?: string;
  tenant_id?: string;
  timestamp: number;
  severity: 'critical' | 'error' | 'warning';
}
