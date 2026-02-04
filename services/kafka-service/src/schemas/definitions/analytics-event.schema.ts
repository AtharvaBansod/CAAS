import { SchemaType } from '@kafkajs/confluent-schema-registry';
import { Schema } from '../registry-client';

export const ANALYTICS_EVENT_SCHEMA: Schema = {
  type: SchemaType.JSON,
  subject: 'analytics-event-value',
  schema: JSON.stringify({
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Analytics Event',
    description: 'Analytics event payload for tracking user behavior and system metrics',
    type: 'object',
    properties: {
      event_id: {
        type: 'string',
        description: 'Unique event identifier',
        minLength: 1,
        maxLength: 100
      },
      event_name: {
        type: 'string',
        description: 'Event name',
        minLength: 1,
        maxLength: 100
      },
      category: {
        type: 'string',
        description: 'Event category',
        enum: [
          'user_activity',
          'feature_usage',
          'performance',
          'error',
          'business',
          'security',
          'system'
        ]
      },
      user_id: {
        type: ['string', 'null'],
        description: 'User identifier (null for system events)',
        maxLength: 50
      },
      session_id: {
        type: ['string', 'null'],
        description: 'Session identifier',
        maxLength: 100
      },
      device_info: {
        type: ['object', 'null'],
        description: 'Device information',
        properties: {
          device_id: {
            type: 'string',
            maxLength: 100
          },
          device_type: {
            type: 'string',
            enum: ['web', 'mobile', 'desktop', 'tablet', 'api']
          },
          platform: {
            type: 'string',
            maxLength: 50
          },
          os_version: {
            type: ['string', 'null'],
            maxLength: 20
          },
          app_version: {
            type: ['string', 'null'],
            maxLength: 20
          },
          browser: {
            type: ['string', 'null'],
            maxLength: 50
          },
          browser_version: {
            type: ['string', 'null'],
            maxLength: 20
          },
          screen_resolution: {
            type: ['string', 'null'],
            maxLength: 20
          },
          user_agent: {
            type: ['string', 'null'],
            maxLength: 500
          }
        },
        required: ['device_id', 'device_type', 'platform']
      },
      location_info: {
        type: ['object', 'null'],
        description: 'Geographic location information',
        properties: {
          country: {
            type: 'string',
            maxLength: 2
          },
          region: {
            type: ['string', 'null'],
            maxLength: 50
          },
          city: {
            type: ['string', 'null'],
            maxLength: 50
          },
          timezone: {
            type: ['string', 'null'],
            maxLength: 50
          },
          ip_address: {
            type: ['string', 'null'],
            maxLength: 45
          }
        },
        required: ['country']
      },
      properties: {
        type: 'object',
        description: 'Event-specific properties',
        properties: {
          // User activity properties
          page_url: {
            type: ['string', 'null'],
            maxLength: 500
          },
          page_title: {
            type: ['string', 'null'],
            maxLength: 200
          },
          referrer: {
            type: ['string', 'null'],
            maxLength: 500
          },
          duration_ms: {
            type: ['integer', 'null'],
            minimum: 0
          },
          
          // Feature usage properties
          feature_name: {
            type: ['string', 'null'],
            maxLength: 100
          },
          action: {
            type: ['string', 'null'],
            maxLength: 50
          },
          target: {
            type: ['string', 'null'],
            maxLength: 100
          },
          value: {
            type: ['number', 'null']
          },
          
          // Message properties
          message_id: {
            type: ['string', 'null'],
            maxLength: 100
          },
          conversation_id: {
            type: ['string', 'null'],
            maxLength: 100
          },
          message_type: {
            type: ['string', 'null'],
            enum: ['text', 'image', 'video', 'audio', 'file']
          },
          message_length: {
            type: ['integer', 'null'],
            minimum: 0
          },
          
          // Performance properties
          load_time_ms: {
            type: ['integer', 'null'],
            minimum: 0
          },
          response_time_ms: {
            type: ['integer', 'null'],
            minimum: 0
          },
          memory_usage_mb: {
            type: ['number', 'null'],
            minimum: 0
          },
          cpu_usage_percent: {
            type: ['number', 'null'],
            minimum: 0,
            maximum: 100
          },
          
          // Error properties
          error_type: {
            type: ['string', 'null'],
            maxLength: 100
          },
          error_message: {
            type: ['string', 'null'],
            maxLength: 500
          },
          error_code: {
            type: ['string', 'null'],
            maxLength: 50
          },
          stack_trace: {
            type: ['string', 'null'],
            maxLength: 2000
          },
          
          // Business properties
          revenue: {
            type: ['number', 'null'],
            minimum: 0
          },
          currency: {
            type: ['string', 'null'],
            maxLength: 3
          },
          plan_type: {
            type: ['string', 'null'],
            maxLength: 50
          },
          subscription_id: {
            type: ['string', 'null'],
            maxLength: 100
          },
          
          // Security properties
          security_event_type: {
            type: ['string', 'null'],
            enum: ['login', 'logout', 'failed_login', 'password_change', 'permission_denied', 'suspicious_activity']
          },
          risk_score: {
            type: ['number', 'null'],
            minimum: 0,
            maximum: 1
          },
          
          // Custom properties
          custom_data: {
            type: ['object', 'null'],
            description: 'Custom event data',
            additionalProperties: true
          }
        },
        additionalProperties: true
      },
      metrics: {
        type: ['object', 'null'],
        description: 'Numeric metrics for aggregation',
        properties: {
          count: {
            type: ['integer', 'null'],
            minimum: 0
          },
          sum: {
            type: ['number', 'null']
          },
          average: {
            type: ['number', 'null']
          },
          min: {
            type: ['number', 'null']
          },
          max: {
            type: ['number', 'null']
          },
          percentile_50: {
            type: ['number', 'null']
          },
          percentile_95: {
            type: ['number', 'null']
          },
          percentile_99: {
            type: ['number', 'null']
          }
        },
        additionalProperties: true
      },
      tags: {
        type: ['array', 'null'],
        description: 'Event tags for categorization',
        items: {
          type: 'string',
          maxLength: 50
        }
      },
      experiment_info: {
        type: ['object', 'null'],
        description: 'A/B testing experiment information',
        properties: {
          experiment_id: {
            type: 'string',
            maxLength: 100
          },
          variant: {
            type: 'string',
            maxLength: 50
          },
          cohort: {
            type: ['string', 'null'],
            maxLength: 50
          }
        },
        required: ['experiment_id', 'variant']
      },
      funnel_info: {
        type: ['object', 'null'],
        description: 'Funnel tracking information',
        properties: {
          funnel_id: {
            type: 'string',
            maxLength: 100
          },
          step: {
            type: 'integer',
            minimum: 1
          },
          step_name: {
            type: 'string',
            maxLength: 100
          },
          completed: {
            type: 'boolean'
          },
          conversion_time_ms: {
            type: ['integer', 'null'],
            minimum: 0
          }
        },
        required: ['funnel_id', 'step', 'step_name', 'completed']
      },
      cohort_info: {
        type: ['object', 'null'],
        description: 'User cohort information',
        properties: {
          cohort_id: {
            type: 'string',
            maxLength: 100
          },
          cohort_name: {
            type: 'string',
            maxLength: 100
          },
          join_date: {
            type: 'integer',
            minimum: 0
          },
          days_since_join: {
            type: 'integer',
            minimum: 0
          }
        },
        required: ['cohort_id', 'cohort_name', 'join_date', 'days_since_join']
      },
      sampling_rate: {
        type: ['number', 'null'],
        description: 'Sampling rate for this event (0.0 to 1.0)',
        minimum: 0,
        maximum: 1
      },
      processed_at: {
        type: ['integer', 'null'],
        description: 'Processing timestamp',
        minimum: 0
      }
    },
    required: [
      'event_id',
      'event_name',
      'category',
      'properties'
    ],
    additionalProperties: false
  })
};