/**
 * Token Validation Errors
 * Phase 2 - Authentication - Task AUTH-002
 */
export declare class TokenValidationError extends Error {
    code: string;
    statusCode: number;
    constructor(message: string, code: string, statusCode?: number);
}
export declare class TokenExpiredError extends TokenValidationError {
    constructor(message?: string);
}
export declare class TokenMalformedError extends TokenValidationError {
    constructor(message?: string);
}
export declare class TokenSignatureError extends TokenValidationError {
    constructor(message?: string);
}
export declare class TokenRevokedError extends TokenValidationError {
    constructor(message?: string);
}
export declare class TokenClaimError extends TokenValidationError {
    claim: string;
    constructor(message: string, claim: string);
}
export declare class TokenAlgorithmError extends TokenValidationError {
    constructor(message?: string);
}
export declare class TokenSizeError extends TokenValidationError {
    constructor(message?: string);
}
