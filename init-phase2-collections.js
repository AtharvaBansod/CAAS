// MongoDB Phase 2 Collections Initialization Script
// Run this script to create all required collections for Phase 2 (Security)

print("===========================================");
print("CAAS Platform - Phase 2 Collections Setup");
print("===========================================");
print("");

// Switch to platform database
use caas_platform;

print("Creating Phase 2 collections...");
print("");

// ============================================
// AUTHENTICATION COLLECTIONS
// ============================================

print("1. Authentication Collections");
print("------------------------------");

// User Sessions
db.createCollection("user_sessions");
db.user_sessions.createIndex({ session_id: 1 }, { unique: true });
db.user_sessions.createIndex({ user_id: 1 });
db.user_sessions.createIndex({ tenant_id: 1, user_id: 1 });
db.user_sessions.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });
print("✓ user_sessions");

// Refresh Tokens
db.createCollection("refresh_tokens");
db.refresh_tokens.createIndex({ token_id: 1 }, { unique: true });
db.refresh_tokens.createIndex({ user_id: 1 });
db.refresh_tokens.createIndex({ family_id: 1 });
db.refresh_tokens.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });
print("✓ refresh_tokens");

// MFA Secrets
db.createCollection("mfa_secrets");
db.mfa_secrets.createIndex({ user_id: 1 }, { unique: true });
db.mfa_secrets.createIndex({ tenant_id: 1 });
print("✓ mfa_secrets");

// Trusted Devices
db.createCollection("trusted_devices");
db.trusted_devices.createIndex({ device_id: 1 }, { unique: true });
db.trusted_devices.createIndex({ user_id: 1 });
db.trusted_devices.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });
print("✓ trusted_devices");

// Device Fingerprints
db.createCollection("device_fingerprints");
db.device_fingerprints.createIndex({ fingerprint: 1 });
db.device_fingerprints.createIndex({ user_id: 1 });
print("✓ device_fingerprints");

// Security Events
db.createCollection("security_events");
db.security_events.createIndex({ user_id: 1, event_type: 1, timestamp: 1 });
db.security_events.createIndex({ tenant_id: 1, timestamp: 1 });
db.security_events.createIndex({ timestamp: 1 });
print("✓ security_events");

print("");

// ============================================
// AUTHORIZATION COLLECTIONS
// ============================================

print("2. Authorization Collections");
print("----------------------------");

// Authorization Policies
db.createCollection("authorization_policies");
db.authorization_policies.createIndex({ policy_id: 1 }, { unique: true });
db.authorization_policies.createIndex({ tenant_id: 1, is_active: 1 });
db.authorization_policies.createIndex({ tenant_id: 1, name: 1 });
print("✓ authorization_policies");

// Policy Versions
db.createCollection("policy_versions");
db.policy_versions.createIndex({ policy_id: 1, version: 1 }, { unique: true });
db.policy_versions.createIndex({ policy_id: 1 });
print("✓ policy_versions");

// Authorization Audit Logs
db.createCollection("authz_audit_logs");
db.authz_audit_logs.createIndex({ tenant_id: 1, timestamp: 1 });
db.authz_audit_logs.createIndex({ "subject.user_id": 1, timestamp: 1 });
db.authz_audit_logs.createIndex({ decision: 1, timestamp: 1 });
db.authz_audit_logs.createIndex({ timestamp: 1 });
print("✓ authz_audit_logs");

// Roles
db.createCollection("roles");
db.roles.createIndex({ role_id: 1 }, { unique: true });
db.roles.createIndex({ tenant_id: 1, name: 1 }, { unique: true });
db.roles.createIndex({ tenant_id: 1 });
print("✓ roles");

// User Roles
db.createCollection("user_roles");
db.user_roles.createIndex({ user_id: 1, role_id: 1 }, { unique: true });
db.user_roles.createIndex({ user_id: 1 });
db.user_roles.createIndex({ role_id: 1 });
db.user_roles.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });
print("✓ user_roles");

// Resource Permissions
db.createCollection("resource_permissions");
db.resource_permissions.createIndex({ user_id: 1, resource_type: 1, resource_id: 1 }, { unique: true });
db.resource_permissions.createIndex({ resource_type: 1, resource_id: 1 });
db.resource_permissions.createIndex({ user_id: 1 });
print("✓ resource_permissions");

// Tenant Permission Configs
db.createCollection("tenant_permission_configs");
db.tenant_permission_configs.createIndex({ tenant_id: 1 }, { unique: true });
print("✓ tenant_permission_configs");

print("");

// ============================================
// ENCRYPTION COLLECTIONS
// ============================================

print("3. Encryption Collections");
print("-------------------------");

// User Keys
db.createCollection("user_keys");
db.user_keys.createIndex({ user_id: 1, device_id: 1 }, { unique: true });
db.user_keys.createIndex({ user_id: 1 });
db.user_keys.createIndex({ tenant_id: 1 });
print("✓ user_keys");

