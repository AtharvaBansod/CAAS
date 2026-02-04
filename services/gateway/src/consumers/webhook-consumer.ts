import { Kafka, Consumer } from 'kafkajs';
import { config } from '../config';
import { webhookService } from '../services/webhook-service';
import { webhookDispatcher, WebhookEvent } from '../services/webhook-dispatcher';
import crypto from 'crypto';

export class WebhookConsumer {
  private consumer: Consumer;
  private isRunning: boolean = false;

  constructor() {
    // If brokers are not configured (e.g. during build/test without env), handle gracefully or fail
    // Here we assume config is validated
    const kafka = new Kafka({
      clientId: 'gateway-webhook-consumer',
      brokers: config.KAFKA_BROKERS ? config.KAFKA_BROKERS.split(',') : ['localhost:9092'],
    });

    this.consumer = kafka.consumer({ groupId: 'gateway-webhooks' });
  }

  async start() {
    if (this.isRunning) return;

    try {
      console.log('Connecting to Kafka for Webhooks...');
      await this.consumer.connect();
      await this.consumer.subscribe({ topic: 'events', fromBeginning: false });

      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          if (!message.value) return;

          try {
            const eventData = JSON.parse(message.value.toString());
            await this.processEvent(eventData);
          } catch (error) {
            console.error('Error processing webhook event:', error);
          }
        },
      });

      this.isRunning = true;
      console.log('Webhook consumer started');
    } catch (error) {
      console.error('Failed to start webhook consumer:', error);
      // In production, we might want to exit or retry
    }
  }

  async stop() {
    if (!this.isRunning) return;
    await this.consumer.disconnect();
    this.isRunning = false;
  }

  private async processEvent(event: any) {
    // Expect event to have tenant_id and event type
    const { tenant_id, type, payload, id, created_at } = event;

    if (!tenant_id || !type) return;

    try {
      // Get webhooks for this tenant
      const webhooks = await webhookService.getWebhooks(tenant_id);
      
      // Filter webhooks that subscribe to this event
      const matchedWebhooks = webhooks.filter(w => w.events.includes(type) || w.events.includes('*'));

      if (matchedWebhooks.length === 0) return;

      const webhookEvent: WebhookEvent = {
        id: id || crypto.randomUUID(),
        event: type,
        created_at: created_at || new Date().toISOString(),
        payload: payload || event,
      };

      // Dispatch to all matched webhooks
      // In a real system, we might want to push these to a separate queue (e.g. 'webhooks_dispatch') 
      // to handle retries and concurrency better. 
      // For now, we dispatch directly.
      
      await Promise.all(matchedWebhooks.map(async (webhook) => {
          if (!webhook.active) return;
          // Fire and forget or await? 
          // Await to ensure we don't kill the process too early if graceful shutdown
          await webhookDispatcher.dispatch(webhook, webhookEvent);
      }));
    } catch (err) {
      console.error(`Error processing event for tenant ${tenant_id}:`, err);
    }
  }
}

export const webhookConsumer = new WebhookConsumer();
