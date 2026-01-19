# MongoDB Service - Development Setup

> **Parent Roadmap**: [MongoDB Service](../../roadmaps/4_mongodbService.md)

---

## Overview

Local MongoDB development environment setup with Docker Compose replica set.

---

## 1. Docker Compose Configuration

```yaml
# docker-compose.mongodb.yml
version: '3.8'

services:
  mongo-primary:
    image: mongo:7.0
    container_name: caas-mongo-primary
    command: mongod --replSet rs0 --bind_ip_all --keyFile /etc/mongo/keyfile
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
    volumes:
      - mongo-primary-data:/data/db
      - ./mongo-keyfile:/etc/mongo/keyfile:ro
    networks:
      - caas-network

  mongo-secondary-1:
    image: mongo:7.0
    container_name: caas-mongo-secondary-1
    command: mongod --replSet rs0 --bind_ip_all --keyFile /etc/mongo/keyfile
    ports:
      - "27018:27017"
    volumes:
      - mongo-secondary-1-data:/data/db
      - ./mongo-keyfile:/etc/mongo/keyfile:ro
    networks:
      - caas-network

  mongo-secondary-2:
    image: mongo:7.0
    container_name: caas-mongo-secondary-2
    command: mongod --replSet rs0 --bind_ip_all --keyFile /etc/mongo/keyfile
    ports:
      - "27019:27017"
    volumes:
      - mongo-secondary-2-data:/data/db
      - ./mongo-keyfile:/etc/mongo/keyfile:ro
    networks:
      - caas-network

volumes:
  mongo-primary-data:
  mongo-secondary-1-data:
  mongo-secondary-2-data:

networks:
  caas-network:
    driver: bridge
```

---

## 2. Replica Set Initialization

```bash
#!/bin/bash
# init-replica.sh

# Generate keyfile
openssl rand -base64 756 > mongo-keyfile
chmod 400 mongo-keyfile

# Start containers
docker-compose -f docker-compose.mongodb.yml up -d

# Wait for MongoDB to start
sleep 10

# Initialize replica set
docker exec -it caas-mongo-primary mongosh --eval '
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongo-primary:27017", priority: 2 },
    { _id: 1, host: "mongo-secondary-1:27017", priority: 1 },
    { _id: 2, host: "mongo-secondary-2:27017", priority: 1 }
  ]
})'
```

---

## 3. Connection String

```typescript
// Development connection string
const MONGO_URI = 'mongodb://admin:password@localhost:27017,localhost:27018,localhost:27019/caas?replicaSet=rs0&authSource=admin';

// Mongoose connection
import mongoose from 'mongoose';

await mongoose.connect(MONGO_URI, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});
```

---

## 4. Seed Data Script

```typescript
// scripts/seed.ts
async function seedDatabase() {
  // Create indexes
  await db.users.createIndex({ tenant_id: 1, external_id: 1 }, { unique: true });
  await db.conversations.createIndex({ tenant_id: 1, 'participants.user_id': 1 });
  await db.messages.createIndex({ tenant_id: 1, conversation_id: 1, created_at: -1 });
  
  // Seed test tenant
  const tenant = await db.tenants.create({
    name: 'Test Tenant',
    plan: 'pro',
    status: 'active'
  });
  
  // Seed test users
  const users = await db.users.insertMany([
    { tenant_id: tenant.id, external_id: 'user-1', display_name: 'Alice' },
    { tenant_id: tenant.id, external_id: 'user-2', display_name: 'Bob' }
  ]);
  
  // Seed test conversation
  await db.conversations.create({
    tenant_id: tenant.id,
    type: 'direct',
    participants: users.map(u => ({ user_id: u._id, role: 'member' }))
  });
  
  console.log('Seed complete!');
}
```

---

## 5. GUI Tools

### MongoDB Compass
```
Connection: mongodb://admin:password@localhost:27017/?directConnection=true
```

### Mongo Express (Web UI)
```yaml
# Add to docker-compose
mongo-express:
  image: mongo-express
  ports:
    - "8081:8081"
  environment:
    ME_CONFIG_MONGODB_URL: mongodb://admin:password@mongo-primary:27017/
```

---

## Related Documents
- [Caching Strategy](./caching-strategy.md)
- [Query Optimization](./query-optimization.md)