// Prekey Bundles
db.createCollection("prekey_bundles");
db.prekey_bundles.createIndex({ user_id: 1, device_id: 1, prekey_id: 1 }, { unique: true });
db.prekey_bundles.createIndex({ user_id: 1, device_id: 1 });
print("✓ prekey_bundles");

// Verification Records
db.createCollection("verification_records");
db.verification_records.createIndex({ user_id_1: 1, user_id_2: 1 }, { unique: true });
db.verification_records.createIndex({ user_id_1: 1 });
db.verification_records.createIndex({ user_id_2: 1 });
print("✓ verification_records");

print("");

// ============================================
// COMPLIANCE COLLECTIONS
// ============================================

print("4. Compliance Collections");
print("-------------------------");

// Security Audit Logs
db.createCollection("security_audit_logs");
db.security_audit_logs.createIndex({ log_id: 1 }, { unique: true });
db.security_audit_logs.createIndex({ tenant_id: 1, timestamp: 1 });
db.security_audit_logs.createIndex({ event_type: 1, timestamp: 1 });
db.security_audit_logs.createIndex({ "actor.user_id": 1, timestamp: 1 });
db.security_audit_logs.createIndex({ timestamp: 1 });
print("✓ security_audit_logs");

// Privacy Requests
db.createCollection("privacy_requests");
db.privacy_requests.createIndex({ request_id: 1 }, { unique: true });
db.privacy_requests.createIndex({ user_id: 1, request_type: 1 });
db.privacy_requests.createIndex({ tenant_id: 1, status: 1 });
db.privacy_requests.createIndex({ created_at: 1 });
print("✓ privacy_requests");

// User Consent
db.createCollection("user_consent");
db.user_consent.createIndex({ user_id: 1, consent_type: 1 }, { unique: true });
db.user_consent.createIndex({ user_id: 1 });
db.user_consent.createIndex({ tenant_id: 1 });
print("✓ user_consent");

// Retention Policies
db.createCollection("retention_policies");
db.retention_policies.createIndex({ policy_id: 1 }, { unique: true });
db.retention_policies.createIndex({ tenant_id: 1, data_type: 1 });
db.retention_policies.createIndex({ tenant_id: 1, is_active: 1 });
print("✓ retention_policies");

// Retention Executions
db.createCollection("retention_executions");
db.retention_executions.createIndex({ execution_id: 1 }, { unique: true });
db.retention_executions.createIndex({ policy_id: 1, executed_at: 1 });
db.retention_executions.createIndex({ tenant_id: 1, executed_at: 1 });
print("✓ retention_executions");

// Data Archives
db.createCollection("data_archives");
db.data_archives.createIndex({ archive_id: 1 }, { unique: true });
db.data_archives.createIndex({ tenant_id: 1, data_type: 1 });
db.data_archives.createIndex({ created_at: 1 });
print("✓ data_archives");

// Compliance Reports
db.createCollection("compliance_reports");
db.compliance_reports.createIndex({ report_id: 1 }, { unique: true });
db.compliance_reports.createIndex({ tenant_id: 1, report_type: 1, generated_at: 1 });
db.compliance_reports.createIndex({ generated_at: 1 });
print("✓ compliance_reports");

// Report Schedules
db.createCollection("report_schedules");
db.report_schedules.createIndex({ schedule_id: 1 }, { unique: true });
db.report_schedules.createIndex({ tenant_id: 1, is_active: 1 });
print("✓ report_schedules");

// IP Whitelist
db.createCollection("ip_whitelist");
db.ip_whitelist.createIndex({ tenant_id: 1, ip_address: 1 }, { unique: true });
db.ip_whitelist.createIndex({ tenant_id: 1, is_active: 1 });
print("✓ ip_whitelist");

// IP Blacklist
db.createCollection("ip_blacklist");
db.ip_blacklist.createIndex({ ip_address: 1 }, { unique: true });
db.ip_blacklist.createIndex({ is_active: 1 });
print("✓ ip_blacklist");

// Geo Blocking Rules
db.createCollection("geo_blocking_rules");
db.geo_blocking_rules.createIndex({ tenant_id: 1, country_code: 1 }, { unique: true });
db.geo_blocking_rules.createIndex({ tenant_id: 1, is_active: 1 });
print("✓ geo_blocking_rules");

// API Key Usage
db.createCollection("api_key_usage");
db.api_key_usage.createIndex({ api_key_id: 1, timestamp: 1 });
db.api_key_usage.createIndex({ tenant_id: 1, timestamp: 1 });
db.api_key_usage.createIndex({ timestamp: 1 });
print("✓ api_key_usage");

print("");
print("===========================================");
print("Phase 2 Collections Created Successfully!");
print("===========================================");
print("");
print("Summary:");
print("  Authentication: 6 collections");
print("  Authorization: 7 collections");
print("  Encryption: 3 collections");
print("  Compliance: 12 collections");
print("  Total: 28 collections");
print("");
print("All indexes created successfully.");
print("");
