import { z } from 'zod';

export const sdkAuthSchema = z.object({
  app_id: z.string(),
  app_secret: z.string(),
  user_external_id: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export const tokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  token_type: z.literal('Bearer'),
});

export type SdkAuthInput = z.infer<typeof sdkAuthSchema>;
