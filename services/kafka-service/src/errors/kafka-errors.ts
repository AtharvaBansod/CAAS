export class KafkaError extends Error {
  constructor(message: string, public readonly retryable: boolean = false) {
    super(message);
    this.name = 'KafkaError';
  }
}

export class RetryableError extends KafkaError {
  constructor(message: string) {
    super(message, true);
    this.name = 'RetryableError';
  }
}

export class NonRetryableError extends KafkaError {
  constructor(message: string) {
    super(message, false);
    this.name = 'NonRetryableError';
  }
}

export class PoisonPillError extends NonRetryableError {
  constructor(message: string, public readonly originalMessage: any) {
    super(message);
    this.name = 'PoisonPillError';
  }
}
