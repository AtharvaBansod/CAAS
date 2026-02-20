# Backup and Recovery Strategy
## Phase 4.5.4 - Data Protection and Disaster Recovery

**Date**: February 21, 2026  
**Status**: ✅ Documented  
**Version**: 1.0

---

## Overview

This document outlines the backup and recovery strategy for the CAAS platform, including backup procedures, recovery processes, disaster recovery planning, and testing protocols.

---

## Backup Strategy

### 1. MongoDB Backups

**Backup Types:**

**A. Full Backups**
- **Frequency**: Daily at 2:00 AM UTC
- **Method**: mongodump with compression
- **Retention**: 30 days
- **Storage**: External backup storage (S3-compatible)

**B. Incremental Backups**
- **Frequency**: Every 6 hours
- **Method**: Oplog tailing
- **Retention**: 7 days
- **Purpose**: Point-in-time recovery

**Backup Script:**
```bash
#!/bin/bash
# MongoDB backup script

BACKUP_DIR="/backups/mongodb"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="caas_backup_${DATE}.gz"

# Create backup
mongodump \
  --host mongodb-primary:27017 \
  --username caas_admin \
  --password caas_secret_2026 \
  --authenticationDatabase admin \
  --gzip \
  --archive="${BACKUP_DIR}/${BACKUP_FILE}"

# Upload to S3
aws s3 cp "${BACKUP_DIR}/${BACKUP_FILE}" \
  s3://caas-backups/mongodb/${BACKUP_FILE}

# Clean up old backups (keep 30 days)
find ${BACKUP_DIR} -name "caas_backup_*.gz" -mtime +30 -delete

echo "Backup completed: ${BACKUP_FILE}"
```

**Automated Backup with Docker:**
```yaml
# docker-compose.yml
services:
  mongodb-backup:
    image: mongo:7.0
    container_name: caas-mongodb-backup
    networks:
      - caas-network
    volumes:
      - ./backups:/backups
      - ./scripts/backup-mongodb.sh:/backup.sh
    environment:
      - MONGO_HOST=mongodb-primary
      - MONGO_USER=caas_admin
      - MONGO_PASSWORD=caas_secret_2026
    command: >
      bash -c "
        while true; do
          /backup.sh
          sleep 21600  # 6 hours
        done
      "
```

### 2. Redis Backups

**Backup Types:**

**A. RDB Snapshots**
- **Frequency**: Every 6 hours
- **Method**: BGSAVE command
- **Retention**: 7 days
- **File**: dump.rdb

**B. AOF (Append-Only File)**
- **Frequency**: Continuous
- **Method**: Append-only file
- **Retention**: Current + 1 previous
- **File**: appendonly.aof

**Redis Configuration:**
```conf
# redis.conf

# RDB Snapshots
save 900 1      # After 900 sec if at least 1 key changed
save 300 10     # After 300 sec if at least 10 keys changed
save 60 10000   # After 60 sec if at least 10000 keys changed

# AOF
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec

# Backup directory
dir /data
```

**Backup Script:**
```bash
#!/bin/bash
# Redis backup script

BACKUP_DIR="/backups/redis"
DATE=$(date +%Y-%m-%d_%H-%M-%S)

# Trigger RDB snapshot
redis-cli -h redis -p 6379 BGSAVE

# Wait for snapshot to complete
while [ $(redis-cli -h redis -p 6379 LASTSAVE) -eq $LAST_SAVE ]; do
  sleep 1
done

# Copy RDB file
docker cp caas-redis:/data/dump.rdb \
  "${BACKUP_DIR}/dump_${DATE}.rdb"

# Upload to S3
aws s3 cp "${BACKUP_DIR}/dump_${DATE}.rdb" \
  s3://caas-backups/redis/dump_${DATE}.rdb

# Clean up old backups
find ${BACKUP_DIR} -name "dump_*.rdb" -mtime +7 -delete

echo "Redis backup completed: dump_${DATE}.rdb"
```

### 3. Kafka Backups

**Backup Strategy:**
- **Topic Configuration**: Backed up via Kafka Admin API
- **Consumer Offsets**: Stored in __consumer_offsets topic
- **Messages**: Retained based on retention policy (7 days)

