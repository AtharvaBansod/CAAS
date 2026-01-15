# CAAS Priority Development Roadmap

> **Master Development Guide** - All phases and steps from roadmaps in priority order

---

## 🚀 Development Phase Order

| Phase | Focus Area | Duration |
|-------|------------|----------|
| **Phase 1** | Core Infrastructure | Weeks 1-4 |
| **Phase 2** | Security & Auth | Weeks 5-8 |
| **Phase 3** | Real-Time Communication | Weeks 9-12 |
| **Phase 4** | Developer Experience | Weeks 13-18 |
| **Phase 5** | Observability & Billing | Weeks 19-24 |
| **Phase 6** | Advanced Features | Weeks 25+ |

---

# PHASE 1: CORE INFRASTRUCTURE

## 1.1 MongoDB Service Foundation
> **Source**: [4_mongodbService.md](../roadmaps/4_mongodbService.md) - Phase 1

### 1.1.1 MongoDB Setup
- [ ] MongoDB 7.0+ deployment (Docker)
- [ ] Replica set configuration (3 nodes minimum)
- [ ] Authentication setup (SCRAM-SHA-256)
- [ ] Network encryption (TLS)
- [ ] Connection pooling configuration

### 1.1.2 Multi-Tenancy Strategy
- [ ] Database-per-tenant vs Collection-per-tenant analysis
- [ ] Tenant identifier schema
- [ ] Connection management per tenant
- [ ] Resource quotas per tenant
- [ ] Tenant isolation verification

📁 **R&D**: [MongoDB Multi-Tenancy Patterns](../rnd/mongodb-multi-tenancy.md)

### 1.1.3 Development Environment
- [ ] Local MongoDB setup (Docker Compose)
- [ ] Seed data scripts
- [ ] Migration framework setup
- [ ] Database versioning strategy
- [ ] Test database provisioning

---

## 1.2 API Gateway Foundation
> **Source**: [2_publicalllyExposedGateway.md](../roadmaps/2_publicalllyExposedGateway.md) - Phase 1

### 1.2.1 Technology Selection & Setup
- [ ] Choose gateway framework (Kong/Express Gateway/Custom Node.js)
- [ ] Docker containerization
- [ ] Environment configuration management
- [ ] Service discovery integration
- [ ] Health check endpoints

### 1.2.2 Core Infrastructure
- [ ] Express.js/Fastify base setup
- [ ] Request/Response logging middleware
- [ ] Error handling middleware
- [ ] Request ID generation and tracking
- [ ] Graceful shutdown handling

### 1.2.3 Configuration Management
- [ ] Environment-based configuration
- [ ] Dynamic configuration updates
- [ ] Feature flags integration
- [ ] Secret management (HashiCorp Vault integration)

---

## 1.3 Kafka Infrastructure
> **Source**: [8_kafkaService.md](../roadmaps/8_kafkaService.md) - Phase 1

### 1.3.1 Cluster Setup
- [ ] Kafka 3.x deployment (Docker/Kubernetes)
- [ ] Minimum 3 broker setup for HA
- [ ] ZooKeeper/KRaft configuration
- [ ] Network configuration
- [ ] Storage configuration (SSD recommended)

### 1.3.2 Security Configuration
- [ ] SASL/SCRAM authentication
- [ ] SSL/TLS encryption
- [ ] ACL configuration
- [ ] Service account management
- [ ] Credential rotation strategy

### 1.3.3 Monitoring Setup
- [ ] JMX metrics export
- [ ] Prometheus integration
- [ ] Grafana dashboards
- [ ] Alert configuration
- [ ] Lag monitoring

---

# PHASE 2: SECURITY & AUTHENTICATION

## 2.1 Authentication Infrastructure
> **Source**: [3_AuthAutorizeSecurity.md](../roadmaps/3_AuthAutorizeSecurity.md) - Phase 1

