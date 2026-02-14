/**
 * Shutdown Manager
 * 
 * Handles graceful shutdown of the application
 */

export class ShutdownManager {
  private activeRequests: number = 0;
  private isShuttingDown: boolean = false;
  private shutdownTimeout: number;
  private shutdownCallbacks: Array<() => Promise<void>> = [];

  constructor(options: { timeoutMs?: number } = {}) {
    this.shutdownTimeout = options.timeoutMs || 30000; // 30 seconds default
  }

  /**
   * Register a callback to be called during shutdown
   */
  onShutdown(callback: () => Promise<void>): void {
    this.shutdownCallbacks.push(callback);
  }

  /**
   * Increment active request counter
   */
  incrementRequests(): void {
    this.activeRequests++;
  }

  /**
   * Decrement active request counter
   */
  decrementRequests(): void {
    this.activeRequests--;
  }

  /**
   * Get active request count
   */
  getActiveRequests(): number {
    return this.activeRequests;
  }

  /**
   * Check if shutting down
   */
  isShutdown(): boolean {
    return this.isShuttingDown;
  }

  /**
   * Initiate graceful shutdown
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      console.log('Shutdown already in progress');
      return;
    }

    console.log('Initiating graceful shutdown...');
    this.isShuttingDown = true;

    // Wait for active requests to complete
    const startTime = Date.now();
    while (this.activeRequests > 0) {
      const elapsed = Date.now() - startTime;
      
      if (elapsed > this.shutdownTimeout) {
        console.warn(
          `Shutdown timeout reached with ${this.activeRequests} active requests remaining`
        );
        break;
      }

      console.log(`Waiting for ${this.activeRequests} active requests to complete...`);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Execute shutdown callbacks
    console.log('Executing shutdown callbacks...');
    for (const callback of this.shutdownCallbacks) {
      try {
        await callback();
      } catch (error) {
        console.error('Error during shutdown callback:', error);
      }
    }

    console.log('Graceful shutdown complete');
  }

  /**
   * Setup signal handlers for graceful shutdown
   */
  setupSignalHandlers(exitCallback?: () => void): void {
    const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];

    for (const signal of signals) {
      process.on(signal, async () => {
        console.log(`Received ${signal}, starting graceful shutdown...`);
        
        try {
          await this.shutdown();
          
          if (exitCallback) {
            exitCallback();
          } else {
            process.exit(0);
          }
        } catch (error) {
          console.error('Error during shutdown:', error);
          process.exit(1);
        }
      });
    }
  }
}

// Singleton instance
export const shutdownManager = new ShutdownManager();