**Configuration Backup:**
```bash
#!/bin/bash
# Kafka configuration backup

BACKUP_DIR="/backups/kafka"
DATE=$(date +%Y-%m-%d)

# Export topic configurations
kafka-topics --bootstrap-server kafka-1:9092 \
  --describe --topics-with-overrides \
  > "${BACKUP_DIR}/topics_${DATE}.txt"

# Export consumer group offsets
kafka-consumer-groups --bootstrap-server kafka-1:9092 \
  --all-groups --describe \
  > "${BACKUP_DIR}/consumer_groups_${DATE}.txt"

echo "Kafka configuration backed up"
```

### 4. Application Configuration Backups

**What to Backup:**
- Environment variables (.env files)
- Docker Compose configurations
- Service configurations
- SSL certificates and keys
- JWT signing keys

**Backup Script:**
```bash
#!/bin/bash
# Configuration backup

BACKUP_DIR="/backups/config"
DATE=$(date +%Y-%m-%d)
BACKUP_FILE="config_${DATE}.tar.gz"

# Create tarball
tar -czf "${BACKUP_DIR}/${BACKUP_FILE}" \
  .env \
  docker-compose.yml \
  keys/ \
  services/*/config/ \
  --exclude='node_modules' \
  --exclude='dist'

# Upload to S3
aws s3 cp "${BACKUP_DIR}/${BACKUP_FILE}" \
  s3://caas-backups/config/${BACKUP_FILE}

echo "Configuration backed up: ${BACKUP_FILE}"
```

---

## Recovery Procedures

### 1. MongoDB Recovery

**Full Restore:**
```bash
#!/bin/bash
# MongoDB full restore

BACKUP_FILE="caas_backup_2026-02-21_02-00-00.gz"

# Stop services
docker compose stop gateway socket-service-1 socket-service-2

# Restore from backup
mongorestore \
  --host mongodb-primary:27017 \
  --username caas_admin \
  --password caas_secret_2026 \
  --authenticationDatabase admin \
  --gzip \
  --archive="/backups/mongodb/${BACKUP_FILE}" \
  --drop  # Drop existing collections

# Restart services
docker compose start gateway socket-service-1 socket-service-2

echo "MongoDB restored from ${BACKUP_FILE}"
```

**Point-in-Time Recovery:**
```bash
#!/bin/bash
# MongoDB point-in-time recovery

TARGET_TIME="2026-02-21T10:30:00Z"
BACKUP_FILE="caas_backup_2026-02-21_02-00-00.gz"
OPLOG_FILE="oplog_2026-02-21.bson"

# Restore base backup
mongorestore \
  --host mongodb-primary:27017 \
  --username caas_admin \
  --password caas_secret_2026 \
  --authenticationDatabase admin \
  --gzip \
  --archive="/backups/mongodb/${BACKUP_FILE}" \
  --drop

# Replay oplog up to target time
mongorestore \
  --host mongodb-primary:27017 \
  --username caas_admin \
  --password caas_secret_2026 \
  --authenticationDatabase admin \
  --oplogReplay \
  --oplogLimit "${TARGET_TIME}" \
  "/backups/mongodb/oplog/${OPLOG_FILE}"

echo "Point-in-time recovery completed to ${TARGET_TIME}"
```

### 2. Redis Recovery

**RDB Restore:**
```bash
#!/bin/bash
# Redis RDB restore

BACKUP_FILE="dump_2026-02-21_02-00-00.rdb"

# Stop Redis
docker compose stop redis

# Replace RDB file
docker cp "/backups/redis/${BACKUP_FILE}" \
  caas-redis:/data/dump.rdb

# Start Redis
docker compose start redis

# Verify
redis-cli -h redis -p 6379 PING

echo "Redis restored from ${BACKUP_FILE}"
```

**AOF Restore:**
```bash
#!/bin/bash
# Redis AOF restore

# Stop Redis
docker compose stop redis

# Copy AOF file
docker cp "/backups/redis/appendonly.aof" \
  caas-redis:/data/appendonly.aof

# Start Redis (will replay AOF)
docker compose start redis

echo "Redis restored from AOF"
```

### 3. Kafka Recovery

