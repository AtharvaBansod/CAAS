# Data Migration Strategy
## Phase 4.5.4 - Schema Evolution and Data Versioning

**Date**: February 21, 2026  
**Status**: ✅ Documented  
**Version**: 1.0

---

## Overview

This document outlines the data migration strategy for the CAAS platform, including schema versioning, migration procedures, zero-downtime deployments, and rollback strategies.

---

## Schema Versioning

### Version Tracking

All documents include a `schema_version` field:

```typescript
interface VersionedDocument {
  _id: ObjectId;
  schema_version: number;
  // ... other fields
  created_at: Date;
  updated_at: Date;
}
```

**Example:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "schema_version": 2,
  "user_id": "user_123",
  "email": "user@example.com",
  "preferences": {
    "theme": "dark",
    "notifications": true
  },
  "created_at": "2026-01-15T10:00:00Z",
  "updated_at": "2026-02-21T14:30:00Z"
}
```

### Version History

| Version | Date | Changes | Migration Required |
|---------|------|---------|-------------------|
| 1 | 2026-01-01 | Initial schema | No |
| 2 | 2026-02-01 | Added preferences field | Yes |
| 3 | 2026-03-01 | Split name into first/last | Yes |

---

## Migration Types

### 1. Additive Migrations (Backward Compatible)

**Definition:** Adding new fields with default values

**Example:**
```typescript
// Migration: Add preferences field
async function migrateUsersV1toV2() {
  const db = MongoDBConnection.getDb();
  
  await db.collection('users').updateMany(
    { schema_version: { $exists: false } },
    {
      $set: {
        schema_version: 2,
        preferences: {
          theme: 'light',
          notifications: true,
          language: 'en',
        },
        updated_at: new Date(),
      },
    }
  );
  
  console.log('Migration V1 -> V2 complete');
}
```

**Deployment Strategy:**
1. Deploy new code (handles both V1 and V2)
2. Run migration script
3. Verify migration
4. Remove V1 compatibility code (optional)

### 2. Transformative Migrations (Breaking Changes)

**Definition:** Restructuring existing data

**Example:**
```typescript
// Migration: Split name into first_name and last_name
async function migrateUsersV2toV3() {
  const db = MongoDBConnection.getDb();
  
  const users = await db.collection('users')
    .find({ schema_version: 2 })
    .toArray();
  
  for (const user of users) {
    const [first_name, ...last_name_parts] = user.name.split(' ');
    const last_name = last_name_parts.join(' ');
    
    await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          schema_version: 3,
          first_name,
          last_name,
          updated_at: new Date(),
        },
        $unset: {
          name: '',
        },
      }
    );
  }
  
  console.log('Migration V2 -> V3 complete');
}
```

**Deployment Strategy:**
1. Deploy new code (handles V2 and V3)
2. Run migration in batches
3. Verify each batch
4. Complete migration
5. Remove V2 compatibility code

### 3. Destructive Migrations (Data Removal)

**Definition:** Removing fields or collections

**Example:**
```typescript
// Migration: Remove deprecated field
async function migrateUsersV3toV4() {
  const db = MongoDBConnection.getDb();
  
  await db.collection('users').updateMany(
    { schema_version: 3 },
    {
      $set: {
        schema_version: 4,
        updated_at: new Date(),
      },
      $unset: {
        deprecated_field: '',
      },
    }
  );
  
  console.log('Migration V3 -> V4 complete');
}
```

**Deployment Strategy:**
1. Ensure field is no longer used
2. Deploy code without field references
3. Wait for deployment to stabilize
4. Run migration to remove field
5. Verify no errors

---

## Migration Framework

### Migration Script Structure

```typescript
// migrations/001_add_preferences.ts

