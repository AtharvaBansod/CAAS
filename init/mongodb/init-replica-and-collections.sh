#!/bin/bash
# MongoDB Initialization Script
# Initializes replica set and creates all required collections

set -e

echo "=========================================="
echo "MongoDB Initialization Script"
echo "=========================================="
echo ""

# Wait for MongoDB to be ready
echo "Waiting for MongoDB to be ready..."
MAX_TRIES=30
TRIES=0
until mongosh --host mongodb-primary:27017 --eval "db.adminCommand('ping')" > /dev/null 2>&1; do
  TRIES=$((TRIES+1))
  if [ $TRIES -ge $MAX_TRIES ]; then
    echo "MongoDB failed to start after $MAX_TRIES attempts"
    exit 1
  fi
  echo "MongoDB not ready yet, waiting... (attempt $TRIES/$MAX_TRIES)"
  sleep 2
done

echo "MongoDB is ready!"
echo ""

# Initialize replica set
echo "Initializing replica set..."
mongosh --host mongodb-primary:27017 <<EOF
try {
  var status = rs.status();
  print('Replica set already initialized');
  print('Current status: ' + status.myState);
} catch(e) {
  print('Initializing replica set...');
  rs.initiate({
    _id: 'caas-rs',
    members: [
      { _id: 0, host: 'mongodb-primary:27017', priority: 2 },
      { _id: 1, host: 'mongodb-secondary-1:27017', priority: 1 },
      { _id: 2, host: 'mongodb-secondary-2:27017', priority: 1 }
    ]
  });
  print('Replica set initialized successfully');
}
EOF

echo ""
echo "Waiting for replica set to stabilize..."
sleep 20

# Wait for primary to be elected
echo "Waiting for PRIMARY to be elected..."
MAX_TRIES=30
TRIES=0
until mongosh --host mongodb-primary:27017 --quiet --eval "rs.status().myState" 2>/dev/null | grep -q "1"; do
  TRIES=$((TRIES+1))
  if [ $TRIES -ge $MAX_TRIES ]; then
    echo "PRIMARY not elected after $MAX_TRIES attempts"
    exit 1
  fi
  echo "Waiting for PRIMARY... (attempt $TRIES/$MAX_TRIES)"
  sleep 2
done

echo "PRIMARY elected successfully!"
echo ""

# Create databases and users
echo "Creating databases and users..."
mongosh --host mongodb-primary:27017 -u ${MONGO_ROOT_USER} -p ${MONGO_ROOT_PASSWORD} --authenticationDatabase admin <<EOF
// Platform Database
use caas_platform;

try {
  db.createUser({
    user: 'caas_platform_user',
    pwd: '${MONGO_APP_PASSWORD}',
    roles: [{ role: 'readWrite', db: 'caas_platform' }]
  });
  print('✓ User created successfully');
} catch(e) {
  print('User may already exist: ' + e);
}

// Create initial collections
db.createCollection('saas_clients');
db.createCollection('applications');
db.createCollection('api_keys');
db.createCollection('platform_admins');

print('✓ Platform database initialized');
EOF

echo ""
echo "Database and user creation complete!"
echo ""

# Create Phase 2 collections
echo "Creating Phase 2 collections..."
mongosh --host mongodb-primary:27017 -u ${MONGO_ROOT_USER} -p ${MONGO_ROOT_PASSWORD} --authenticationDatabase admin caas_platform <<'EOF'
print("Creating Phase 2 collections...");
print("");

// Authentication Collections
print("1. Authentication Collections");
db.createCollection("user_sessions");
db.user_sessions.createIndex({ session_id: 1 }, { unique: true });
db.user_sessions.createIndex({ user_id: 1 });
db.user_sessions.createIndex({ tenant_id: 1, user_id: 1 });
db.user_sessions.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });
print("✓ user_sessions");

db.createCollection("refresh_tokens");
db.refresh_tokens.createIndex({ token_id: 1 }, { unique: true });
db.refresh_tokens.createIndex({ user_id: 1 });
db.refresh_tokens.createIndex({ family_id: 1 });
db.refresh_tokens.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });
print("✓ refresh_tokens");

