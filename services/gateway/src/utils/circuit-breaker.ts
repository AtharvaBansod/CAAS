/**
 * Circuit Breaker Pattern Implementation
 * Phase 4.5.0 - Task 03
 * 
 * Prevents cascading failures by failing fast when a service is unavailable
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreakerError extends Error {
  constructor(message: string = 'Circuit breaker is OPEN') {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private nextAttemptTime: number = 0;

  constructor(
    private failureThreshold: number = 5,
    private resetTimeout: number = 60000, // 60 seconds
    private monitoringPeriod: number = 10000 // 10 seconds
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttemptTime) {
        throw new CircuitBreakerError('Circuit breaker is OPEN');
      }
      // Try to transition to HALF_OPEN
      this.state = 'HALF_OPEN';
      this.successCount = 0;
      this.failureCount = 0;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= 2) {
        // After 2 successful calls in HALF_OPEN, close the circuit
        this.state = 'CLOSED';
        this.successCount = 0;
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      // Any failure in HALF_OPEN state opens the circuit again
      this.state = 'OPEN';
      this.nextAttemptTime = Date.now() + this.resetTimeout;
      return;
    }

    // Check if we should open the circuit
    const recentFailures = this.getRecentFailureCount();
    if (recentFailures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttemptTime = Date.now() + this.resetTimeout;
    }
  }

  private getRecentFailureCount(): number {
    // In a production system, you'd track failures with timestamps
    // For simplicity, we're using a basic counter with monitoring period
    if (Date.now() - this.lastFailureTime > this.monitoringPeriod) {
      this.failureCount = 1;
      return 1;
    }
    return this.failureCount;
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    this.nextAttemptTime = 0;
  }
}
