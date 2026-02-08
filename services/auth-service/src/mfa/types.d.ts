/**
 * MFA Types
 * Phase 2 - Authentication - Tasks AUTH-009 to AUTH-012
 */
export type MFAMethod = 'totp' | 'backup_code' | 'email' | 'sms';
export interface MFAConfig {
    user_id: string;
    tenant_id: string;
    totp_enabled: boolean;
    totp_secret?: string;
    backup_codes_enabled: boolean;
    backup_codes?: BackupCode[];
    trusted_devices: TrustedDevice[];
    created_at: number;
    updated_at: number;
}
export interface BackupCode {
    code_hash: string;
    used: boolean;
    used_at?: number;
}
export interface TrustedDevice {
    device_id: string;
    device_name: string;
    fingerprint_hash: string;
    trusted_at: number;
    expires_at: number;
    last_used: number;
}
export interface MFAChallenge {
    id: string;
    user_id: string;
    session_id: string;
    method: MFAMethod;
    available_methods: MFAMethod[];
    expires_at: number;
    attempts: number;
    max_attempts: number;
    created_at: number;
}
export interface MFAChallengeResult {
    success: boolean;
    challenge_id: string;
    method_used: MFAMethod;
    trust_device?: boolean;
    error?: string;
}
export interface TOTPSetup {
    secret: string;
    uri: string;
    qr_code: string;
    backup_codes: string[];
}
