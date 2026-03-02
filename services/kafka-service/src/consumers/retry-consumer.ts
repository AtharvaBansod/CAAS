/**
 * RT-KAF-001: Retry Consumer
 *
 * Consumes messages from `internal.retry`, applies exponential back-off
 * delays, and either re-publishes to the original topic or routes to DLQ
 * after max retries are exhausted.
 *
 * Envelope metadata fields used:
 *   - _retry_count   : current retry attempt number
 *   - _original_topic: topic the message originally came from
 *   - _retry_at      : ISO timestamp – consumer will hold until this time
 *   - _max_retries   : upper bound (falls back to routing table default)
 *   - event_type     : used to look up the routing entry
 *
 * The consumer group is `caas-retry-consumer`.
 */

import { Kafka, Consumer, Producer, EachMessagePayload, logLevel } from 'kafkajs';
import { getRoutingEntry } from '@caas/realtime-contracts';

export interface RetryConsumerConfig {
  brokers: string[];
  clientId?: string;
  groupId?: string;
  retryTopic?: string;
  dlqTopic?: string;
}

export class RetryConsumer {
  private consumer: Consumer;
  private producer: Producer;
  private running = false;
  private readonly retryTopic: string;
  private readonly dlqTopic: string;

  constructor(config: RetryConsumerConfig) {
    const kafka = new Kafka({
      clientId: config.clientId || 'caas-retry-consumer',
      brokers: config.brokers,
      logLevel: logLevel.WARN,
    });

    this.consumer = kafka.consumer({
      groupId: config.groupId || 'caas-retry-consumer',
      sessionTimeout: 30_000,
      heartbeatInterval: 3_000,
    });
    this.producer = kafka.producer({ idempotent: true });
    this.retryTopic = config.retryTopic || 'internal.retry';
    this.dlqTopic = config.dlqTopic || 'internal.dlq';
  }

  async start(): Promise<void> {
    if (this.running) return;

    await this.producer.connect();
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: this.retryTopic, fromBeginning: false });

    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        await this.handleMessage(payload);
      },
    });

    this.running = true;
    console.log('[RetryConsumer] Started – listening on', this.retryTopic);
  }

  async stop(): Promise<void> {
    if (!this.running) return;
    await this.consumer.disconnect();
    await this.producer.disconnect();
    this.running = false;
    console.log('[RetryConsumer] Stopped');
  }

  // ── core handler ──────────────────────────────────────────

  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { message } = payload;
    const raw = message.value?.toString();
    if (!raw) return;

    let envelope: any;
    try {
      envelope = JSON.parse(raw);
    } catch {
      console.error('[RetryConsumer] Unparseable message – routing to DLQ');
      await this.sendToDlq(raw, 'UNPARSEABLE_RETRY_MESSAGE', message.key?.toString());
      return;
    }

    const retryCount: number = (envelope._retry_count ?? 0);
    const originalTopic: string | undefined = envelope._original_topic;
    const eventType: string | undefined = envelope.event_type;
    const retryAt: string | undefined = envelope._retry_at;

    // Honour scheduled delay – if the retry time is in the future, pause
    if (retryAt) {
      const delayMs = new Date(retryAt).getTime() - Date.now();
      if (delayMs > 0) {
        // Cap individual hold to 30 s to avoid blocking consumer too long
        await this.sleep(Math.min(delayMs, 30_000));
      }
    }

    // Look up routing entry to determine max retries
    const routing = eventType ? getRoutingEntry(eventType) : undefined;
    const maxRetries = (envelope._max_retries ?? routing?.max_retries ?? 3);
    const retryDelays = routing?.retry_delays_ms ?? [1000, 5000, 30_000];

    if (retryCount >= maxRetries) {
      console.warn(`[RetryConsumer] Max retries (${maxRetries}) exhausted for event_type=${eventType} – routing to DLQ`);
      await this.sendToDlq(raw, 'MAX_RETRIES_EXHAUSTED', message.key?.toString(), {
        event_type: eventType,
        original_topic: originalTopic,
        retry_count: retryCount,
      });
      return;
    }

    if (!originalTopic) {
      console.error('[RetryConsumer] Missing _original_topic – routing to DLQ');
      await this.sendToDlq(raw, 'MISSING_ORIGINAL_TOPIC', message.key?.toString());
      return;
    }

    // Re-publish to original topic with incremented retry count
    const nextRetryCount = retryCount + 1;
    const nextDelay = retryDelays[Math.min(nextRetryCount, retryDelays.length - 1)] || 30_000;
    envelope._retry_count = nextRetryCount;
    envelope._retry_at = new Date(Date.now() + nextDelay).toISOString();

    try {
      await this.producer.send({
        topic: originalTopic,
        messages: [
          {
            key: message.key?.toString() || null,
            value: JSON.stringify(envelope),
            headers: {
              'x-retry-count': String(nextRetryCount),
              'x-original-topic': originalTopic,
            },
          },
        ],
      });
      console.log(`[RetryConsumer] Re-published to ${originalTopic} (attempt ${nextRetryCount}/${maxRetries})`);
    } catch (err: any) {
      console.error(`[RetryConsumer] Failed to re-publish to ${originalTopic}: ${err.message}`);
      await this.sendToDlq(raw, 'RETRY_REPUBLISH_FAILED', message.key?.toString(), { error: err.message });
    }
  }

  // ── helpers ───────────────────────────────────────────────

  private async sendToDlq(
    rawValue: string,
    reason: string,
    key?: string,
    extra?: Record<string, any>
  ): Promise<void> {
    try {
      await this.producer.send({
        topic: this.dlqTopic,
        messages: [
          {
            key: key || null,
            value: JSON.stringify({
              _dlq_reason: reason,
              _dlq_timestamp: new Date().toISOString(),
              _original_value: rawValue,
              ...extra,
            }),
          },
        ],
      });
    } catch (dlqErr: any) {
      console.error(`[RetryConsumer] DLQ publish failed: ${dlqErr.message}`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
