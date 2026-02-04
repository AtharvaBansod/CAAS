export class WebhookRetryService {
  // Retry strategy: Exponential backoff
  // 1st retry: 1 min
  // 2nd retry: 5 min
  // 3rd retry: 30 min
  
  async scheduleRetry(webhookId: string, eventId: string, attempt: number) {
    if (attempt > 3) {
      // Send to Dead Letter Queue
      console.log(`Webhook ${webhookId} event ${eventId} moved to DLQ after ${attempt} attempts`);
      return;
    }

    const delay = this.getDelay(attempt);
    console.log(`Scheduling retry ${attempt} for webhook ${webhookId} in ${delay}ms`);
    
    // In real implementation: Push to Kafka/Redis delayed queue
  }

  private getDelay(attempt: number): number {
    switch (attempt) {
      case 1: return 60 * 1000;
      case 2: return 5 * 60 * 1000;
      case 3: return 30 * 60 * 1000;
      default: return 60 * 1000;
    }
  }
}

export const webhookRetryService = new WebhookRetryService();
