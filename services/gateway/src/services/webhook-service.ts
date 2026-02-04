import { generateRandomString } from '../utils/crypto';

export interface WebhookConfig {
  id: string;
  tenant_id: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  created_at: Date;
}

export class WebhookService {
  private webhooks: WebhookConfig[] = []; // Mock DB

  async createWebhook(tenantId: string, data: Pick<WebhookConfig, 'url' | 'events'>): Promise<WebhookConfig> {
    const webhook: WebhookConfig = {
      id: generateRandomString(16),
      tenant_id: tenantId,
      url: data.url,
      events: data.events,
      secret: generateRandomString(32),
      active: true,
      created_at: new Date(),
    };
    this.webhooks.push(webhook);
    return webhook;
  }

  async getWebhooks(tenantId: string): Promise<WebhookConfig[]> {
    return this.webhooks.filter((w) => w.tenant_id === tenantId);
  }

  async getWebhooksForEvent(tenantId: string, event: string): Promise<WebhookConfig[]> {
    return this.webhooks.filter((w) => w.tenant_id === tenantId && w.active && w.events.includes(event));
  }

  async deleteWebhook(tenantId: string, id: string): Promise<void> {
    const index = this.webhooks.findIndex((w) => w.id === id && w.tenant_id === tenantId);
    if (index !== -1) {
      this.webhooks.splice(index, 1);
    }
  }
}

export const webhookService = new WebhookService();
