import Ajv, { JSONSchemaType, ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { getSchemaRegistryClient } from './registry-client';

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  data?: any;
}

export interface SchemaValidationOptions {
  strict?: boolean;
  removeAdditional?: boolean;
  useDefaults?: boolean;
  coerceTypes?: boolean;
}

export class SchemaValidator {
  private ajv: Ajv;
  private compiledSchemas: Map<string, ValidateFunction> = new Map();
  private schemaRegistryClient = getSchemaRegistryClient();

  constructor(options: SchemaValidationOptions = {}) {
    this.ajv = new Ajv({
      strict: options.strict ?? true,
      removeAdditional: options.removeAdditional ?? false,
      useDefaults: options.useDefaults ?? true,
      coerceTypes: options.coerceTypes ?? false,
      allErrors: true,
    });

    // Add format validators
    addFormats(this.ajv);

    // Add custom formats
    this.addCustomFormats();
  }

  /**
   * Validate data against a schema subject
   */
  public async validateBySubject(
    subject: string,
    data: any,
    version?: number
  ): Promise<ValidationResult> {
    try {
      const schemaInfo = await this.schemaRegistryClient.getSchema(subject, version);
      return this.validateBySchema(schemaInfo.schema, data);
    } catch (error) {
      return {
        valid: false,
        errors: [`Failed to get schema for subject ${subject}: ${error instanceof Error ? error.message : 'Unknown error'}`],
      };
    }
  }

  /**
   * Validate data against a JSON schema string
   */
  public validateBySchema(schemaString: string, data: any): ValidationResult {
    try {
      const schema = JSON.parse(schemaString);
      const cacheKey = this.generateCacheKey(schema);
      
      let validate = this.compiledSchemas.get(cacheKey);
      if (!validate) {
        validate = this.ajv.compile(schema);
        this.compiledSchemas.set(cacheKey, validate);
      }

      const valid = validate(data);
      
      if (valid) {
        return {
          valid: true,
          data,
        };
      } else {
        return {
          valid: false,
          errors: validate.errors?.map(error => {
            const path = error.instancePath || 'root';
            return `${path}: ${error.message}`;
          }) || ['Unknown validation error'],
        };
      }
    } catch (error) {
      return {
        valid: false,
        errors: [`Schema validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      };
    }
  }

  /**
   * Validate message envelope
   */
  public async validateMessageEnvelope(data: any): Promise<ValidationResult> {
    return await this.validateBySubject('message-envelope-value', data);
  }

  /**
   * Validate chat message payload
   */
  public async validateChatMessage(data: any): Promise<ValidationResult> {
    return await this.validateBySubject('chat-message-value', data);
  }

  /**
   * Validate chat event payload
   */
  public async validateChatEvent(data: any): Promise<ValidationResult> {
    return await this.validateBySubject('chat-event-value', data);
  }

  /**
   * Validate presence update payload
   */
  public async validatePresenceUpdate(data: any): Promise<ValidationResult> {
    return await this.validateBySubject('presence-update-value', data);
  }

  /**
   * Validate notification payload
   */
  public async validateNotification(data: any): Promise<ValidationResult> {
    return await this.validateBySubject('notification-value', data);
  }

  /**
   * Validate analytics event payload
   */
  public async validateAnalyticsEvent(data: any): Promise<ValidationResult> {
    return await this.validateBySubject('analytics-event-value', data);
  }

  /**
   * Validate audit log payload
   */
  public async validateAuditLog(data: any): Promise<ValidationResult> {
    return await this.validateBySubject('audit-log-value', data);
  }

  /**
   * Validate data and throw error if invalid
   */
  public async validateOrThrow(subject: string, data: any, version?: number): Promise<any> {
    const result = await this.validateBySubject(subject, data, version);
    
    if (!result.valid) {
      const errorMessage = `Validation failed for subject ${subject}: ${result.errors?.join(', ')}`;
      throw new ValidationError(errorMessage, result.errors || []);
    }
    
    return result.data;
  }

  /**
   * Add custom format validators
   */
  private addCustomFormats(): void {
    // UUID v7 format (time-ordered UUIDs)
    this.ajv.addFormat('uuid-v7', {
      type: 'string',
      validate: (uuid: string) => {
        const uuidV7Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidV7Regex.test(uuid);
      },
    });

    // Semantic version format
    this.ajv.addFormat('semver', {
      type: 'string',
      validate: (version: string) => {
        const semverRegex = /^\d+\.\d+\.\d+$/;
        return semverRegex.test(version);
      },
    });

    // Emoji format
    this.ajv.addFormat('emoji', {
      type: 'string',
      validate: (emoji: string) => {
        // Basic emoji validation (can be enhanced)
        const emojiRegex = /^[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]$/u;
        return emojiRegex.test(emoji) || emoji.length <= 10; // Allow text representations
      },
    });

    // MIME type format
    this.ajv.addFormat('mime-type', {
      type: 'string',
      validate: (mimeType: string) => {
        const mimeTypeRegex = /^[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_.]*$/;
        return mimeTypeRegex.test(mimeType);
      },
    });

    // ISO country code format
    this.ajv.addFormat('iso-country', {
      type: 'string',
      validate: (country: string) => {
        return /^[A-Z]{2}$/.test(country);
      },
    });

    // Currency code format
    this.ajv.addFormat('currency', {
      type: 'string',
      validate: (currency: string) => {
        return /^[A-Z]{3}$/.test(currency);
      },
    });
  }

  /**
   * Generate cache key for compiled schemas
   */
  private generateCacheKey(schema: any): string {
    return JSON.stringify(schema);
  }

  /**
   * Clear compiled schema cache
   */
  public clearCache(): void {
    this.compiledSchemas.clear();
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.compiledSchemas.size,
      keys: Array.from(this.compiledSchemas.keys()),
    };
  }
}

export class ValidationError extends Error {
  public readonly validationErrors: string[];

  constructor(message: string, validationErrors: string[]) {
    super(message);
    this.name = 'ValidationError';
    this.validationErrors = validationErrors;
  }
}

// Export singleton instance
let schemaValidatorInstance: SchemaValidator | null = null;

export const getSchemaValidator = (options?: SchemaValidationOptions): SchemaValidator => {
  if (!schemaValidatorInstance) {
    schemaValidatorInstance = new SchemaValidator(options);
  }
  return schemaValidatorInstance;
};