**Topic Recreation:**
```bash
#!/bin/bash
# Kafka topic recovery

# Read topic configurations from backup
while IFS= read -r line; do
  # Parse and recreate topics
  kafka-topics --bootstrap-server kafka-1:9092 \
    --create --topic $TOPIC_NAME \
    --partitions $PARTITIONS \
    --replication-factor $REPLICATION \
    --config $CONFIGS
done < "/backups/kafka/topics_2026-02-21.txt"

echo "Kafka topics recreated"
```

---

## Disaster Recovery

### Disaster Recovery Plan

**Recovery Time Objective (RTO):** 4 hours  
**Recovery Point Objective (RPO):** 6 hours

**Disaster Scenarios:**

1. **Complete Data Center Failure**
2. **Database Corruption**
3. **Ransomware Attack**
4. **Natural Disaster**

### DR Procedures

**Phase 1: Assessment (15 minutes)**
1. Identify the scope of the disaster
2. Determine which systems are affected
3. Activate DR team
4. Notify stakeholders

**Phase 2: Infrastructure Provisioning (1 hour)**
1. Provision new infrastructure (cloud or DR site)
2. Set up networking and security
3. Deploy Docker environment
4. Configure load balancers

**Phase 3: Data Restoration (2 hours)**
1. Restore MongoDB from latest backup
2. Restore Redis from latest snapshot
3. Restore Kafka configurations
4. Restore application configurations

**Phase 4: Service Startup (30 minutes)**
1. Start infrastructure services
2. Start application services
3. Verify service health
4. Run smoke tests

**Phase 5: Verification (30 minutes)**
1. Verify data integrity
2. Test critical workflows
3. Monitor for errors
4. Update DNS/load balancer

**Phase 6: Monitoring (Ongoing)**
1. Monitor system performance
2. Watch for anomalies
3. Communicate status to stakeholders
4. Document lessons learned

### DR Runbook

```bash
#!/bin/bash
# Disaster Recovery Runbook

echo "=== CAAS Platform Disaster Recovery ==="
echo "Starting DR procedures..."

# 1. Provision Infrastructure
echo "Step 1: Provisioning infrastructure..."
terraform apply -var-file=dr.tfvars

# 2. Deploy Docker Environment
echo "Step 2: Deploying Docker environment..."
docker compose -f docker-compose.dr.yml up -d mongodb-primary redis kafka-1

# 3. Restore MongoDB
echo "Step 3: Restoring MongoDB..."
LATEST_BACKUP=$(aws s3 ls s3://caas-backups/mongodb/ | sort | tail -n 1 | awk '{print $4}')
aws s3 cp "s3://caas-backups/mongodb/${LATEST_BACKUP}" /tmp/
mongorestore --gzip --archive="/tmp/${LATEST_BACKUP}" --drop

# 4. Restore Redis
echo "Step 4: Restoring Redis..."
LATEST_REDIS=$(aws s3 ls s3://caas-backups/redis/ | sort | tail -n 1 | awk '{print $4}')
aws s3 cp "s3://caas-backups/redis/${LATEST_REDIS}" /tmp/dump.rdb
docker cp /tmp/dump.rdb caas-redis:/data/dump.rdb
docker restart caas-redis

# 5. Start Services
echo "Step 5: Starting application services..."
docker compose -f docker-compose.dr.yml up -d

# 6. Verify Health
echo "Step 6: Verifying service health..."
./scripts/health-check.sh

echo "=== DR Procedures Complete ==="
echo "RTO: $(date -d @$SECONDS -u +%H:%M:%S)"
```

---

## Backup Testing

### Regular Testing Schedule

**Monthly:**
- Test full MongoDB restore
- Test Redis restore
- Verify backup integrity

**Quarterly:**
- Full disaster recovery drill
- Test point-in-time recovery
- Update DR documentation

**Annually:**
- Complete DR simulation
- Review and update procedures
- Train new team members

### Test Procedures

**Backup Integrity Test:**
```bash
#!/bin/bash
# Test backup integrity

BACKUP_FILE="caas_backup_2026-02-21_02-00-00.gz"

# Restore to test database
mongorestore \
  --host mongodb-test:27017 \
  --username test_admin \
  --password test_password \
  --authenticationDatabase admin \
  --gzip \
  --archive="/backups/mongodb/${BACKUP_FILE}"

# Verify data
mongo mongodb://test_admin:test_password@mongodb-test:27017/admin \
  --eval "db.getSiblingDB('caas_auth').users.count()"

# Compare with production
PROD_COUNT=$(mongo mongodb://caas_admin:caas_secret_2026@mongodb-primary:27017/admin \
  --quiet --eval "db.getSiblingDB('caas_auth').users.count()")

if [ "$TEST_COUNT" -eq "$PROD_COUNT" ]; then
  echo "✅ Backup integrity verified"
else
  echo "❌ Backup integrity check failed"
fi
```