### 2.1.1 SAAS Client Authentication
- [ ] Client registration and verification
- [ ] API key generation (primary + secondary)
- [ ] API key hashing and storage
- [ ] API key rotation mechanism
- [ ] Client secret management
- [ ] OAuth 2.0 client credentials flow

📁 **R&D**: [API Key Security](../rnd/api-key-security.md)

### 2.1.2 End User Authentication Flow
- [ ] JWT token generation
- [ ] Token payload structure design
- [ ] Token signing (RS256 with key rotation)
- [ ] Refresh token implementation
- [ ] Token revocation mechanism
- [ ] Token blacklisting (Redis-based)

### 2.1.3 Session Management
- [ ] Session creation and validation
- [ ] Multi-device session support
- [ ] Session timeout configuration
- [ ] Concurrent session limits
- [ ] Force logout capability
- [ ] Session activity tracking

📊 **Flow**: [Authentication Flow](../flowdiagram/authentication-flow.md)

---

## 2.2 Gateway Security Layer
> **Source**: [2_publicalllyExposedGateway.md](../roadmaps/2_publicalllyExposedGateway.md) - Phase 3

### 2.2.1 Authentication Verification
- [ ] JWT token validation
- [ ] API key verification
- [ ] Token refresh handling
- [ ] Multi-tenant isolation verification
- [ ] Session validation

### 2.2.2 Authorization Checks
- [ ] Scope-based access control
- [ ] Resource-level permissions
- [ ] Rate limit by authorization level
- [ ] IP whitelist verification
- [ ] Client application validation

📁 **Deep Dive**: [Gateway Security](../deepDive/publicGateway/security-implementation.md)

### 2.2.3 Attack Prevention
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] CSRF token validation
- [ ] Request signature verification
- [ ] Bot detection and blocking

### 2.2.4 TLS/SSL Management
- [ ] Certificate management
- [ ] TLS 1.3 enforcement
- [ ] Certificate rotation automation
- [ ] HSTS configuration

---

## 2.3 Authorization System
> **Source**: [3_AuthAutorizeSecurity.md](../roadmaps/3_AuthAutorizeSecurity.md) - Phase 2

### 2.3.1 Role-Based Access Control (RBAC)
- [ ] Define role hierarchy (Platform Admin, SAAS Client Admin, Developer, End User)
- [ ] Role assignment APIs
- [ ] Role inheritance
- [ ] Dynamic role creation (per tenant)

### 2.3.2 Attribute-Based Access Control (ABAC)
- [ ] Policy definition schema
- [ ] Attribute evaluation engine
- [ ] Context-aware authorization
- [ ] Time-based access rules
- [ ] Location-based restrictions

### 2.3.3 Multi-Tenancy Isolation
- [ ] Tenant context extraction
- [ ] Cross-tenant access prevention
- [ ] Data isolation verification
- [ ] Tenant-specific encryption keys
- [ ] Audit trail per tenant

---

## 2.4 End-to-End Encryption
> **Source**: [3_AuthAutorizeSecurity.md](../roadmaps/3_AuthAutorizeSecurity.md) - Phase 3

### 2.4.1 Key Management Service (KMS)
- [ ] Master key generation and storage
- [ ] Key hierarchy design
- [ ] Key rotation schedule
- [ ] Key escrow for enterprise
- [ ] Key backup and recovery

📁 **R&D**: [Signal Protocol Implementation](../rnd/signal-protocol-implementation.md)

### 2.4.2 Asymmetric Encryption Setup
- [ ] RSA/ECC key pair generation
- [ ] Public key distribution
- [ ] Private key client-side storage
- [ ] Key exchange protocol (X3DH/Double Ratchet)
- [ ] Forward secrecy implementation

📁 **Deep Dive**: [E2E Key Management](../deepDive/authSecurity/e2e-key-management.md)

