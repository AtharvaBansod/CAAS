// MongoDB Initialization Script
// Creates databases, users, and collections for CAAS Platform

print("===========================================");
print("CAAS Platform - Database Initialization");
print("===========================================");
print("");

// 1. Platform Database
db = db.getSiblingDB('caas_platform');
print("Initializing database: caas_platform");

function createCollectionSafely(dbObj, name) {
    try {
        dbObj.createCollection(name);
        print("  ✓ Collection '" + name + "' initialized");
    } catch (e) {
        if (e.codeName === 'NamespaceExists' || e.message.includes('already exists')) {
            print("  ✓ Collection '" + name + "' already exists");
        } else {
            print("  ! Error initializing '" + name + "': " + e.message);
        }
    }
}

// Global Collections
createCollectionSafely(db, 'clients'); // Standardized from clients
createCollectionSafely(db, 'applications');
createCollectionSafely(db, 'api_keys');
createCollectionSafely(db, 'platform_admins');
createCollectionSafely(db, 'user_sessions');
createCollectionSafely(db, 'refresh_tokens');
createCollectionSafely(db, 'mfa_secrets');
createCollectionSafely(db, 'trusted_devices');
createCollectionSafely(db, 'device_fingerprints');
createCollectionSafely(db, 'security_events');
createCollectionSafely(db, 'authorization_policies');
createCollectionSafely(db, 'policy_versions');
createCollectionSafely(db, 'roles');
createCollectionSafely(db, 'user_roles');
createCollectionSafely(db, 'resource_permissions');

// Indexes for 'clients'
db.clients.createIndex({ client_id: 1 }, { unique: true });
db.clients.createIndex({ tenant_id: 1 }, { unique: true });
db.clients.createIndex({ email: 1 }, { unique: true });

// 2. Analytics Database
const analyticsDb = db.getSiblingDB('caas_analytics');
print("\nInitializing database: caas_analytics");
createCollectionSafely(analyticsDb, 'audit_logs');
analyticsDb.audit_logs.createIndex({ tenant_id: 1, created_at: -1 });
analyticsDb.audit_logs.createIndex({ user_id: 1, created_at: -1 });
analyticsDb.audit_logs.createIndex({ action: 1 });

// 3. Compliance Database
const complianceDb = db.getSiblingDB('caas_compliance');
print("\nInitializing database: caas_compliance");
createCollectionSafely(complianceDb, 'audit_logs');
createCollectionSafely(complianceDb, 'privacy_requests');
createCollectionSafely(complianceDb, 'retention_policies');

print("");
print("===========================================");
print("Database Initialization Complete!");
print("===========================================");
