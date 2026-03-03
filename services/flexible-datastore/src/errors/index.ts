/**
 * Flexible Datastore - Error Model
 *
 * Normalized error hierarchy across all providers.
 * Provider-specific errors are mapped to these stable categories.
 */

export type DatastoreErrorCode =
  | 'PROVIDER_UNAVAILABLE'
  | 'CONNECTION_FAILED'
  | 'AUTH_FAILED'
  | 'TIMEOUT'
  | 'THROTTLED'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'CAPACITY_EXCEEDED'
  | 'UNSUPPORTED_OPERATION'
  | 'CIRCUIT_OPEN'
  | 'RESIDENCY_VIOLATION'
  | 'LEGAL_HOLD_BLOCK'
  | 'CREDENTIAL_EXPIRED'
  | 'PREFLIGHT_FAILED'
  | 'MIGRATION_ERROR'
  | 'INTERNAL_ERROR';

export class DatastoreError extends Error {
  public readonly code: DatastoreErrorCode;
  public readonly provider?: string;
  public readonly retryable: boolean;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: DatastoreErrorCode,
    opts: {
      provider?: string;
      retryable?: boolean;
      statusCode?: number;
      details?: Record<string, unknown>;
    } = {},
  ) {
    super(message);
    this.name = 'DatastoreError';
    this.code = code;
    this.provider = opts.provider;
    this.retryable = opts.retryable ?? false;
    this.statusCode = opts.statusCode ?? 500;
    this.details = opts.details;
  }
}

/* ─── Convenience factories ─── */

export class ProviderUnavailableError extends DatastoreError {
  constructor(provider: string, message?: string) {
    super(message ?? `Provider ${provider} is unavailable`, 'PROVIDER_UNAVAILABLE', {
      provider,
      retryable: true,
      statusCode: 503,
    });
  }
}

export class ConnectionFailedError extends DatastoreError {
  constructor(provider: string, message?: string) {
    super(message ?? `Connection to ${provider} failed`, 'CONNECTION_FAILED', {
      provider,
      retryable: true,
      statusCode: 503,
    });
  }
}

export class UnsupportedOperationError extends DatastoreError {
  constructor(provider: string, operation: string) {
    super(
      `Operation "${operation}" is not supported by provider ${provider}`,
      'UNSUPPORTED_OPERATION',
      { provider, retryable: false, statusCode: 400 },
    );
  }
}

export class CircuitOpenError extends DatastoreError {
  constructor(provider: string) {
    super(`Circuit breaker open for provider ${provider}`, 'CIRCUIT_OPEN', {
      provider,
      retryable: false,
      statusCode: 503,
    });
  }
}

export class ResidencyViolationError extends DatastoreError {
  constructor(tenantId: string, region: string) {
    super(
      `Residency policy violation for tenant ${tenantId}: region ${region} not allowed`,
      'RESIDENCY_VIOLATION',
      { retryable: false, statusCode: 403 },
    );
  }
}

export class LegalHoldBlockError extends DatastoreError {
  constructor(tenantId: string) {
    super(
      `Legal hold active for tenant ${tenantId}: destructive operation blocked`,
      'LEGAL_HOLD_BLOCK',
      { retryable: false, statusCode: 403 },
    );
  }
}

export class PreflightFailedError extends DatastoreError {
  constructor(profileId: string, errors: string[]) {
    super(
      `Preflight validation failed for profile ${profileId}: ${errors.join('; ')}`,
      'PREFLIGHT_FAILED',
      { retryable: false, statusCode: 422, details: { errors } },
    );
  }
}

export class CredentialExpiredError extends DatastoreError {
  constructor(provider: string) {
    super(`Credentials expired for provider ${provider}`, 'CREDENTIAL_EXPIRED', {
      provider,
      retryable: false,
      statusCode: 401,
    });
  }
}

export class ThrottledError extends DatastoreError {
  public readonly retryAfterMs?: number;
  constructor(provider: string, retryAfterMs?: number) {
    super(`Request throttled by provider ${provider}`, 'THROTTLED', {
      provider,
      retryable: true,
      statusCode: 429,
      details: retryAfterMs ? { retryAfterMs } : undefined,
    });
    this.retryAfterMs = retryAfterMs;
  }
}
