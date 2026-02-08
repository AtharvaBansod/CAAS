/**
 * Subject Extractor
 * 
 * Extracts authorization subject from request context
 */

import { FastifyRequest } from 'fastify';
import { AuthzSubject } from './types';

export class SubjectExtractor {
  /**
   * Extract subject from request
   */
  extract(request: FastifyRequest): AuthzSubject {
    // Get user from auth context (set by auth middleware)
    const user = (request as any).user;

    if (!user) {
      throw new Error('User not authenticated');
    }

    return {
      user_id: user.user_id || user.sub,
      tenant_id: user.tenant_id,
      roles: user.roles || [],
      attributes: {
        email: user.email,
        status: user.status,
        created_at: user.created_at,
        // Add any custom attributes from token claims
        ...user.custom_attributes,
      },
    };
  }

  /**
   * Extract subject with additional attributes
   */
  extractWithAttributes(
    request: FastifyRequest,
    additionalAttributes: Record<string, unknown>
  ): AuthzSubject {
    const subject = this.extract(request);
    return {
      ...subject,
      attributes: {
        ...subject.attributes,
        ...additionalAttributes,
      },
    };
  }
}

export const subjectExtractor = new SubjectExtractor();