export interface Migration {
  version: number;
  description: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

export const migration: Migration = {
  version: 2,
  description: 'Add user preferences field',
  
  async up() {
    const db = MongoDBConnection.getDb();
    
    await db.collection('users').updateMany(
      { schema_version: { $exists: false } },
      {
        $set: {
          schema_version: 2,
          preferences: {
            theme: 'light',
            notifications: true,
          },
          updated_at: new Date(),
        },
      }
    );
  },
  
  async down() {
    const db = MongoDBConnection.getDb();
    
    await db.collection('users').updateMany(
      { schema_version: 2 },
      {
        $unset: {
          schema_version: '',
          preferences: '',
        },
      }
    );
  },
};
```

### Migration Runner

```typescript
// migrations/runner.ts

import { MongoDBConnection } from '../storage/mongodb-connection';
import * as fs from 'fs';
import * as path from 'path';

export class MigrationRunner {
  private migrationsDir = path.join(__dirname, 'migrations');
  
  async getCurrentVersion(): Promise<number> {
    const db = MongoDBConnection.getDb();
    const meta = await db.collection('_migrations').findOne({ _id: 'current' });
    return meta?.version || 0;
  }
  
  async setCurrentVersion(version: number): Promise<void> {
    const db = MongoDBConnection.getDb();
    await db.collection('_migrations').updateOne(
      { _id: 'current' },
      { $set: { version, updated_at: new Date() } },
      { upsert: true }
    );
  }
  
  async loadMigrations(): Promise<Migration[]> {
    const files = fs.readdirSync(this.migrationsDir)
      .filter(f => f.endsWith('.ts') || f.endsWith('.js'))
      .sort();
    
    const migrations: Migration[] = [];
    for (const file of files) {
      const migration = await import(path.join(this.migrationsDir, file));
      migrations.push(migration.migration);
    }
    
    return migrations.sort((a, b) => a.version - b.version);
  }
  
