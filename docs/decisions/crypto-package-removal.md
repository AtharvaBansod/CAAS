# Decision: Remove Crypto-Client Package

**Date**: February 22, 2026  
**Status**: Implemented  
**Phase**: 4.5.z - Task 02

---

## Background

The `packages/crypto-client` package was initially created to provide a shared crypto client library for all CAAS services. The intention was to centralize cryptographic operations and ensure consistency across the platform.

### Initial Goals
- Centralize crypto operations
- Provide consistent API for all services
- Reduce code duplication
- Ensure security best practices

---

## Problem

After implementation and analysis, several issues became apparent:

### 1. No Code Reuse Benefit
- **Only crypto-service performs crypto operations**
- No other service needs direct crypto functionality
- Other services call crypto-service API endpoints
- Package provides no actual code reuse

### 2. Security Isolation Concerns
- Crypto operations should be isolated in crypto-service
- Distributing crypto logic across services increases attack surface
- Centralized crypto service provides better security boundaries
- Easier to audit and review when contained in one service

### 3. Service-Specific Operations
- Crypto operations are highly context-dependent
- Each operation requires specific parameters and validation
- No "one-size-fits-all" crypto client makes sense
- Crypto-service API is the appropriate abstraction layer

### 4. Unnecessary Complexity
- Package adds build complexity for single-service use
- Docker builds need to copy and compile package
- No benefit to justify the added complexity
- Inline implementation is simpler and clearer

---

## Decision

**Remove `packages/crypto-client` package completely.**

Crypto-service will continue to use standard crypto libraries directly:
- Node.js `crypto` module
- `libsodium` for advanced cryptography
- Other specialized libraries as needed

All crypto operations remain in crypto-service, accessed via REST API.

---

## Rationale

### Why Remove?

1. **Single Service Usage**: Only crypto-service needs crypto logic
2. **Security Isolation**: Crypto should be contained in one service
3. **Simpler Architecture**: Inline implementation is clearer
4. **No Code Reuse**: Package provides no actual benefit
5. **API Abstraction**: Crypto-service API is the right abstraction

### Comparison with Compliance Client

| Aspect | Compliance Client | Crypto Client |
|--------|------------------|---------------|
| **Usage** | ALL services (7 services) | ONE service (crypto-service only) |
| **Purpose** | Audit logging from everywhere | Crypto operations in one place |
| **Benefit** | Consistency across services | No benefit (single service) |
| **Decision** | KEEP as package | REMOVE package |

---

## Consequences

### Positive
- ✅ Simpler architecture
- ✅ Better security boundaries
- ✅ Easier to audit crypto code
- ✅ Faster Docker builds
- ✅ Clearer ownership (crypto-service owns all crypto)
- ✅ More flexible (can customize per need)

### Negative
- ❌ None identified (package was not being used)

### Neutral
- Services continue to call crypto-service API (no change)
- Crypto-service continues to use standard libraries (no change)

---

## Implementation

### Changes Made

1. **Deleted** `packages/crypto-client/` directory
2. **Updated** documentation to reflect removal
3. **Verified** no services were using the package
4. **Documented** reasoning in this decision record

### Services Affected

- **None** - Package was not being used by any service

---

## Alternatives Considered

### Alternative 1: Keep Package for Future Use
**Rejected**: No future use case identified. If needed later, crypto-service API is the right abstraction.

### Alternative 2: Shared Crypto Library
**Rejected**: Crypto operations should remain in crypto-service for security isolation.

### Alternative 3: Crypto Utilities Package
**Rejected**: Standard libraries (crypto, libsodium) provide all needed utilities.

---

## Lessons Learned

1. **Package Approach Works When**:
   - Multiple services need the same functionality
   - Consistency across services is important
   - Code reuse provides real benefit

2. **Package Approach Doesn't Work When**:
   - Only one service needs the functionality
   - Security isolation is critical
   - Service-specific operations dominate

3. **Right Abstraction Level**:
   - Compliance: Package (used by all services)
   - Crypto: API (used by all services, implemented by one)

---

## References

- Phase 4.5.z Task 02: Remove Crypto Package
- PACKAGES_ANALYSIS_AND_CODEBASE_STRUCTURE.md
- services/crypto-service/ (crypto implementation)

---

## Approval

**Decision Made By**: Architecture Team  
**Date**: February 22, 2026  
**Status**: Implemented
