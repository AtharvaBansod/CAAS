/**
 * Base Database Error
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'DatabaseError';
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

/**
 * Connection Error
 */
export class ConnectionError extends DatabaseError {
  constructor(message: string, cause?: Error) {
    super(message, 'CONNECTION_ERROR', cause);
    this.name = 'ConnectionError';
    Object.setPrototypeOf(this, ConnectionError.prototype);
  }
}

/**
 * Not Found Error
 */
export class NotFoundError extends DatabaseError {
  constructor(message: string) {
    super(message, 'NOT_FOUND');
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Duplicate Key Error
 */
export class DuplicateKeyError extends DatabaseError {
  constructor(
    message: string,
    public readonly keyPattern?: Record<string, unknown>
  ) {
    super(message, 'DUPLICATE_KEY');
    this.name = 'DuplicateKeyError';
    Object.setPrototypeOf(this, DuplicateKeyError.prototype);
  }
}

/**
 * Validation Error
 */
export class ValidationError extends DatabaseError {
  constructor(
    message: string,
    public readonly errors?: Record<string, string>
  ) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Transaction Error
 */
export class TransactionError extends DatabaseError {
  constructor(message: string, cause?: Error) {
    super(message, 'TRANSACTION_ERROR', cause);
    this.name = 'TransactionError';
    Object.setPrototypeOf(this, TransactionError.prototype);
  }
}

/**
 * Tenant Isolation Error
 */
export class TenantIsolationError extends DatabaseError {
  constructor(message: string) {
    super(message, 'TENANT_ISOLATION_ERROR');
    this.name = 'TenantIsolationError';
    Object.setPrototypeOf(this, TenantIsolationError.prototype);
  }
}

/**
 * Parse MongoDB Error
 */
export function parseMongoError(error: any): DatabaseError {
  // Duplicate key error
  if (error.code === 11000) {
    return new DuplicateKeyError(
      'Duplicate key error',
      error.keyPattern
    );
  }

  // Validation error
  if (error.name === 'ValidationError') {
    const errors: Record<string, string> = {};
    if (error.errors) {
      for (const [key, value] of Object.entries(error.errors)) {
        errors[key] = (value as any).message;
      }
    }
    return new ValidationError(error.message, errors);
  }

  // Connection error
  if (error.name === 'MongoNetworkError' || error.name === 'MongoServerError') {
    return new ConnectionError(error.message, error);
  }

  // Generic database error
  return new DatabaseError(error.message, error.code, error);
}
