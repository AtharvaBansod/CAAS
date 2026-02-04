import { z } from 'zod';

// This is a simplified version. For full support, use zod-to-json-schema package.
// Since fastify-type-provider-zod handles this for routes, this is for manual use cases.

export const zodToJsonSchema = (schema: z.ZodTypeAny): any => {
  if (schema instanceof z.ZodString) {
    return { type: 'string' };
  }
  if (schema instanceof z.ZodNumber) {
    return { type: 'number' };
  }
  if (schema instanceof z.ZodBoolean) {
    return { type: 'boolean' };
  }
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const properties: Record<string, any> = {};
    const required: string[] = [];
    
    for (const key in shape) {
      properties[key] = zodToJsonSchema(shape[key]);
      if (!shape[key].isOptional()) {
        required.push(key);
      }
    }
    
    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined
    };
  }
  if (schema instanceof z.ZodArray) {
    return {
      type: 'array',
      items: zodToJsonSchema(schema.element)
    };
  }
  
  return { type: 'object' }; // Fallback
};
