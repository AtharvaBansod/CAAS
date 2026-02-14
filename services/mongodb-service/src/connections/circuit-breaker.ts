/**
 * Circuit Breaker
 * 
 * Implements circuit breaker pattern to prevent cascade failures
 */

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  successThreshold?: number;
  timeout?: number;
}

export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open',
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime?: number;
  private failureThreshold: number;
  private successThreshold: number;
  private timeout: number;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 60000; // 1 minute
  }

  /**
   * Record a successful operation
   */
  recordSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;

      if (this.successCount >= this.successThreshold) {
        this.close();
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on success
      this.failureCount = 0;
    }
  }

  /**
   * Record a failed operation
   */
  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      // Failure in half-open state, reopen circuit
      this.open();
    } else if (this.state === CircuitState.CLOSED) {
      if (this.failureCount >= this.failureThreshold) {
        this.open();
      }
    }
  }

  /**
   * Check if circuit is open
   */
  isOpen(): boolean {
    if (this.state === CircuitState.OPEN) {
      // Check if timeout has elapsed
      if (this.lastFailureTime && Date.now() - this.lastFailureTime >= this.timeout) {
        this.halfOpen();
        return false;
      }
      return true;
    }

    return false;
  }

  /**
   * Get current state
   */
  getState(): string {
    return this.state;
  }

  /**
   * Open the circuit
   */
  private open(): void {
    console.log('Circuit breaker opened');
    this.state = CircuitState.OPEN;
    this.successCount = 0;
  }

  /**
   * Close the circuit
   */
  private close(): void {
    console.log('Circuit breaker closed');
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
  }

  /**
   * Set circuit to half-open state
   */
  private halfOpen(): void {
    console.log('Circuit breaker half-open');
    this.state = CircuitState.HALF_OPEN;
    this.successCount = 0;
  }

  /**
   * Get metrics
   */
  getMetrics(): {
    state: string;
    failureCount: number;
    successCount: number;
    lastFailureTime?: number;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    };
  }

  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.close();
  }
}