### 2.4.3 Message Encryption
- [ ] Pre-key bundles for offline messaging
- [ ] Session key establishment
- [ ] Message encryption (AES-256-GCM)
- [ ] Encrypted file transfer
- [ ] Group encryption (Sender Keys)

📊 **Flow**: [E2E Encryption Flow](../flowdiagram/e2e-encryption-flow.md)

---

# PHASE 3: REAL-TIME COMMUNICATION

## 3.1 Socket Infrastructure
> **Source**: [5_sockets.md](../roadmaps/5_sockets.md) - Phase 1

### 3.1.1 WebSocket Server Setup
- [ ] Socket.IO server with Redis adapter
- [ ] Sticky sessions configuration
- [ ] Connection upgrade handling (HTTP → WS)
- [ ] Binary message support
- [ ] Compression (permessage-deflate)
- [ ] Heartbeat configuration

📁 **R&D**: [WebSocket vs Socket.IO](../rnd/websocket-vs-socketio.md)

### 3.1.2 Protocol Design
- [ ] Message envelope schema
- [ ] Event type definitions
- [ ] Acknowledgment system
- [ ] Error response format
- [ ] Protocol versioning

### 3.1.3 Transport Layer
- [ ] WebSocket primary transport
- [ ] HTTP long-polling fallback
- [ ] Automatic reconnection
- [ ] Connection state machine
- [ ] Transport upgrade logic

---

## 3.2 Connection Management
> **Source**: [5_sockets.md](../roadmaps/5_sockets.md) - Phase 2

### 3.2.1 Connection Lifecycle
- [ ] Connection handshake
- [ ] JWT validation on connect
- [ ] Tenant context binding
- [ ] Connection metadata storage
- [ ] Graceful disconnection handling

### 3.2.2 Authentication & Authorization
- [ ] Token validation middleware
- [ ] Token refresh over socket
- [ ] Permission checking per event
- [ ] Rate limiting per connection
- [ ] Suspicious activity detection

### 3.2.3 Multi-Device Support
- [ ] Device identification
- [ ] Session sync across devices
- [ ] Device-specific notifications
- [ ] Device limit enforcement
- [ ] Active device tracking

---

## 3.3 Room & Channel System
> **Source**: [5_sockets.md](../roadmaps/5_sockets.md) - Phase 3

### 3.3.1 Room Operations
- [ ] Dynamic room creation
- [ ] Join room with validation
- [ ] Leave room cleanup
- [ ] Room membership tracking
- [ ] Room permission checks
- [ ] Broadcast to room

### 3.3.2 Presence System
- [ ] Online/Offline status
- [ ] Away/DND status
- [ ] Custom status messages
- [ ] Presence broadcasting
- [ ] Presence sync across servers

### 3.3.3 Typing Indicators
- [ ] Typing start event
- [ ] Typing stop event (timeout)
- [ ] Multiple typers handling
- [ ] Throttling to reduce traffic

---

## 3.4 Message Routing
> **Source**: [5_sockets.md](../roadmaps/5_sockets.md) - Phase 4

### 3.4.1 Message Flow
- [ ] Message routing logic
- [ ] Target resolution (user → sockets)
- [ ] Multi-server message distribution
- [ ] Message deduplication
- [ ] Order preservation (per conversation)

📁 **Deep Dive**: [Message Routing](../deepDive/sockets/message-routing.md)

### 3.4.2 Delivery Guarantees
- [ ] At-least-once delivery
- [ ] Message acknowledgments
- [ ] Retry with exponential backoff
- [ ] Offline message queuing
- [ ] Message expiration

📊 **Flow**: [Socket Cluster Architecture](../flowdiagram/socket-cluster-architecture.md)

---

## 3.5 MongoDB Schema Design
> **Source**: [4_mongodbService.md](../roadmaps/4_mongodbService.md) - Phase 2

### 3.5.1 User Schema
- [ ] Implement user schema
- [ ] Indexes: tenant_id, external_id, last_seen
- [ ] TTL index for inactive users (optional)

