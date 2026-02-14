/**
 * Retry Policy
 * 
 * Configurable retry policy with exponential backoff and jitter
 */

export interface RetryPolicyOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  jitterEnabled?: boolean;
}

export class RetryPolicy {
  private maxAttempts: number;
  private initialDelayMs: number;
  private maxDelayMs: number;
  private backoffMultiplier: number;
  private jitterEnabled: boolean;

  constructor(options: RetryPolicyOptions = {}) {
    this.maxAttempts = options.maxAttempts || 10;
    this.initialDelayMs = options.initialDelayMs || 1000;
    this.maxDelayMs = options.maxDelayMs || 30000;
    this.backoffMultiplier = options.backoffMultiplier || 2;
    this.jitterEnabled = options.jitterEnabled !== false;
  }

  /**
   * Check if should retry
   */
  shouldRetry(attemptNumber: number): boolean {
    return attemptNumber < this.maxAttempts;
  }

  /**
   * Get delay for retry attempt
   */
  getDelay(attemptNumber: number): number {
    // Calculate exponential backoff
    let delay = this.initialDelayMs * Math.pow(this.backoffMultiplier, attemptNumber - 1);

    // Cap at max delay
    delay = Math.min(delay, this.maxDelayMs);

    // Add jitter to prevent thundering herd
    if (this.jitterEnabled) {
      delay = this.addJitter(delay);
    }

    return Math.floor(delay);
  }

  /**
   * Add jitter to delay
   */
  private addJitter(delay: number): number {
    // Add random jitter between 0% and 25% of delay
    const jitter = Math.random() * 0.25 * delay;
    return delay + jitter;
  }

  /**
   * Get max attempts
   */
  getMaxAttempts(): number {
    return this.maxAttempts;
  }
}

/**
 * Predefined retry policies
 */
export const RetryPolicies = {
  /**
   * Fast retry - for transient errors
   */
  FAST: new RetryPolicy({
    maxAttempts: 5,
    initialDelayMs: 500,
    maxDelayMs: 5000,
    backoffMultiplier: 2,
  }),

  /**
   * Standard retry - balanced approach
   */
  STANDARD: new RetryPolicy({
    maxAttempts: 10,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
  }),

  /**
   * Slow retry - for persistent errors
   */
  SLOW: new RetryPolicy({
    maxAttempts: 15,
    initialDelayMs: 2000,
    maxDelayMs: 60000,
    backoffMultiplier: 2,
  }),
};