db.createCollection("mfa_secrets");
db.mfa_secrets.createIndex({ user_id: 1 }, { unique: true });
db.mfa_secrets.createIndex({ tenant_id: 1 });
print("✓ mfa_secrets");

db.createCollection("trusted_devices");
db.trusted_devices.createIndex({ device_id: 1 }, { unique: true });
db.trusted_devices.createIndex({ user_id: 1 });
db.trusted_devices.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });
print("✓ trusted_devices");

db.createCollection("device_fingerprints");
db.device_fingerprints.createIndex({ fingerprint: 1 });
db.device_fingerprints.createIndex({ user_id: 1 });
print("✓ device_fingerprints");

db.createCollection("security_events");
db.security_events.createIndex({ user_id: 1, event_type: 1, timestamp: 1 });
db.security_events.createIndex({ tenant_id: 1, timestamp: 1 });
db.security_events.createIndex({ timestamp: 1 });
print("✓ security_events");

print("");

// Authorization Collections
print("2. Authorization Collections");
db.createCollection("authorization_policies");
db.authorization_policies.createIndex({ policy_id: 1 }, { unique: true });
db.authorization_policies.createIndex({ tenant_id: 1, is_active: 1 });
db.authorization_policies.createIndex({ tenant_id: 1, name: 1 });
print("✓ authorization_policies");

db.createCollection("policy_versions");
db.policy_versions.createIndex({ policy_id: 1, version: 1 }, { unique: true });
db.policy_versions.createIndex({ policy_id: 1 });
print("✓ policy_versions");

db.createCollection("authz_audit_logs");
db.authz_audit_logs.createIndex({ tenant_id: 1, timestamp: 1 });
db.authz_audit_logs.createIndex({ "subject.user_id": 1, timestamp: 1 });
db.authz_audit_logs.createIndex({ decision: 1, timestamp: 1 });
db.authz_audit_logs.createIndex({ timestamp: 1 });
print("✓ authz_audit_logs");

db.createCollection("roles");
db.roles.createIndex({ role_id: 1 }, { unique: true });
db.roles.createIndex({ tenant_id: 1, name: 1 }, { unique: true });
db.roles.createIndex({ tenant_id: 1 });
print("✓ roles");

db.createCollection("user_roles");
db.user_roles.createIndex({ user_id: 1, role_id: 1 }, { unique: true });
db.user_roles.createIndex({ user_id: 1 });
db.user_roles.createIndex({ role_id: 1 });
db.user_roles.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });
print("✓ user_roles");

db.createCollection("resource_permissions");
db.resource_permissions.createIndex({ user_id: 1, resource_type: 1, resource_id: 1 }, { unique: true });
db.resource_permissions.createIndex({ resource_type: 1, resource_id: 1 });
db.resource_permissions.createIndex({ user_id: 1 });
print("✓ resource_permissions");

db.createCollection("tenant_permission_configs");
db.tenant_permission_configs.createIndex({ tenant_id: 1 }, { unique: true });
print("✓ tenant_permission_configs");

print("");

// Encryption Collections
print("3. Encryption Collections");
db.createCollection("user_keys");
db.user_keys.createIndex({ user_id: 1, device_id: 1 }, { unique: true });
db.user_keys.createIndex({ user_id: 1 });
db.user_keys.createIndex({ tenant_id: 1 });
print("✓ user_keys");

db.createCollection("prekey_bundles");
db.prekey_bundles.createIndex({ user_id: 1, device_id: 1, prekey_id: 1 }, { unique: true });
db.prekey_bundles.createIndex({ user_id: 1, device_id: 1 });
print("✓ prekey_bundles");

db.createCollection("verification_records");
db.verification_records.createIndex({ user_id_1: 1, user_id_2: 1 }, { unique: true });
db.verification_records.createIndex({ user_id_1: 1 });
db.verification_records.createIndex({ user_id_2: 1 });
print("✓ verification_records");

print("");

