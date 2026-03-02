import { Kafka, Producer } from 'kafkajs';

interface PublishRealtimeDlqParams {
  topic: string;
  partition: number;
  offset: string;
  reason: string;
  rawValue?: string;
  parsedValue?: unknown;
  diagnostics?: Record<string, unknown>;
  eventId?: string;
  correlationId?: string;
}

export class RealtimeDlqPublisher {
  private producer: Producer;
  private connected = false;

  constructor(kafka: Kafka, private readonly topic: string) {
    this.producer = kafka.producer();
  }

  async connect(): Promise<void> {
    await this.producer.connect();
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    await this.producer.disconnect();
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async publish(params: PublishRealtimeDlqParams): Promise<void> {
    if (!this.connected) {
      console.error('[RealtimeDlqPublisher] Cannot publish: not connected');
      throw new Error('DLQ publisher not connected');
    }

    const value = {
      failed_at: new Date().toISOString(),
      reason: params.reason,
      source: {
        topic: params.topic,
        partition: params.partition,
        offset: params.offset,
      },
      ...(params.eventId ? { event_id: params.eventId } : {}),
      ...(params.correlationId ? { correlation_id: params.correlationId } : {}),
      ...(params.rawValue ? { raw_value: params.rawValue } : {}),
      ...(params.parsedValue !== undefined ? { parsed_value: params.parsedValue } : {}),
      ...(params.diagnostics ? { diagnostics: params.diagnostics } : {}),
    };

    const key = params.eventId || `${params.topic}:${params.partition}:${params.offset}`;

    console.log(
      `[RealtimeDlqPublisher] Publishing to ${this.topic}: reason=${params.reason} key=${key}`
    );

    await this.producer.send({
      topic: this.topic,
      messages: [
        {
          key,
          value: JSON.stringify(value),
        },
      ],
    });

    console.log(`[RealtimeDlqPublisher] Published successfully: key=${key}`);
  }
}
