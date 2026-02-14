import { z } from 'zod';

// Message content schemas
const TextContentSchema = z.object({
  type: z.literal('text'),
  text: z.string().min(1).max(10000),
  metadata: z.record(z.any()).optional(),
});

const MediaContentSchema = z.object({
  type: z.enum(['image', 'file', 'audio', 'video']),
  media_url: z.string().url(),
  text: z.string().max(1000).optional(),
  metadata: z.record(z.any()).optional(),
});

const MessageContentSchema = z.union([TextContentSchema, MediaContentSchema]);

// Message envelope schema
export const MessageEnvelopeSchema = z.object({
  message_id: z.string().uuid(),
  conversation_id: z.string(),
  tenant_id: z.string(),
  sender_id: z.string(),
  content: MessageContentSchema,
  timestamp: z.date(),
  metadata: z.object({
    socket_id: z.string(),
    client_version: z.string().optional(),
    device_type: z.string().optional(),
  }),
});

export type MessageEnvelope = z.infer<typeof MessageEnvelopeSchema>;

interface ValidationResult {
  valid: boolean;
  error?: string;
  details?: any;
}

interface RateLimitConfig {
  maxMessagesPerMinute: number;
  maxMessagesPerHour: number;
}

export class MessageValidator {
  private rateLimitStore: Map<string, { count: number; resetAt: number }> = new Map();
  private rateLimitConfig: RateLimitConfig;

  constructor(rateLimitConfig?: RateLimitConfig) {
    this.rateLimitConfig = rateLimitConfig || {
      maxMessagesPerMinute: 60,
      maxMessagesPerHour: 1000,
    };
  }

  /**
   * Validate message structure
   */
  validateStructure(message: any): ValidationResult {
    try {
      MessageEnvelopeSchema.parse(message);
      return { valid: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          error: 'Invalid message structure',
          details: error.errors,
        };
      }
      return {
        valid: false,
        error: 'Unknown validation error',
      };
    }
  }

  /**
   * Validate content based on type
   */
  validateContent(content: any): ValidationResult {
    try {
      MessageContentSchema.parse(content);

      // Additional content validation
      if (content.type === 'text') {
        // Check for spam patterns
        if (this.isSpam(content.text)) {
          return {
            valid: false,
            error: 'Message appears to be spam',
          };
        }

        // Check for prohibited content
        if (this.hasProhibitedContent(content.text)) {
          return {
            valid: false,
            error: 'Message contains prohibited content',
          };
        }
      }

      return { valid: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          error: 'Invalid content structure',
          details: error.errors,
        };
      }
      return {
        valid: false,
        error: 'Unknown content validation error',
      };
    }
  }

  /**
   * Check rate limits for user
   */
  checkRateLimit(userId: string, tenantId: string): ValidationResult {
    const key = `${tenantId}:${userId}`;
    const now = Date.now();
    const minuteKey = `${key}:minute`;
    const hourKey = `${key}:hour`;

    // Check minute rate limit
    const minuteLimit = this.rateLimitStore.get(minuteKey);
    if (minuteLimit) {
      if (now < minuteLimit.resetAt) {
        if (minuteLimit.count >= this.rateLimitConfig.maxMessagesPerMinute) {
          return {
            valid: false,
            error: 'Rate limit exceeded (per minute)',
            details: {
              limit: this.rateLimitConfig.maxMessagesPerMinute,
              resetAt: new Date(minuteLimit.resetAt),
            },
          };
        }
        minuteLimit.count++;
      } else {
        this.rateLimitStore.set(minuteKey, {
          count: 1,
          resetAt: now + 60 * 1000,
        });
      }
    } else {
      this.rateLimitStore.set(minuteKey, {
        count: 1,
        resetAt: now + 60 * 1000,
      });
    }

    // Check hour rate limit
    const hourLimit = this.rateLimitStore.get(hourKey);
    if (hourLimit) {
      if (now < hourLimit.resetAt) {
        if (hourLimit.count >= this.rateLimitConfig.maxMessagesPerHour) {
          return {
            valid: false,
            error: 'Rate limit exceeded (per hour)',
            details: {
              limit: this.rateLimitConfig.maxMessagesPerHour,
              resetAt: new Date(hourLimit.resetAt),
            },
          };
        }
        hourLimit.count++;
      } else {
        this.rateLimitStore.set(hourKey, {
          count: 1,
          resetAt: now + 60 * 60 * 1000,
        });
      }
    } else {
      this.rateLimitStore.set(hourKey, {
        count: 1,
        resetAt: now + 60 * 60 * 1000,
      });
    }

    return { valid: true };
  }

  /**
   * Validate conversation membership (placeholder - should query database)
   */
  async validateMembership(
    userId: string,
    conversationId: string,
    tenantId: string
  ): Promise<ValidationResult> {
    // TODO: Implement actual database query
    // For now, assume valid
    return { valid: true };
  }

  /**
   * Comprehensive validation
   */
  async validate(message: any): Promise<ValidationResult> {
    // Structure validation
    const structureResult = this.validateStructure(message);
    if (!structureResult.valid) {
      return structureResult;
    }

    // Content validation
    const contentResult = this.validateContent(message.content);
    if (!contentResult.valid) {
      return contentResult;
    }

    // Rate limit check
    const rateLimitResult = this.checkRateLimit(message.sender_id, message.tenant_id);
    if (!rateLimitResult.valid) {
      return rateLimitResult;
    }

    // Membership validation
    const membershipResult = await this.validateMembership(
      message.sender_id,
      message.conversation_id,
      message.tenant_id
    );
    if (!membershipResult.valid) {
      return membershipResult;
    }

    return { valid: true };
  }

  /**
   * Simple spam detection
   */
  private isSpam(text: string): boolean {
    // Check for excessive repetition
    const words = text.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    if (words.length > 10 && uniqueWords.size / words.length < 0.3) {
      return true;
    }

    // Check for excessive caps
    const capsCount = (text.match(/[A-Z]/g) || []).length;
    if (text.length > 20 && capsCount / text.length > 0.7) {
      return true;
    }

    return false;
  }

  /**
   * Check for prohibited content
   */
  private hasProhibitedContent(text: string): boolean {
    // Basic prohibited patterns
    const prohibitedPatterns = [
      /\b(viagra|cialis)\b/i,
      /\b(casino|gambling)\b/i,
      // Add more patterns as needed
    ];

    return prohibitedPatterns.some((pattern) => pattern.test(text));
  }

  /**
   * Clean up expired rate limit entries
   */
  cleanupRateLimits(): void {
    const now = Date.now();
    for (const [key, value] of this.rateLimitStore.entries()) {
      if (now > value.resetAt) {
        this.rateLimitStore.delete(key);
      }
    }
  }
}