---

## Backup Monitoring

### Monitoring Metrics

**Backup Success Rate:**
- Track successful vs failed backups
- Alert on consecutive failures
- Monitor backup duration

**Backup Size:**
- Track backup file sizes
- Alert on unexpected size changes
- Monitor storage usage

**Recovery Time:**
- Measure restore duration
- Track RTO compliance
- Optimize slow restores

### Alerting

**Critical Alerts:**
- Backup failure
- Storage space low (<20%)
- Backup integrity check failed
- DR test failed

**Warning Alerts:**
- Backup duration increased
- Storage space medium (<50%)
- Backup size anomaly

### Monitoring Script

```bash
#!/bin/bash
# Backup monitoring

BACKUP_DIR="/backups/mongodb"
ALERT_EMAIL="ops@caas.com"

# Check latest backup
LATEST_BACKUP=$(ls -t ${BACKUP_DIR}/caas_backup_*.gz | head -1)
BACKUP_AGE=$(($(date +%s) - $(stat -c %Y "$LATEST_BACKUP")))

# Alert if backup is older than 25 hours
if [ $BACKUP_AGE -gt 90000 ]; then
  echo "ALERT: Latest backup is ${BACKUP_AGE} seconds old" | \
    mail -s "CAAS Backup Alert" $ALERT_EMAIL
fi

# Check storage space
STORAGE_USAGE=$(df -h ${BACKUP_DIR} | awk 'NR==2 {print $5}' | sed 's/%//')

if [ $STORAGE_USAGE -gt 80 ]; then
  echo "ALERT: Backup storage at ${STORAGE_USAGE}%" | \
    mail -s "CAAS Storage Alert" $ALERT_EMAIL
fi
```

---

## Best Practices

### 1. Automate Everything
- Automated backup scripts
- Automated testing
- Automated monitoring
- Automated alerts

### 2. Test Regularly
- Monthly restore tests
- Quarterly DR drills
- Annual full simulation
- Document all tests

### 3. Multiple Backup Locations
- On-site backups
- Off-site backups
- Cloud backups
- Geographic distribution

### 4. Encryption
- Encrypt backups at rest
- Encrypt backups in transit
- Secure backup credentials
- Rotate encryption keys

### 5. Documentation
- Keep runbooks updated
- Document all procedures
- Train team members
- Review after incidents

### 6. Monitoring
- Monitor backup success
- Track backup metrics
- Alert on failures
- Regular audits

---

## Backup Retention Policy

### Retention Schedule

**MongoDB:**
- Daily backups: 30 days
- Weekly backups: 12 weeks
- Monthly backups: 12 months
- Yearly backups: 7 years (compliance)

**Redis:**
- RDB snapshots: 7 days
- AOF files: Current + 1 previous

**Kafka:**
- Topic configs: 90 days
- Consumer offsets: 30 days

**Application Config:**
- All versions: 1 year
- Tagged releases: Indefinite

### Compliance Requirements

**GDPR:**
- Right to erasure: Backup purging procedures
- Data portability: Backup export formats
- Data retention: Automated cleanup

**SOC 2:**
- Backup encryption
- Access controls
- Audit logging
- Regular testing

---

## Conclusion

The CAAS platform implements a comprehensive backup and recovery strategy with:

- ✅ Automated daily backups
- ✅ Multiple backup types (full, incremental, continuous)
- ✅ Off-site backup storage
- ✅ Point-in-time recovery capability
- ✅ Disaster recovery procedures
- ✅ Regular testing and validation
- ✅ Monitoring and alerting
- ✅ Compliance with regulations

This strategy ensures data protection and business continuity in case of disasters or data loss.

---

**Document Version**: 1.0  
**Last Updated**: February 21, 2026  
**Review Schedule**: Quarterly  
**Maintained By**: Platform Team