### 3.5.2 Conversation Schema
- [ ] Implement conversation schema
- [ ] Indexes: tenant_id, participants.user_id, updated_at
- [ ] Compound indexes for common queries

### 3.5.3 Message Schema
- [ ] Implement message schema
- [ ] Indexes: tenant_id, conversation_id, created_at
- [ ] Time-series optimization for message retrieval

### 3.5.4 File Metadata Schema
- [ ] Implement file schema
- [ ] Indexes: tenant_id, uploader_id, sharing.type

---

## 3.6 Kafka Topic Architecture
> **Source**: [8_kafkaService.md](../roadmaps/8_kafkaService.md) - Phase 2

### 3.6.1 Topic Design Strategy
- [ ] Topic naming convention
- [ ] Partitioning strategy
- [ ] Replication factor policies
- [ ] Retention policies
- [ ] Compaction vs deletion

### 3.6.2 Message Schema Design
- [ ] Base envelope schema
- [ ] Event type schemas
- [ ] Schema versioning strategy
- [ ] Schema registry integration
- [ ] Backward compatibility rules

---

# PHASE 4: DEVELOPER EXPERIENCE

## 4.1 API SDK Foundation
> **Source**: [7_apiSdk.md](../roadmaps/7_apiSdk.md) - Phase 1-2

### 4.1.1 Package Setup
- [ ] Monorepo with pnpm workspaces
- [ ] TypeScript strict configuration
- [ ] ESM/CJS dual build
- [ ] Tree-shakable exports
- [ ] Bundle size optimization

### 4.1.2 HTTP Client
- [ ] Fetch/Axios wrapper
- [ ] Request interceptors
- [ ] Response transformers
- [ ] Automatic retry logic
- [ ] Request cancellation
- [ ] Rate limit handling

### 4.1.3 Authentication API
- [ ] Server-side session creation
- [ ] Client-side token initialization
- [ ] Token refresh handling
- [ ] Session management
- [ ] Logout/session invalidation

---

## 4.2 SDK Messaging & Real-time API
> **Source**: [7_apiSdk.md](../roadmaps/7_apiSdk.md) - Phase 3-4

### 4.2.1 Conversations API
- [ ] List conversations (paginated)
- [ ] Create conversation (DM, group)
- [ ] Get conversation details
- [ ] Update conversation settings
- [ ] Delete/archive conversation
- [ ] Manage participants

### 4.2.2 Messages API
- [ ] Send messages (text, file, etc.)
- [ ] List messages (paginated)
- [ ] Edit message
- [ ] Delete message
- [ ] Reactions
- [ ] Threads/replies
- [ ] Mark as read

### 4.2.3 Real-time API
- [ ] Automatic connection
- [ ] Reconnection handling
- [ ] Connection state events
- [ ] Event subscriptions
- [ ] Presence API
- [ ] Typing indicators

---

## 4.3 UI Components Package
> **Source**: [6_uiComponents.md](../roadmaps/6_uiComponents.md) - Phase 1-2

### 4.3.1 Package Foundation
- [ ] pnpm workspace configuration
- [ ] Rollup/Vite build configuration
- [ ] ESM and CJS output
- [ ] Tree-shaking optimization
- [ ] Storybook setup for documentation

### 4.3.2 Provider Components
- [ ] CaasProvider (context setup)
- [ ] ThemeProvider
- [ ] LocalizationProvider
- [ ] ConnectionProvider
- [ ] AuthProvider

### 4.3.3 Base UI Components
- [ ] Avatar (with presence indicator)
- [ ] Badge (notification counts)
- [ ] Button (various styles)
- [ ] Input (text, multiline)
- [ ] Modal/Dialog
- [ ] Loading states

---

## 4.4 Chat UI Components
> **Source**: [6_uiComponents.md](../roadmaps/6_uiComponents.md) - Phase 3

