import { WebhookConfig } from './webhook-service';
import { generateWebhookSignature } from '../utils/webhook-signature';

export interface WebhookEvent {
  id: string;
  event: string;
  created_at: string;
  payload: any;
}

export class WebhookDispatcher {
  async dispatch(webhook: WebhookConfig, event: WebhookEvent): Promise<boolean> {
    const payload = JSON.stringify(event);
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = generateWebhookSignature(payload, webhook.secret, timestamp);

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-ID': event.id,
          'X-Webhook-Event': event.event,
          'X-Webhook-Timestamp': timestamp.toString(),
          'X-Webhook-Signature': signature,
        },
        body: payload,
        signal: AbortSignal.timeout(30000), // 30s timeout
      });

      if (!response.ok) {
        console.error(`Webhook failed ${webhook.id}: ${response.status} ${response.statusText}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Webhook error ${webhook.id}:`, error);
      return false;
    }
  }
}

export const webhookDispatcher = new WebhookDispatcher();
