# Auth Security - Compliance Implementation

> **Parent Roadmap**: [Auth & Security](../../roadmaps/3_AuthAutorizeSecurity.md)

---

## Overview

Compliance features for GDPR, HIPAA, SOC2, and other regulatory requirements.

---

## 1. GDPR Compliance

### Data Subject Rights

```typescript
interface DataSubjectRequest {
  type: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction';
  userId: string;
  tenantId: string;
  requestedAt: Date;
  completedAt?: Date;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
}

class GDPRService {
  // Right to Access (Article 15)
  async exportUserData(userId: string): Promise<UserDataExport> {
    const data = {
      profile: await db.users.findById(userId),
      messages: await db.messages.find({ sender_id: userId }),
      conversations: await db.conversations.find({ 'participants.user_id': userId }),
      files: await db.files.find({ uploaded_by: userId }),
      activityLogs: await db.auditLogs.find({ user_id: userId })
    };
    
    return {
      exportedAt: new Date(),
      format: 'json',
      data
    };
  }
  
  // Right to Erasure (Article 17)
  async eraseUserData(userId: string): Promise<void> {
    // Anonymize messages (keep for conversation integrity)
    await db.messages.updateMany(
      { sender_id: userId },
      { $set: { sender_id: 'deleted_user', content: '[deleted]' } }
    );
    
    // Delete files
    await storage.deleteUserFiles(userId);
    
    // Delete profile
    await db.users.deleteOne({ _id: userId });
    
    // Log for audit
    await this.logDataDeletion(userId);
  }
  
  // Right to Portability (Article 20)
  async exportPortableData(userId: string): Promise<Buffer> {
    const data = await this.exportUserData(userId);
    return Buffer.from(JSON.stringify(data, null, 2));
  }
}
```

### Consent Management

```typescript
interface ConsentRecord {
  userId: string;
  tenantId: string;
  consents: {
    marketing: { granted: boolean; timestamp: Date };
    analytics: { granted: boolean; timestamp: Date };
    thirdParty: { granted: boolean; timestamp: Date };
  };
  version: string;  // Privacy policy version
}

// Track consent changes
await db.consentHistory.insertOne({
  userId,
  action: 'granted',
  consentType: 'analytics',
  timestamp: new Date(),
  ipAddress: req.ip
});
```

---

## 2. Data Retention Policies

```typescript
interface RetentionPolicy {
  dataType: string;
  retentionPeriod: number;  // days
  action: 'delete' | 'anonymize' | 'archive';
}

const retentionPolicies: RetentionPolicy[] = [
  { dataType: 'messages', retentionPeriod: 365, action: 'archive' },
  { dataType: 'auditLogs', retentionPeriod: 2555, action: 'archive' }, // 7 years
  { dataType: 'sessionLogs', retentionPeriod: 90, action: 'delete' },
  { dataType: 'analyticsEvents', retentionPeriod: 730, action: 'anonymize' }
];

// Scheduled job for retention enforcement
async function enforceRetention() {
  for (const policy of retentionPolicies) {
    const cutoffDate = subDays(new Date(), policy.retentionPeriod);
    
    switch (policy.action) {
      case 'delete':
        await db[policy.dataType].deleteMany({ created_at: { $lt: cutoffDate } });
        break;
      case 'anonymize':
        await anonymizeOldRecords(policy.dataType, cutoffDate);
        break;
      case 'archive':
        await archiveToS3(policy.dataType, cutoffDate);
        break;
    }
  }
}
```

---

## 3. Audit Logging

```typescript
interface AuditLog {
  id: string;
  timestamp: Date;
  tenantId: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  changes?: { field: string; before: any; after: any }[];
  ipAddress: string;
  userAgent: string;
  outcome: 'success' | 'failure';
  metadata?: Record<string, any>;
}

class AuditLogger {
  async log(event: Partial<AuditLog>): Promise<void> {
    const log: AuditLog = {
      id: generateId(),
      timestamp: new Date(),
      ...event
    };
    
    // Write to immutable audit store
    await db.auditLogs.insertOne(log);
    
    // Also stream to SIEM if configured
    if (siemEnabled) {
      await kafka.send('audit-logs', log);
    }
  }
}

// Usage
await auditLogger.log({
  tenantId: req.tenantId,
  userId: req.user.id,
  action: 'user.update',
  resourceType: 'user',
  resourceId: targetUserId,
  changes: [
    { field: 'email', before: oldEmail, after: newEmail }
  ],
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
  outcome: 'success'
});
```

---

## 4. SOC2 Controls

### Access Control (CC6.1)
```typescript
// Enforce MFA for admin access
async function requireMFA(req: Request): Promise<boolean> {
  if (req.user.roles.includes('admin')) {
    const mfaVerified = await mfaService.verify(req.user.id, req.headers['x-mfa-token']);
    if (!mfaVerified) {
      throw new ForbiddenError('MFA required for admin access');
    }
  }
  return true;
}
```

### Change Management (CC8.1)
```typescript
// All configuration changes logged
async function updateConfig(key: string, value: any, userId: string) {
  const previous = await db.config.findOne({ key });
  
  await db.config.updateOne({ key }, { $set: { value, updated_by: userId } });
  
  await auditLogger.log({
    action: 'config.update',
    resourceType: 'config',
    resourceId: key,
    changes: [{ field: key, before: previous?.value, after: value }],
    userId
  });
}
```

---

## 5. HIPAA (Healthcare)

```typescript
// PHI access logging
interface PHIAccessLog {
  userId: string;
  patientId: string;
  accessType: 'view' | 'create' | 'update' | 'download';
  dataCategories: string[];
  reason: string;
  timestamp: Date;
}

// Encryption at rest for PHI
const encryptionConfig = {
  algorithm: 'AES-256-GCM',
  keyRotationDays: 90,
  fields: ['patient_name', 'diagnosis', 'ssn', 'dob']
};
```

---

## 6. Compliance Dashboard API

```typescript
// GET /api/compliance/status
router.get('/compliance/status', async (req, res) => {
  const status = {
    gdpr: {
      pendingRequests: await db.dsrRequests.count({ status: 'pending' }),
      avgResponseTime: await calculateAvgResponseTime(),
      compliant: true
    },
    retention: {
      lastRun: await getLastRetentionRun(),
      policiesActive: retentionPolicies.length
    },
    auditing: {
      logsLast24h: await db.auditLogs.count({ timestamp: { $gte: yesterday } }),
      storageUsed: await getAuditStorageSize()
    }
  };
  
  res.json(status);
});
```

---

## Related Documents
- [Audit Logging](../../flowdiagram/audit-logging.md)
- [E2E Key Management](./e2e-key-management.md)
