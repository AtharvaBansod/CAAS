/**
 * Session Security Types
 * Phase 2 - Authentication - Task AUTH-008
 */
export declare enum SessionBindingLevel {
    NONE = "NONE",
    DEVICE = "DEVICE",
    IP = "IP",
    STRICT = "STRICT"
}
export declare enum ConcurrentSessionPolicy {
    ALLOW_ALL = "ALLOW_ALL",
    LIMIT = "LIMIT",
    EXCLUSIVE = "EXCLUSIVE",
    DEVICE_EXCLUSIVE = "DEVICE_EXCLUSIVE"
}
export declare enum SessionLimitAction {
    REJECT = "REJECT",
    REMOVE_OLDEST = "REMOVE_OLDEST",
    REMOVE_LEAST_ACTIVE = "REMOVE_LEAST_ACTIVE"
}
export interface SecurityEvent {
    type: 'new_device' | 'new_location' | 'ip_change' | 'device_change' | 'impossible_travel' | 'session_hijack';
    severity: 'low' | 'medium' | 'high' | 'critical';
    session_id: string;
    user_id: string;
    timestamp: number;
    details: Record<string, any>;
}
export interface AnomalyDetectionConfig {
    enabled: boolean;
    impossibleTravelEnabled: boolean;
    newDeviceAlertEnabled: boolean;
    ipChangeAlertEnabled: boolean;
    sensitivity: 'low' | 'medium' | 'high';
}
