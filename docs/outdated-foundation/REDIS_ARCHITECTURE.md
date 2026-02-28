# Redis Architecture

**Phase**: 4.5.z - Task 03  
**Date**: February 22, 2026  
**Status**: Implemented

---

## Overview

The CAAS platform uses a multi-Redis architecture with 5 dedicated Redis instances, each optimized for specific purposes. This provides better isolation, performance, and scalability compared to a single Redis instance.

---

## Redis Instances

### 1. redis-gateway (172.28.2.1:6379)

**Purpose**: Gateway session cache and rate limiting

**Services**: 
- gateway
- auth-service (shared for session consistency)

**Data Types**:
- User sessions
- Rate limit counters
- API key cache
- Authentication tokens

**Configuration**:
- Memory Limit: 256MB
- Eviction Policy: `allkeys-lru` (Least Recently Used)
- Persistence: AOF (Append Only File)
- Port: 6379 (external), 6379 (internal)

**Rationale**: Gateway and auth-service must share the same Redis to ensure session consistency. When auth-service creates a session, gateway must be able to read it immediately.

---

### 2. redis-socket (172.28.2.2:6380)

**Purpose**: Socket connections, presence, typing indicators, room metadata

**Services**:
- socket-service-1
- socket-service-2

**Data Types**:
- Socket connection mappings (socket_id → user_id)
- User presence status (online, offline, away)
- Typing indicators (who is typing in which conversation)
- Room memberships
- Temporary message buffers

**Configuration**:
- Memory Limit: 512MB
- Eviction Policy: `volatile-lru` (evict keys with TTL set)
- Persistence: AOF
- Port: 6380 (external), 6379 (internal)

**Rationale**: Real-time data is volatile and high-volume. Larger memory allocation and volatile-lru policy allow automatic cleanup of expired data.

---

### 3. redis-shared (172.28.2.3:6381)

**Purpose**: Shared cache for conversation metadata, user profiles, unread counts

**Services**:
- gateway
- socket-service-1
- socket-service-2
- messaging-service
- media-service
- search-service

**Data Types**:
- Conversation metadata (participants, settings, last message)
- User profiles (name, avatar, status)
- Unread message counts
- Last seen timestamps
- Cached query results

**Configuration**:
- Memory Limit: 512MB
- Eviction Policy: `allkeys-lru`
- Persistence: AOF
- Port: 6381 (external), 6379 (internal)

**Rationale**: Multiple services need access to the same cached data. Shared Redis ensures consistency and reduces database load.

---

### 4. redis-compliance (172.28.2.4:6382)

**Purpose**: Compliance service cache for audit logs and GDPR requests

**Services**:
- compliance-service

**Data Types**:
- Audit log cache (recent logs for fast queries)
- GDPR request status
- Retention policy cache
- Consent records cache

**Configuration**:
- Memory Limit: 256MB
- Eviction Policy: `noeviction` (never evict, return error when full)
- Persistence: AOF
- Port: 6382 (external), 6379 (internal)

**Rationale**: Compliance data must never be lost. `noeviction` policy ensures data integrity. If Redis fills up, application will handle gracefully rather than silently losing data.

---

### 5. redis-crypto (172.28.2.5:6383)

**Purpose**: Crypto service cache for keys and encryption metadata

**Services**:
- crypto-service

**Data Types**:
- Key cache (encrypted keys for fast access)
- Encryption metadata
- Key rotation state
- Crypto operation counters

**Configuration**:
- Memory Limit: 256MB
- Eviction Policy: `noeviction`
- Persistence: AOF
- Port: 6383 (external), 6379 (internal)

**Rationale**: Cryptographic keys and metadata must never be lost. `noeviction` ensures data integrity for security-critical operations.

---

## Architecture Diagram

```
┌──────────