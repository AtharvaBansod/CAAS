// MongoDB Initialization Script
// Creates database, user, and collections for CAAS Platform

print("===========================================");
print("CAAS Platform - Database Initialization");
print("===========================================");
print("");

// Switch to platform database
db = db.getSiblingDB('caas_platform'); // Ensure we use caas_platform
print("Using database: caas_platform");

// 1. Create Application User (Idempotent)
try {
    db.createUser({
        user: 'caas_platform_user',
        pwd: 'caas_app_secret_2026', // Ideally from env, but hardcoded here as in old script
        roles: [{ role: 'readWrite', db: 'caas_platform' }]
    });
    print("✓ User 'caas_platform_user' created");
} catch (e) {
    if (e.codeName === 'UserAlreadyExists' || e.message.includes('already exists')) {
        print("✓ User 'caas_platform_user' already exists");
    } else {
        print("! Warning creating user: " + e.message);
    }
}

// Helper for creating collections safely
function createCollectionStruct(name) {
    try {
        db.createCollection(name);
        print("✓ Collection '" + name + "' created");
    } catch (e) {
        if (e.codeName === 'NamespaceExists' || e.message.includes('already exists')) {
            print("✓ Collection '" + name + "' already exists");
        } else {
            print("! Error creating collection '" + name + "': " + e.message);
        }
    }
}

// 2. Create Initial Collections
print("");
print("Creating Initial Collections...");
createCollectionStruct('saas_clients');
createCollectionStruct('applications');
createCollectionStruct('api_keys');
createCollectionStruct('platform_admins');

// 3. Create Phase 2 Collections & Indexes
print("");
print("Creating Phase 2 Collections...");

// Authentication
createCollectionStruct("user_sessions");
db.user_sessions.createIndex({ session_id: 1 }, { unique: true });
db.user_sessions.createIndex({ user_id: 1 });
db.user_sessions.createIndex({ tenant_id: 1, user_id: 1 });
db.user_sessions.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });

createCollectionStruct("refresh_tokens");
db.refresh_tokens.createIndex({ token_id: 1 }, { unique: true });
db.refresh_tokens.createIndex({ user_id: 1 });
db.refresh_tokens.createIndex({ family_id: 1 });
db.refresh_tokens.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });

createCollectionStruct("mfa_secrets");
db.mfa_secrets.createIndex({ user_id: 1 }, { unique: true });
db.mfa_secrets.createIndex({ tenant_id: 1 });

createCollectionStruct("trusted_devices");
db.trusted_devices.createIndex({ device_id: 1 }, { unique: true });
db.trusted_devices.createIndex({ user_id: 1 });
db.trusted_devices.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });

createCollectionStruct("device_fingerprints");
db.device_fingerprints.createIndex({ fingerprint: 1 });
db.device_fingerprints.createIndex({ user_id: 1 });

createCollectionStruct("security_events");
db.security_events.createIndex({ user_id: 1, event_type: 1, timestamp: 1 });
db.security_events.createIndex({ tenant_id: 1, timestamp: 1 });
db.security_events.createIndex({ timestamp: 1 });

// Authorization
createCollectionStruct("authorization_policies");
db.authorization_policies.createIndex({ policy_id: 1 }, { unique: true });
db.authorization_policies.createIndex({ tenant_id: 1, is_active: 1 });
db.authorization_policies.createIndex({ tenant_id: 1, name: 1 });

createCollectionStruct("policy_versions");
db.policy_versions.createIndex({ policy_id: 1, version: 1 }, { unique: true });
db.policy_versions.createIndex({ policy_id: 1 });

createCollectionStruct("authz_audit_logs");
db.authz_audit_logs.createIndex({ tenant_id: 1, timestamp: 1 });
db.authz_audit_logs.createIndex({ "subject.user_id": 1, timestamp: 1 });
db.authz_audit_logs.createIndex({ decision: 1, timestamp: 1 });
db.authz_audit_logs.createIndex({ timestamp: 1 });

createCollectionStruct("roles");
db.roles.createIndex({ role_id: 1 }, { unique: true });
db.roles.createIndex({ tenant_id: 1, name: 1 }, { unique: true });
db.roles.createIndex({ tenant_id: 1 });

createCollectionStruct("user_roles");
db.user_roles.createIndex({ user_id: 1, role_id: 1 }, { unique: true });
db.user_roles.createIndex({ user_id: 1 });
db.user_roles.createIndex({ role_id: 1 });
db.user_roles.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });

