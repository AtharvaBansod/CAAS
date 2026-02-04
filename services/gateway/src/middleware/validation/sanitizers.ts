// Basic sanitization functions
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return input;
  // Basic XSS prevention
  return input
    .trim()
    .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
    .replace(/<[^>]+>/g, "");
};

export const normalizeString = (input: string): string => {
  if (typeof input !== 'string') return input;
  return input.normalize('NFKC').trim();
};
