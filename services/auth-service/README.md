# Auth Service

Comprehensive authentication service for the CAAS platform implementing Phase 2 Security - Authentication tasks.

## Features

### JWT Token Management (AUTH-001, AUTH-002)
- **Token Generation**: RS256/ES256 algorithms with configurable claims
- **Token Validation**: Comprehensive validation with signature verification
- **Key Rotation**: Support for multiple active signing keys
- **Revocation Checking**: Individual, user-wide, and session-wide revocation

### Token Refresh (AUTH-003)
- **Rotation**: Automatic token rotation on each use
- **Reuse Detection**: Detects and handles token reuse attacks
- **Family Tracking**: Tracks token lineage for security
- **Sliding Expiration**: Configurable session extension

### Token Revocation (AUTH-004)
- **Individual Revocation**: Revoke specific tokens by JTI
- **User-Wide Revocation**: Revoke all user tokens (e.g., password change)
- **Session Revocation**: Revoke all tokens for a session
- **Event Publishing**: Kafka events for distributed cache invalidation

### Session Management (AUTH-005 to AUTH-008)
- **Session Store**: Redis-based storage with automatic cleanup
- **Session Lifecycle**: Create, validate, renew, terminate
- **Device Tracking**: Track device info, IP, location
- **Session Security**: Binding, concurrent session policies, anomaly detection

### Multi-Factor Authentication (AUTH-009 to AUTH-012)
- **TOTP**: Time-based one-time passwords (Google Authenticator compatible)
- **Backup Codes**: Single-use recovery codes
- **Trusted Devices**: Skip MFA on recognized devices
- **Challenge Flow**: Complete MFA verification flow

## Architecture

```
auth-service/
├── src/
│   ├── tokens/           # JWT generation and validation
│   ├── refresh/          # Token refresh with rotation
│   ├── revocation/       # Token revocation system
│   ├── sessions/         # Session management
│   │   └── security/     # Session security features
│   └── mfa/              # Multi-factor authentication
│       ├── totp/         # TOTP implementation
│       ├── backup-codes/ # Backup codes
│       ├── trusted-devices/ # Trusted device management
│       └── challenge/    # MFA challenge flow
├── keys/                 # Signing keys (generated)
├── Dockerfile
├── package.json
└── tsconfig.json
```

## Dependencies

- **Redis**: Session storage, revocation lists, MFA challenges
- **Kafka**: Event publishing for distributed systems
- **MongoDB**: User data, MFA configuration (via gateway)

## Environment Variables

See `.env.example` for all configuration options.

### Key Configuration

```bash
# JWT
JWT_ALGORITHM=RS256
JWT_ACCESS_TOKEN_EXPIRY=900  # 15 minutes
JWT_REFRESH_TOKEN_EXPIRY=604800  # 7 days

# Session
SESSION_TTL_SECONDS=86400  # 24 hours
MAX_SESSIONS_PER_USER=10

# MFA
TOTP_ISSUER=CAAS
BACKUP_CODE_COUNT=10
TRUST_TOKEN_EXPIRY_DAYS=30
```

## Usage

### Generate Signing Keys

```bash
# Generate RSA key pair
openssl genrsa -out keys/private.pem 2048
openssl rsa -in keys/private.pem -pubout -out keys/public.pem
```

### Docker Build

```bash
docker build -t caas-auth-service .
```

### Docker Run

```bash
docker run -d \
  --name auth-service \
  --network caas-network \
  -e REDIS_HOST=redis \
  -e KAFKA_BROKERS=kafka-1:9092 \
  -v $(pwd)/keys:/app/keys \
  caas-auth-service
```

## Security Features

### Token Security
- Cryptographic signing (RS256/ES256)
- Token size limits (8KB default)
- Algorithm validation (rejects 'none')
- Clock tolerance for time sync

### Session Security
- Device fingerprinting
- IP address validation
- Geographic anomaly detection
- Session hijacking detection
- Concurrent session policies

### MFA Security
- Encrypted TOTP secrets
- Hashed backup codes
- Device trust with expiry
- Rate limiting on verification
- Automatic lockout on failures

## API Integration

This service is designed to be called by the gateway service. It does not expose HTTP endpoints directly.

### Example Usage

```typescript
import { JWTGenerator, JWTValidator, SessionService, MFAChallengeService } from 'auth-service';

// Generate tokens
const tokenPair = await jwtGenerator.generateAccessToken({
  user,
  tenant,
  scopes: ['read', 'write'],
  sessionId: session.id,
});

// Validate token
const payload = await jwtValidator.validate(token, {
  checkRevocation: true,
  requireAccessTokenClaims: true,
});

// Create session
const session = await sessionService.createSession({
  user_id: user.id,
  tenant_id: tenant.id,
  device_id: deviceId,
  device_info: deviceInfo,
  ip_address: req.ip,
});

// MFA challenge
const challenge = await mfaChallengeService.createChallenge(
  user.id,
  session.id,
  ['totp', 'backup_code']
);
```

## Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## Production Considerations

1. **Key Management**: Use secure key storage (AWS KMS, HashiCorp Vault)
2. **Redis**: Use Redis Cluster for high availability
3. **Monitoring**: Track token generation/validation rates, session counts
4. **Alerts**: Set up alerts for security events (reuse detection, hijacking)
5. **Backup**: Regular backups of Redis data
6. **Rotation**: Implement automatic key rotation schedule

## Task Completion

✅ AUTH-001: JWT Token Generation Service
✅ AUTH-002: JWT Token Validation Service
✅ AUTH-003: Token Refresh Flow
✅ AUTH-004: Token Revocation System
✅ AUTH-005: Session Store Implementation
✅ AUTH-006: Session Lifecycle Management
✅ AUTH-007: Active Sessions API
✅ AUTH-008: Session Security Features
✅ AUTH-009: TOTP Implementation
✅ AUTH-010: Backup Codes Implementation
✅ AUTH-011: Trusted Devices
✅ AUTH-012: MFA Challenge Flow

All authentication tasks from Phase 2 Security have been completed.