### 4.4.1 Chat List Component
- [ ] Conversation list with virtualization
- [ ] Search and filter functionality
- [ ] Unread indicators
- [ ] Last message preview
- [ ] Pinned conversations
- [ ] Create new chat/group button

### 4.4.2 Chat Window Component
- [ ] Message list with infinite scroll
- [ ] Message input with formatting
- [ ] Typing indicators
- [ ] Read receipts
- [ ] Message reactions
- [ ] Thread/reply view

### 4.4.3 Message Components
- [ ] TextMessage
- [ ] ImageMessage (with lightbox)
- [ ] VideoMessage (with player)
- [ ] FileMessage (with download)
- [ ] LinkPreview
- [ ] SystemMessage

---

## 4.5 Client Facing UI Portal
> **Source**: [1_clientFacingUI.md](../roadmaps/1_clientFacingUI.md) - Phase 1-3

### 4.5.1 Project Setup
- [ ] Initialize Next.js 14+ project with App Router
- [ ] Configure TypeScript with strict mode
- [ ] Setup ESLint + Prettier configuration
- [ ] Configure Tailwind CSS with custom design system
- [ ] Dark/Light mode support

📁 **Deep Dive**: [Design System](../deepDive/clientFacingUI/design-system.md)

### 4.5.2 Authentication & Onboarding
- [ ] Registration form with company details
- [ ] Email verification flow
- [ ] Email/password authentication
- [ ] OAuth integration (Google, GitHub, Microsoft)
- [ ] Two-factor authentication (TOTP)
- [ ] Onboarding wizard (6 steps)

📁 **Deep Dive**: [Authentication Flow](../deepDive/clientFacingUI/authentication-flow.md)

### 4.5.3 Dashboard & Configuration
- [ ] Overview cards (active users, messages, connections)
- [ ] Real-time activity feed
- [ ] Application list view
- [ ] Create new application wizard
- [ ] API Key Management
- [ ] Environment Management

---

# PHASE 5: OBSERVABILITY & BILLING

## 5.1 Logging Infrastructure
> **Source**: [9_monitorLogAnalyticsCrawler.md](../roadmaps/9_monitorLogAnalyticsCrawler.md) - Phase 1

### 5.1.1 Logging Framework
- [ ] Winston/Pino logger setup
- [ ] Structured JSON logging
- [ ] Log levels configuration
- [ ] Correlation ID propagation
- [ ] PII redaction middleware

### 5.1.2 Log Aggregation
- [ ] Loki/Elasticsearch deployment
- [ ] Log shipping (Promtail/Filebeat)
- [ ] Log parsing and transformation
- [ ] Multi-tenant log isolation
- [ ] Log retention policies

---

## 5.2 Metrics & Monitoring
> **Source**: [9_monitorLogAnalyticsCrawler.md](../roadmaps/9_monitorLogAnalyticsCrawler.md) - Phase 2

### 5.2.1 Metrics Collection
- [ ] Prometheus client setup
- [ ] Counter, Gauge, Histogram metrics
- [ ] Custom business metrics
- [ ] Service metrics exporters

### 5.2.2 Distributed Tracing
- [ ] OpenTelemetry SDK integration
- [ ] Trace context propagation
- [ ] Jaeger/Tempo deployment
- [ ] Span creation for key operations

---

## 5.3 Alerting System
> **Source**: [9_monitorLogAnalyticsCrawler.md](../roadmaps/9_monitorLogAnalyticsCrawler.md) - Phase 4

### 5.3.1 Alert Configuration
- [ ] Alertmanager deployment
- [ ] Alert rule definitions
- [ ] Severity levels
- [ ] Alert grouping

### 5.3.2 Alert Channels
- [ ] Email notifications
- [ ] Slack integration
- [ ] PagerDuty integration
- [ ] On-call management

---

## 5.4 Billing Foundation
> **Source**: [10_billingPricing.md](../roadmaps/10_billingPricing.md) - Phase 1-2

