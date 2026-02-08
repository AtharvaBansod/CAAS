/**
 * Token Validation Errors
 * Phase 2 - Authentication - Task AUTH-002
 */

export class TokenValidationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = 'TokenValidationError';
    Object.setPrototypeOf(this, TokenValidationError.prototype);
  }
}

export class TokenExpiredError extends TokenValidationError {
  constructor(message: string = 'Token has expired') {
    super(message, 'TOKEN_EXPIRED', 401);
    this.name = 'TokenExpiredError';
  }
}

export class TokenMalformedError extends TokenValidationError {
  constructor(message: string = 'Token is malformed') {
    super(message, 'TOKEN_MALFORMED', 401);
    this.name = 'TokenMalformedError';
  }
}

export class TokenSignatureError extends TokenValidationError {
  constructor(message: string = 'Token signature is invalid') {
    super(message, 'TOKEN_SIGNATURE_INVALID', 401);
    this.name = 'TokenSignatureError';
  }
}

export class TokenRevokedError extends TokenValidationError {
  constructor(message: string = 'Token has been revoked') {
    super(message, 'TOKEN_REVOKED', 401);
    this.name = 'TokenRevokedError';
  }
}

export class TokenClaimError extends TokenValidationError {
  constructor(message: string, public claim: string) {
    super(message, 'TOKEN_CLAIM_INVALID', 401);
    this.name = 'TokenClaimError';
  }
}

export class TokenAlgorithmError extends TokenValidationError {
  constructor(message: string = 'Token algorithm is not allowed') {
    super(message, 'TOKEN_ALGORITHM_INVALID', 401);
    this.name = 'TokenAlgorithmError';
  }
}

export class TokenSizeError extends TokenValidationError {
  constructor(message: string = 'Token size exceeds maximum allowed') {
    super(message, 'TOKEN_SIZE_EXCEEDED', 413);
    this.name = 'TokenSizeError';
  }
}
