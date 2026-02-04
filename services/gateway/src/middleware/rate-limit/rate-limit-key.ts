import { FastifyRequest } from 'fastify';

export const getRateLimitKey = (req: FastifyRequest): string => {
  const auth = (req as any).auth;
  
  if (auth?.tenant_id) {
    return `rl:tenant:${auth.tenant_id}`;
  }
  
  if (auth?.user_id) {
    return `rl:user:${auth.user_id}`;
  }
  
  // Fallback to IP
  const ip = (req.headers['x-forwarded-for'] as string) || req.ip;
  return `rl:ip:${ip}`;
};
