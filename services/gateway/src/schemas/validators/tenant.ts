import { z } from 'zod';

export const updateSettingsSchema = z.object({
  settings: z.record(z.any()),
});

export const tenantResponseSchema = z.object({
  tenant_id: z.string(),
  name: z.string(),
  plan: z.string(),
});

export const usageResponseSchema = z.object({
  api_calls: z.number(),
  storage_used_gb: z.number(),
  users_active: z.number(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
