import { z } from 'zod';

export const uuid = z.string().uuid();
export const email = z.string().email();
export const timestamp = z.number().int().positive();
export const paginationQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});
