import { ZodSchema } from 'zod';

export const validateData = <T>(schema: ZodSchema<T>, data: unknown): { success: boolean; data?: T; error?: any } => {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
};

export const validateBody = <T>(schema: ZodSchema<T>, body: unknown) => validateData(schema, body);
export const validateQuery = <T>(schema: ZodSchema<T>, query: unknown) => validateData(schema, query);
export const validateParams = <T>(schema: ZodSchema<T>, params: unknown) => validateData(schema, params);
export const validateHeaders = <T>(schema: ZodSchema<T>, headers: unknown) => validateData(schema, headers);
