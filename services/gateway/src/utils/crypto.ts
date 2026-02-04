import crypto from 'crypto';

export const generateRandomString = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

export const hashString = (str: string): string => {
  return crypto.createHash('sha256').update(str).digest('hex');
};

export const generateUUID = (): string => {
  return crypto.randomUUID();
};
