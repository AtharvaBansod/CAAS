import { z } from 'zod';

export const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
});

export const webhookResponseSchema = z.object({
  id: z.string(),
  url: z.string(),
  events: z.array(z.string()),
  secret: z.string(),
  active: z.boolean(),
});

export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;