createCollectionStruct("resource_permissions");
db.resource_permissions.createIndex({ user_id: 1, resource_type: 1, resource_id: 1 }, { unique: true });
db.resource_permissions.createIndex({ resource_type: 1, resource_id: 1 });
db.resource_permissions.createIndex({ user_id: 1 });

createCollectionStruct("tenant_permission_configs");
db.tenant_permission_configs.createIndex({ tenant_id: 1 }, { unique: true });

// Encryption
createCollectionStruct("user_keys");
db.user_keys.createIndex({ user_id: 1, device_id: 1 }, { unique: true });
db.user_keys.createIndex({ user_id: 1 });
db.user_keys.createIndex({ tenant_id: 1 });

createCollectionStruct("prekey_bundles");
db.prekey_bundles.createIndex({ user_id: 1, device_id: 1, prekey_id: 1 }, { unique: true });
db.prekey_bundles.createIndex({ user_id: 1, device_id: 1 });

createCollectionStruct("verification_records");
db.verification_records.createIndex({ user_id_1: 1, user_id_2: 1 }, { unique: true });
db.verification_records.createIndex({ user_id_1: 1 });
db.verification_records.createIndex({ user_id_2: 1 });

// Compliance
createCollectionStruct("security_audit_logs");
db.security_audit_logs.createIndex({ log_id: 1 }, { unique: true });
db.security_audit_logs.createIndex({ tenant_id: 1, timestamp: 1 });
db.security_audit_logs.createIndex({ event_type: 1, timestamp: 1 });
db.security_audit_logs.createIndex({ "actor.user_id": 1, timestamp: 1 });
db.security_audit_logs.createIndex({ timestamp: 1 });

createCollectionStruct("privacy_requests");
db.privacy_requests.createIndex({ request_id: 1 }, { unique: true });
db.privacy_requests.createIndex({ user_id: 1, request_type: 1 });
db.privacy_requests.createIndex({ tenant_id: 1, status: 1 });
db.privacy_requests.createIndex({ created_at: 1 });

createCollectionStruct("user_consent");
db.user_consent.createIndex({ user_id: 1, consent_type: 1 }, { unique: true });
db.user_consent.createIndex({ user_id: 1 });
db.user_consent.createIndex({ tenant_id: 1 });

createCollectionStruct("retention_policies");
db.retention_policies.createIndex({ policy_id: 1 }, { unique: true });
db.retention_policies.createIndex({ tenant_id: 1, data_type: 1 });
db.retention_policies.createIndex({ tenant_id: 1, is_active: 1 });

createCollectionStruct("retention_executions");
db.retention_executions.createIndex({ execution_id: 1 }, { unique: true });
db.retention_executions.createIndex({ policy_id: 1, executed_at: 1 });
db.retention_executions.createIndex({ tenant_id: 1, executed_at: 1 });

createCollectionStruct("data_archives");
db.data_archives.createIndex({ archive_id: 1 }, { unique: true });
db.data_archives.createIndex({ tenant_id: 1, data_type: 1 });
db.data_archives.createIndex({ created_at: 1 });

createCollectionStruct("compliance_reports");
db.compliance_reports.createIndex({ report_id: 1 }, { unique: true });
db.compliance_reports.createIndex({ tenant_id: 1, report_type: 1, generated_at: 1 });
db.compliance_reports.createIndex({ generated_at: 1 });

createCollectionStruct("report_schedules");
db.report_schedules.createIndex({ schedule_id: 1 }, { unique: true });
db.report_schedules.createIndex({ tenant_id: 1, is_active: 1 });

createCollectionStruct("ip_whitelist");
db.ip_whitelist.createIndex({ tenant_id: 1, ip_address: 1 }, { unique: true });
db.ip_whitelist.createIndex({ tenant_id: 1, is_active: 1 });

createCollectionStruct("ip_blacklist");
db.ip_blacklist.createIndex({ ip_address: 1 }, { unique: true });
db.ip_blacklist.createIndex({ is_active: 1 });

createCollectionStruct("geo_blocking_rules");
db.geo_blocking_rules.createIndex({ tenant_id: 1, country_code: 1 }, { unique: true });
db.geo_blocking_rules.createIndex({ tenant_id: 1, is_active: 1 });

createCollectionStruct("api_key_usage");
db.api_key_usage.createIndex({ api_key_id: 1, timestamp: 1 });
db.api_key_usage.createIndex({ tenant_id: 1, timestamp: 1 });
db.api_key_usage.createIndex({ timestamp: 1 });

print("");
print("===========================================");
print("Database Initialization Complete!");
print("===========================================");