// Compliance Collections
print("4. Compliance Collections");
db.createCollection("security_audit_logs");
db.security_audit_logs.createIndex({ log_id: 1 }, { unique: true });
db.security_audit_logs.createIndex({ tenant_id: 1, timestamp: 1 });
db.security_audit_logs.createIndex({ event_type: 1, timestamp: 1 });
db.security_audit_logs.createIndex({ "actor.user_id": 1, timestamp: 1 });
db.security_audit_logs.createIndex({ timestamp: 1 });
print("✓ security_audit_logs");

db.createCollection("privacy_requests");
db.privacy_requests.createIndex({ request_id: 1 }, { unique: true });
db.privacy_requests.createIndex({ user_id: 1, request_type: 1 });
db.privacy_requests.createIndex({ tenant_id: 1, status: 1 });
db.privacy_requests.createIndex({ created_at: 1 });
print("✓ privacy_requests");

db.createCollection("user_consent");
db.user_consent.createIndex({ user_id: 1, consent_type: 1 }, { unique: true });
db.user_consent.createIndex({ user_id: 1 });
db.user_consent.createIndex({ tenant_id: 1 });
print("✓ user_consent");

db.createCollection("retention_policies");
db.retention_policies.createIndex({ policy_id: 1 }, { unique: true });
db.retention_policies.createIndex({ tenant_id: 1, data_type: 1 });
db.retention_policies.createIndex({ tenant_id: 1, is_active: 1 });
print("✓ retention_policies");

db.createCollection("retention_executions");
db.retention_executions.createIndex({ execution_id: 1 }, { unique: true });
db.retention_executions.createIndex({ policy_id: 1, executed_at: 1 });
db.retention_executions.createIndex({ tenant_id: 1, executed_at: 1 });
print("✓ retention_executions");

db.createCollection("data_archives");
db.data_archives.createIndex({ archive_id: 1 }, { unique: true });
db.data_archives.createIndex({ tenant_id: 1, data_type: 1 });
db.data_archives.createIndex({ created_at: 1 });
print("✓ data_archives");

db.createCollection("compliance_reports");
db.compliance_reports.createIndex({ report_id: 1 }, { unique: true });
db.compliance_reports.createIndex({ tenant_id: 1, report_type: 1, generated_at: 1 });
db.compliance_reports.createIndex({ generated_at: 1 });
print("✓ compliance_reports");

db.createCollection("report_schedules");
db.report_schedules.createIndex({ schedule_id: 1 }, { unique: true });
db.report_schedules.createIndex({ tenant_id: 1, is_active: 1 });
print("✓ report_schedules");

db.createCollection("ip_whitelist");
db.ip_whitelist.createIndex({ tenant_id: 1, ip_address: 1 }, { unique: true });
db.ip_whitelist.createIndex({ tenant_id: 1, is_active: 1 });
print("✓ ip_whitelist");

db.createCollection("ip_blacklist");
db.ip_blacklist.createIndex({ ip_address: 1 }, { unique: true });
db.ip_blacklist.createIndex({ is_active: 1 });
print("✓ ip_blacklist");

db.createCollection("geo_blocking_rules");
db.geo_blocking_rules.createIndex({ tenant_id: 1, country_code: 1 }, { unique: true });
db.geo_blocking_rules.createIndex({ tenant_id: 1, is_active: 1 });
print("✓ geo_blocking_rules");

db.createCollection("api_key_usage");
db.api_key_usage.createIndex({ api_key_id: 1, timestamp: 1 });
db.api_key_usage.createIndex({ tenant_id: 1, timestamp: 1 });
db.api_key_usage.createIndex({ timestamp: 1 });
print("✓ api_key_usage");

print("");
print("==========================================");
print("Phase 2 Collections Created Successfully!");
print("==========================================");
print("");
print("Summary:");
print("  Authentication: 6 collections");
print("  Authorization: 7 collections");
print("  Encryption: 3 collections");
print("  Compliance: 12 collections");
print("  Total: 28 collections");
print("");
EOF

echo ""
echo "=========================================="
echo "MongoDB Initialization Complete!"
echo "=========================================="
echo ""