### 5.4.1 Billing Database Schema
- [ ] Subscription schema design
- [ ] Plan/pricing schema
- [ ] Usage records schema
- [ ] Invoice schema

### 5.4.2 Core Billing Service
- [ ] Subscription CRUD operations
- [ ] Plan management APIs
- [ ] Billing cycle management
- [ ] Proration calculations

### 5.4.3 Pricing Models
- [ ] Plan tier definitions
- [ ] Feature matrix
- [ ] Usage limits per plan
- [ ] Overage pricing
- [ ] Discounts & Promotions

---

## 5.5 Usage Metering & Payments
> **Source**: [10_billingPricing.md](../roadmaps/10_billingPricing.md) - Phase 3-4

### 5.5.1 Usage Event Collection
- [ ] Usage event ingestion
- [ ] Event deduplication
- [ ] Real-time aggregation
- [ ] Message/API call metering
- [ ] Storage calculation

### 5.5.2 Stripe Integration
- [ ] Stripe account setup
- [ ] Customer management
- [ ] Payment method handling
- [ ] Subscription synchronization
- [ ] Webhook handling

### 5.5.3 Invoice Generation
- [ ] Invoice creation workflow
- [ ] Line item calculations
- [ ] Tax calculations
- [ ] PDF generation
- [ ] Email delivery

---

# PHASE 6: ADVANCED FEATURES

## 6.1 Media Streaming
> **Source**: [5_sockets.md](../roadmaps/5_sockets.md) - Phase 5

### 6.1.1 WebRTC Signaling
- [ ] SDP exchange handling
- [ ] ICE candidate relay
- [ ] STUN/TURN server integration

### 6.1.2 Voice & Video Calls
- [ ] Call initiation signaling
- [ ] Call state management
- [ ] Video stream signaling
- [ ] Multi-party call coordination
- [ ] Screen sharing signaling

### 6.1.3 Live Collaboration
- [ ] Whiteboard events
- [ ] Document collaboration signals
- [ ] Cursor position sync

---

## 6.2 Gateway Traffic Management
> **Source**: [2_publicalllyExposedGateway.md](../roadmaps/2_publicalllyExposedGateway.md) - Phase 4

### 6.2.1 Rate Limiting
- [ ] Per-client rate limits
- [ ] Per-endpoint rate limits
- [ ] Sliding window algorithm
- [ ] Distributed rate limiting (Redis)

📁 **Deep Dive**: [Rate Limiting](../deepDive/publicGateway/rate-limiting.md)

### 6.2.2 Circuit Breaker
- [ ] Circuit breaker implementation
- [ ] Failure threshold configuration
- [ ] Recovery mechanisms
- [ ] Fallback responses

---

## 6.3 Media Components
> **Source**: [6_uiComponents.md](../roadmaps/6_uiComponents.md) - Phase 4-5

### 6.3.1 Voice/Video Call UI
- [ ] Incoming call modal
- [ ] Active call interface
- [ ] Call controls (mute, speaker, hold)
- [ ] Video grid layout

### 6.3.2 Display Windows
- [ ] Infinity scroll container
- [ ] PostCard, ReelCard
- [ ] FileListItem, ImageGallery
- [ ] Notification Center

---

## 6.4 SDK Advanced Features
> **Source**: [7_apiSdk.md](../roadmaps/7_apiSdk.md) - Phase 5-6

### 6.4.1 Media API
- [ ] File upload (with progress)
- [ ] Voice/Video calls API
- [ ] Screen sharing
- [ ] Content feeds

### 6.4.2 Offline Support
- [ ] Offline message queue
- [ ] Local data persistence
- [ ] Sync on reconnection
- [ ] Conflict resolution

### 6.4.3 Framework Integrations
- [ ] React Provider & hooks
- [ ] Vue plugin & composables
- [ ] Angular module & services

---

