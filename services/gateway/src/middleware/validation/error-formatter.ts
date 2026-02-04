import { ZodError } from 'zod';

export interface ValidationErrorDetail {
  field: string;
  message: string;
  code: string;
}

export const formatZodError = (error: ZodError): ValidationErrorDetail[] => {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));
};

export const formatSchemaError = (error: any): ValidationErrorDetail[] => {
  if (error instanceof ZodError) {
    return formatZodError(error);
  }
  return [{
    field: 'unknown',
    message: error.message || 'Validation error',
    code: 'VALIDATION_ERROR'
  }];
};