  async migrate(targetVersion?: number): Promise<void> {
    const currentVersion = await this.getCurrentVersion();
    const migrations = await this.loadMigrations();
    
    const target = targetVersion || Math.max(...migrations.map(m => m.version));
    
    console.log(`Current version: ${currentVersion}`);
    console.log(`Target version: ${target}`);
    
    if (currentVersion === target) {
      console.log('Already at target version');
      return;
    }
    
    if (currentVersion < target) {
      // Migrate up
      for (const migration of migrations) {
        if (migration.version > currentVersion && migration.version <= target) {
          console.log(`Running migration ${migration.version}: ${migration.description}`);
          await migration.up();
          await this.setCurrentVersion(migration.version);
          console.log(`✅ Migration ${migration.version} complete`);
        }
      }
    } else {
      // Migrate down
      for (const migration of migrations.reverse()) {
        if (migration.version <= currentVersion && migration.version > target) {
          console.log(`Rolling back migration ${migration.version}: ${migration.description}`);
          await migration.down();
          await this.setCurrentVersion(migration.version - 1);
          console.log(`✅ Rollback ${migration.version} complete`);
        }
      }
    }
    
    console.log('Migration complete');
  }
}

// CLI usage
if (require.main === module) {
  const runner = new MigrationRunner();
  const targetVersion = process.argv[2] ? parseInt(process.argv[2]) : undefined;
  
  runner.migrate(targetVersion)
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
```

**Usage:**
```bash
# Migrate to latest version
npm run migrate

# Migrate to specific version
npm run migrate 5

# Rollback to previous version
npm run migrate 3
```

---

## Zero-Downtime Migrations

### Strategy: Expand-Contract Pattern

**Phase 1: Expand (Add New Schema)**
1. Deploy code that supports both old and new schema
2. Write to both old and new fields
3. Read from old field (fallback to new)

**Phase 2: Migrate Data**
1. Run migration script to populate new fields
2. Verify data integrity
3. Monitor for errors

**Phase 3: Contract (Remove Old Schema)**
1. Deploy code that only uses new schema
2. Stop writing to old fields
3. Remove old field references

**Phase 4: Cleanup**
1. Run cleanup script to remove old fields
2. Verify no errors
3. Update documentation

### Example: Renaming a Field

**Phase 1: Expand**
```typescript
// Support both old and new field names
class UserService {
  async getUser(user_id: string) {
    const user = await db.collection('users').findOne({ user_id });
    
    // Read from new field, fallback to old
    const email = user.email_address || user.email;
    
    return {
      ...user,
      email_address: email,
    };
  }
  
  async updateUser(user_id: string, data: any) {
    // Write to both fields
    await db.collection('users').updateOne(
      { user_id },
      {
        $set: {
          email: data.email_address,
          email_address: data.email_address,
          updated_at: new Date(),
        },
      }
    );
  }
}
```

**Phase 2: Migrate**
```typescript
// Migration script
async function migrateEmailField() {
  const db = MongoDBConnection.getDb();
  
  await db.collection('users').updateMany(
    { email_address: { $exists: false } },
    [
      {
        $set: {
          email_address: '$email',
          updated_at: new Date(),
        },
      },
    ]
  );
}
```

**Phase 3: Contract**
```typescript
// Only use new field
class UserService {
  async getUser(user_id: string) {
    const user = await db.collection('users').findOne({ user_id });
    return user;
  }
  
  async updateUser(user_id: string, data: any) {
    await db.collection('users').updateOne(
      { user_id },
      {
        $set: {
          email_address: data.email_address,
          updated_at: new Date(),
        },
      }
    );
  }
}
```

**Phase 4: Cleanup**
```typescript
// Remove old field
async function cleanupEmailField() {
  const db = MongoDBConnection.getDb();
  
  await db.collection('users').updateMany(
    { email: { $exists: true } },
    {
      $unset: { email: '' },
    }
  );
}
```

---

## Batch Processing

### Large Dataset Migrations

For large collections, process in batches to avoid memory issues:

```typescript
async function migrateLargeCollection() {
  const db = MongoDBConnection.getDb();
  const batchSize = 1000;
  let processed = 0;
  
  while (true) {
    const batch = await db.collection('users')
      .find({ schema_version: 1 })
      .limit(batchSize)
      .toArray();
    
    if (batch.length === 0) break;
    
    const bulkOps = batch.map(doc => ({
      updateOne: {
        filter: { _id: doc._id },
        update: {
          $set: {
            schema_version: 2,
            preferences: { theme: 'light' },
            updated_at: new Date(),
          },
        },
      },
    }));
    
    await db.collection('users').bulkWrite(bulkOps);
    
    processed += batch.length;
    console.log(`Processed ${processed} documents`);
    
    // Small delay to avoid overwhelming the database
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`Migration complete: ${processed} documents`);
}
```

---

## Rollback Strategies

### Automatic Rollback

```typescript
async function migrateWithRollback() {
  const db = MongoDBConnection.getDb();
  const session = db.client.startSession();
  
  try {
    await session.withTransaction(async () => {
      // Perform migration
      await db.collection('users').updateMany(
        { schema_version: 1 },
        { $set: { schema_version: 2, preferences: {} } },
        { session }
      );
      
      // Verify migration
      const count = await db.collection('users')
        .countDocuments({ schema_version: 2 }, { session });
      
      if (count === 0) {
        throw new Error('Migration verification failed');
      }
    });
    
    console.log('Migration successful');
  } catch (error) {
    console.error('Migration failed, rolling back:', error);
    // Transaction automatically rolled back
  } finally {
    await session.endSession();
  }
}
```

### Manual Rollback

```typescript
// Rollback script
async function rollbackMigration(version: number) {
  const db = MongoDBConnection.getDb();
  
  console.log(`Rolling back to version ${version}`);
  
  // Load migration
  const migration = await import(`./migrations/${version}_migration.ts`);
  
  // Run down migration
  await migration.migration.down();
  
  // Update version
  await db.collection('_migrations').updateOne(
    { _id: 'current' },
    { $set: { version, updated_at: new Date() } }
  );
  
  console.log('Rollback complete');
}
```

---

## Testing Migrations

### Migration Test Suite

```typescript
// migrations/001_add_preferences.test.ts

import { MongoDBConnection } from '../storage/mongodb-connection';
import { migration } from './001_add_preferences';

describe('Migration 001: Add Preferences', () => {
  beforeAll(async () => {
    await MongoDBConnection.connect();
  });
  
  afterAll(async () => {
    await MongoDBConnection.disconnect();
  });
  
  it('should add preferences field to users', async () => {
    const db = MongoDBConnection.getDb();
    
    // Insert test data
    await db.collection('users').insertOne({
      user_id: 'test_user',
      email: 'test@example.com',
    });
    
    // Run migration
    await migration.up();
    
    // Verify
    const user = await db.collection('users').findOne({ user_id: 'test_user' });
    expect(user.schema_version).toBe(2);
    expect(user.preferences).toBeDefined();
    expect(user.preferences.theme).toBe('light');
  });
  
  it('should rollback preferences field', async () => {
    const db = MongoDBConnection.getDb();
    
    // Run down migration
    await migration.down();
    
    // Verify
    const user = await db.collection('users').findOne({ user_id: 'test_user' });
    expect(user.schema_version).toBeUndefined();
    expect(user.preferences).toBeUndefined();
  });
});
```

### Integration Testing

```bash
#!/bin/bash
# Test migration in staging environment

echo "Testing migration in staging..."

# Backup staging database
mongodump --host staging-mongodb --out /tmp/staging_backup

# Run migration
npm run migrate

# Run integration tests
npm run test:integration

# Verify data integrity
npm run verify:data

if [ $? -eq 0 ]; then
  echo "✅ Migration test passed"
else
  echo "❌ Migration test failed, rolling back"
  mongorestore --host staging-mongodb --drop /tmp/staging_backup
  exit 1
fi
```

---

## Best Practices

### 1. Always Version Your Schema
- Include `schema_version` in all documents
- Track version in code and database
- Document version changes

### 2. Make Migrations Reversible
- Implement both `up` and `down` migrations
- Test rollback procedures
- Keep old data during transition

### 3. Test Thoroughly
- Unit test migrations
- Integration test in staging
- Verify data integrity
- Test rollback procedures

### 4. Use Batch Processing
- Process large datasets in batches
- Add delays to avoid overwhelming database
- Monitor progress and errors

### 5. Maintain Backward Compatibility
- Support multiple schema versions during transition
- Use expand-contract pattern
- Gradual rollout

### 6. Monitor and Alert
- Monitor migration progress
- Alert on failures
- Track migration duration
- Log all changes

### 7. Document Everything
- Document schema changes
- Maintain migration history
- Update API documentation
- Communicate changes to team

---

## Migration Checklist

### Pre-Migration
- [ ] Review migration script
- [ ] Test in development environment
- [ ] Test in staging environment
- [ ] Backup production database
- [ ] Schedule maintenance window (if needed)
- [ ] Notify stakeholders
- [ ] Prepare rollback plan

### During Migration
- [ ] Monitor migration progress
- [ ] Watch for errors
- [ ] Verify data integrity
- [ ] Check application logs
- [ ] Monitor system performance

### Post-Migration
- [ ] Verify migration success
- [ ] Run integration tests
- [ ] Check data consistency
- [ ] Monitor for errors
- [ ] Update documentation
- [ ] Notify stakeholders of completion

---

## Conclusion

The CAAS platform implements a robust data migration strategy with:

- ✅ Schema versioning for all documents
- ✅ Migration framework with up/down migrations
- ✅ Zero-downtime migration support
- ✅ Batch processing for large datasets
- ✅ Automatic and manual rollback capabilities
- ✅ Comprehensive testing procedures
- ✅ Monitoring and alerting

This strategy ensures safe and reliable schema evolution while maintaining system availability.

---

**Document Version**: 1.0  
**Last Updated**: February 21, 2026  
**Review Schedule**: Quarterly  
**Maintained By**: Platform Team