## 6.5 High Availability & Scaling
> **Source**: Multiple roadmaps - Phase 6

### 6.5.1 Gateway HA
- [ ] Stateless gateway design
- [ ] Kubernetes deployment configuration
- [ ] Horizontal Pod Autoscaling
- [ ] Multi-Region Deployment

### 6.5.2 Socket Scaling
- [ ] Redis adapter for multi-server
- [ ] Consistent hashing for room affinity
- [ ] Connection migration on scale-down
- [ ] Auto-scaling rules

### 6.5.3 MongoDB Scaling
- [ ] Shard key selection
- [ ] Zone sharding for data locality
- [ ] Geographic distribution
- [ ] Backup & Recovery procedures

### 6.5.4 Kafka Scaling
- [ ] Broker scaling procedures
- [ ] Partition rebalancing
- [ ] MirrorMaker 2 setup
- [ ] Multi-region deployment

---

## 6.6 Security Policies & Compliance
> **Source**: [3_AuthAutorizeSecurity.md](../roadmaps/3_AuthAutorizeSecurity.md) - Phase 4-5

### 6.6.1 IP Security
- [ ] IP whitelist management
- [ ] Geo-blocking capabilities
- [ ] VPN/Proxy detection

📁 **R&D**: [IP Whitelisting Security](../rnd/ip-whitelisting-security.md)

### 6.6.2 Audit & Compliance
- [ ] Authentication event logging
- [ ] GDPR compliance tools
- [ ] Data export/deletion APIs
- [ ] Security reporting

### 6.6.3 Advanced Security
- [ ] Threat detection
- [ ] Zero Trust Architecture
- [ ] Security automation

---

## 6.7 Enterprise Features
> **Source**: [10_billingPricing.md](../roadmaps/10_billingPricing.md) - Phase 6

### 6.7.1 Enterprise Billing
- [ ] Custom contracts
- [ ] Negotiated pricing
- [ ] Multi-year agreements
- [ ] Multi-Entity Billing

### 6.7.2 Marketplace Integration
- [ ] AWS Marketplace listing
- [ ] Azure Marketplace listing
- [ ] GCP Marketplace listing

---

# 📚 Quick Reference

## Deep Dive Documents
| Area | Document |
|------|----------|
| Client UI | [Design System](../deepDive/clientFacingUI/design-system.md), [Auth Flow](../deepDive/clientFacingUI/authentication-flow.md) |
| Gateway | [Security](../deepDive/publicGateway/security-implementation.md), [Rate Limiting](../deepDive/publicGateway/rate-limiting.md) |
| Auth | [E2E Key Management](../deepDive/authSecurity/e2e-key-management.md) |
| MongoDB | [Caching Strategy](../deepDive/mongodbService/caching-strategy.md) |
| Sockets | [Message Routing](../deepDive/sockets/message-routing.md) |

## R&D Documents
| Topic | Document |
|-------|----------|
| Signal Protocol | [Implementation Guide](../rnd/signal-protocol-implementation.md) |
| API Keys | [Security Best Practices](../rnd/api-key-security.md) |
| WebSocket | [vs Socket.IO](../rnd/websocket-vs-socketio.md) |
| MongoDB | [Multi-Tenancy](../rnd/mongodb-multi-tenancy.md) |
| Keys | [Private-Public Transport](../rnd/private-public-key-transport.md) |
| IP Security | [Whitelisting](../rnd/ip-whitelisting-security.md) |

## Flow Diagrams
| Process | Diagram |
|---------|---------|
| E2E Encryption | [Flow](../flowdiagram/e2e-encryption-flow.md) |
| Authentication | [Flow](../flowdiagram/authentication-flow.md) |
| Socket Cluster | [Architecture](../flowdiagram/socket-cluster-architecture.md) |
| Request Pipeline | [Processing](../flowdiagram/request-processing-pipeline.md) |

---

*Last Updated: 2026-01-15*
