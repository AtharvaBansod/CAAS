export class ConsumerMetrics {
  private metrics = {
    messagesConsumed: 0,
    errors: 0,
    totalProcessingTime: 0
  };

  recordSuccess(processingTime: number): void {
    this.metrics.messagesConsumed++;
    this.metrics.totalProcessingTime += processingTime;
  }

  recordError(): void {
    this.metrics.errors++;
  }

  getMetrics() {
    return {
      ...this.metrics,
      avgProcessingTime: this.metrics.messagesConsumed > 0 
        ? this.metrics.totalProcessingTime / this.metrics.messagesConsumed 
        : 0
    };
  }
}
