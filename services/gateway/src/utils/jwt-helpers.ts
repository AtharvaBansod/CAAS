import jwt, { SignOptions, VerifyOptions } from 'jsonwebtoken';
import { config } from '../config';

// RS256 requires private key for signing, public key for verifying
const PRIVATE_KEY = config.JWT_PRIVATE_KEY.replace(/\\n/g, '\n');
const PUBLIC_KEY = config.JWT_PUBLIC_KEY.replace(/\\n/g, '\n');

export const signJwt = (payload: object, options?: SignOptions): string => {
  return jwt.sign(payload, PRIVATE_KEY, {
    ...(options && options),
    algorithm: 'RS256',
  });
};

export const verifyJwt = <T>(token: string, options?: VerifyOptions): T => {
  return jwt.verify(token, PUBLIC_KEY, {
    ...(options && options),
    algorithms: ['RS256'],
  }) as T;
};

export const decodeJwt = (token: string) => {
  return jwt.decode(token);
};
