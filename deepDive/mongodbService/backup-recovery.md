# MongoDB Service - Backup & Recovery

> **Parent Roadmap**: [MongoDB Service](../../roadmaps/4_mongodbService.md)

---

## Overview

Disaster recovery procedures for MongoDB including backup, restore, and failover.

---

## 1. Backup Strategy

### Backup Types
```
┌────────────────────────────────────────────────────────┐
│                    Backup Strategy                      │
├────────────────────┬───────────────────────────────────┤
│   Continuous       │        Periodic                   │
│   (Oplog-based)    │        (Snapshots)               │
│                    │                                   │
│   • Point-in-time  │   • Full backups daily           │
│   • 24hr retention │   • S3 storage                   │
│   • Sub-second RPO │   • 30-day retention             │
└────────────────────┴───────────────────────────────────┘
```

### mongodump Backup
```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/mongodb/${DATE}"
S3_BUCKET="s3://caas-backups/mongodb"

# Create backup
mongodump \
  --uri="mongodb://admin:password@mongo-primary:27017" \
  --out="${BACKUP_DIR}" \
  --gzip \
  --oplog

# Upload to S3
aws s3 sync "${BACKUP_DIR}" "${S3_BUCKET}/${DATE}" --sse AES256

# Cleanup old local backups (keep 7 days)
find /backups/mongodb -type d -mtime +7 -exec rm -rf {} \;

# Cleanup old S3 backups (keep 30 days) - handled by lifecycle policy
```

---

## 2. Continuous Backup (Oplog)

```typescript
// Oplog tailer for continuous backup
class OplogBackup {
  private lastTimestamp: Timestamp;
  
  async start(): Promise<void> {
    const oplog = db.collection('oplog.rs');
    
    const cursor = oplog.find(
      { ts: { $gt: this.lastTimestamp } },
      { 
        tailable: true, 
        awaitData: true,
        noCursorTimeout: true 
      }
    );
    
    for await (const doc of cursor) {
      await this.processOplogEntry(doc);
      this.lastTimestamp = doc.ts;
    }
  }
  
  private async processOplogEntry(entry: OplogEntry): Promise<void> {
    // Stream to backup storage
    await kafka.send('oplog-backup', {
      key: entry.ns,
      value: JSON.stringify(entry)
    });
  }
}
```

---

## 3. Restore Procedures

### Full Restore
```bash
#!/bin/bash
# restore.sh

BACKUP_DATE=$1
BACKUP_DIR="/backups/mongodb/${BACKUP_DATE}"

# Download from S3 if needed
aws s3 sync "s3://caas-backups/mongodb/${BACKUP_DATE}" "${BACKUP_DIR}"

# Restore
mongorestore \
  --uri="mongodb://admin:password@mongo-primary:27017" \
  --gzip \
  --oplogReplay \
  --drop \
  "${BACKUP_DIR}"
```

### Point-in-Time Recovery
```bash
# Restore to specific point in time
mongorestore \
  --uri="mongodb://admin:password@mongo-primary:27017" \
  --gzip \
  --oplogReplay \
  --oplogLimit="Timestamp(1705654321, 1)" \
  "${BACKUP_DIR}"
```

---

## 4. Disaster Recovery

### RTO/RPO Targets

| Metric | Target | Strategy |
|--------|--------|----------|
| RPO (data loss) | < 1 minute | Oplog streaming |
| RTO (recovery time) | < 1 hour | Automated failover |

### Failover Procedure
```typescript
// Automated failover monitoring
class FailoverMonitor {
  async checkHealth(): Promise<void> {
    try {
      await this.primaryClient.command({ ping: 1 });
    } catch (error) {
      await this.initiateFailover();
    }
  }
  
  private async initiateFailover(): Promise<void> {
    // 1. Alert operations team
    await this.sendAlert('Primary node unreachable');
    
    // 2. MongoDB replica set auto-elects new primary
    // Wait for election
    await sleep(30000);
    
    // 3. Verify new primary
    const status = await this.client.command({ replSetGetStatus: 1 });
    const newPrimary = status.members.find(m => m.stateStr === 'PRIMARY');
    
    // 4. Update DNS/service discovery
    await this.updateServiceEndpoint(newPrimary.name);
    
    // 5. Notify applications to reconnect
    await this.broadcastReconnect();
  }
}
```

---

## 5. Testing Recovery

```typescript
// Monthly DR test procedure
async function testDisasterRecovery(): Promise<TestResult> {
  const testDb = 'caas_dr_test';
  
  // 1. Create test data
  await createTestData(testDb);
  
  // 2. Take backup
  await mongodump(testDb);
  
  // 3. Drop test database
  await db.dropDatabase(testDb);
  
  // 4. Restore from backup
  await mongorestore(testDb);
  
  // 5. Verify data integrity
  const verified = await verifyTestData(testDb);
  
  // 6. Cleanup
  await db.dropDatabase(testDb);
  
  return {
    success: verified,
    rto: measuredRTO,
    rpo: measuredRPO,
    timestamp: new Date()
  };
}
```

---

## 6. Backup Monitoring

| Metric | Alert Threshold |
|--------|-----------------|
| Backup Age | > 24 hours |
| Backup Size Delta | > 50% change |
| Restore Test Age | > 30 days |
| Oplog Lag | > 1 minute |

---

## Related Documents
- [Development Setup](./development-setup.md)
- [Query Optimization](./query-optimization.md)
