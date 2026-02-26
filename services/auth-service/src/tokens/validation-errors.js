"use strict";
/**
 * Token Validation Errors
 * Phase 2 - Authentication - Task AUTH-002
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenSizeError = exports.TokenAlgorithmError = exports.TokenClaimError = exports.TokenRevokedError = exports.TokenSignatureError = exports.TokenMalformedError = exports.TokenExpiredError = exports.TokenValidationError = void 0;
class TokenValidationError extends Error {
    code;
    statusCode;
    constructor(message, code, statusCode = 401) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.name = 'TokenValidationError';
        Object.setPrototypeOf(this, TokenValidationError.prototype);
    }
}
exports.TokenValidationError = TokenValidationError;
class TokenExpiredError extends TokenValidationError {
    constructor(message = 'Token has expired') {
        super(message, 'TOKEN_EXPIRED', 401);
        this.name = 'TokenExpiredError';
    }
}
exports.TokenExpiredError = TokenExpiredError;
class TokenMalformedError extends TokenValidationError {
    constructor(message = 'Token is malformed') {
        super(message, 'TOKEN_MALFORMED', 401);
        this.name = 'TokenMalformedError';
    }
}
exports.TokenMalformedError = TokenMalformedError;
class TokenSignatureError extends TokenValidationError {
    constructor(message = 'Token signature is invalid') {
        super(message, 'TOKEN_SIGNATURE_INVALID', 401);
        this.name = 'TokenSignatureError';
    }
}
exports.TokenSignatureError = TokenSignatureError;
class TokenRevokedError extends TokenValidationError {
    constructor(message = 'Token has been revoked') {
        super(message, 'TOKEN_REVOKED', 401);
        this.name = 'TokenRevokedError';
    }
}
exports.TokenRevokedError = TokenRevokedError;
class TokenClaimError extends TokenValidationError {
    claim;
    constructor(message, claim) {
        super(message, 'TOKEN_CLAIM_INVALID', 401);
        this.claim = claim;
        this.name = 'TokenClaimError';
    }
}
exports.TokenClaimError = TokenClaimError;
class TokenAlgorithmError extends TokenValidationError {
    constructor(message = 'Token algorithm is not allowed') {
        super(message, 'TOKEN_ALGORITHM_INVALID', 401);
        this.name = 'TokenAlgorithmError';
    }
}
exports.TokenAlgorithmError = TokenAlgorithmError;
class TokenSizeError extends TokenValidationError {
    constructor(message = 'Token size exceeds maximum allowed') {
        super(message, 'TOKEN_SIZE_EXCEEDED', 413);
        this.name = 'TokenSizeError';
    }
}
exports.TokenSizeError = TokenSizeError;
//# sourceMappingURL=validation-errors.js.map
