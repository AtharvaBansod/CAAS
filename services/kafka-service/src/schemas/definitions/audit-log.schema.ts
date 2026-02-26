import { SchemaType } from '@kafkajs/confluent-schema-registry';
import { Schema } from '../registry-client';

export const AUDIT_LOG_SCHEMA: Schema = {
  type: SchemaType.JSON,
  subject: 'audit-log-value',
  schema: JSON.stringify({
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Audit Log',
    description: 'Audit log payload for security and compliance tracking',
    type: 'object',
    properties: {
      audit_id: {
        type: 'string',
        description: 'Unique audit log identifier',
        minLength: 1,
        maxLength: 100
      },
      event_type: {
        type: 'string',
        description: 'Type of audited event',
        enum: [
          'authentication',
          'authorization',
          'data_access',
          'data_modification',
          'configuration_change',
          'user_management',
          'system_access',
          'api_access',
          'file_access',
          'security_event',
          'compliance_event'
        ]
      },
      action: {
        type: 'string',
        description: 'Specific action performed',
        minLength: 1,
        maxLength: 100
      },
      resource: {
        type: 'object',
        description: 'Resource that was accessed or modified',
        properties: {
          type: {
            type: 'string',
            description: 'Resource type',
            enum: [
              'user',
              'conversation',
              'message',
              'file',
              'application',
              'api_key',
              'webhook',
              'configuration',
              'database',
              'system'
            ]
          },
          id: {
            type: 'string',
            description: 'Resource identifier',
            maxLength: 100
          },
          name: {
            type: ['string', 'null'],
            description: 'Resource name',
            maxLength: 200
          },
          path: {
            type: ['string', 'null'],
            description: 'Resource path or URL',
            maxLength: 500
          },
          parent_id: {
            type: ['string', 'null'],
            description: 'Parent resource identifier',
            maxLength: 100
          }
        },
        required: ['type', 'id']
      },
      actor: {
        type: 'object',
        description: 'Entity that performed the action',
        properties: {
          type: {
            type: 'string',
            description: 'Actor type',
            enum: ['user', 'service', 'system', 'api_client', 'webhook']
          },
          id: {
            type: 'string',
            description: 'Actor identifier',
            maxLength: 100
          },
          name: {
            type: ['string', 'null'],
            description: 'Actor name',
            maxLength: 200
          },
          email: {
            type: ['string', 'null'],
            description: 'Actor email (for users)',
            maxLength: 255
          },
          role: {
            type: ['string', 'null'],
            description: 'Actor role',
            maxLength: 50
          },
          permissions: {
            type: ['array', 'null'],
            description: 'Actor permissions at time of action',
            items: {
              type: 'string',
              maxLength: 100
            }
          }
        },
        required: ['type', 'id']
      },
      context: {
        type: 'object',
        description: 'Context information',
        properties: {
          session_id: {
            type: ['string', 'null'],
            description: 'Session identifier',
            maxLength: 100
          },
          request_id: {
            type: ['string', 'null'],
            description: 'Request identifier',
            maxLength: 100
          },
          correlation_id: {
            type: ['string', 'null'],
            description: 'Correlation identifier',
            maxLength: 100
          },
          trace_id: {
            type: ['string', 'null'],
            description: 'Distributed trace identifier',
            maxLength: 100
          },
          ip_address: {
            type: ['string', 'null'],
            description: 'Source IP address',
            maxLength: 45
          },
          user_agent: {
            type: ['string', 'null'],
            description: 'User agent string',
            maxLength: 500
          },
          location: {
            type: ['object', 'null'],
            description: 'Geographic location',
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
              }
            },
            required: ['country']
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
              }
            },
            required: ['device_id', 'device_type', 'platform']
          }
        },
        additionalProperties: true
      },
      outcome: {
        type: 'object',
        description: 'Action outcome',
        properties: {
          status: {
            type: 'string',
            description: 'Action status',
            enum: ['success', 'failure', 'partial', 'denied', 'error']
          },
          reason: {
            type: ['string', 'null'],
            description: 'Reason for the outcome',
            maxLength: 500
          },
          error_code: {
            type: ['string', 'null'],
            description: 'Error code (for failures)',
            maxLength: 50
          },
          error_message: {
            type: ['string', 'null'],
            description: 'Error message (for failures)',
            maxLength: 500
          },
          http_status: {
            type: ['integer', 'null'],
            description: 'HTTP status code',
            minimum: 100,
            maximum: 599
          }
        },
        required: ['status']
      },
      changes: {
        type: ['object', 'null'],
        description: 'Data changes (for modification events)',
        properties: {
          before: {
            type: ['object', 'null'],
            description: 'Data before change',
            additionalProperties: true
          },
          after: {
            type: ['object', 'null'],
            description: 'Data after change',
            additionalProperties: true
          },
          fields_changed: {
            type: ['array', 'null'],
            description: 'List of changed fields',
            items: {
              type: 'string',
              maxLength: 100
            }
          }
        }
      },
      risk_assessment: {
        type: ['object', 'null'],
        description: 'Security risk assessment',
        properties: {
          risk_level: {
            type: 'string',
            description: 'Risk level',
            enum: ['low', 'medium', 'high', 'critical']
          },
          risk_score: {
            type: 'number',
            description: 'Numeric risk score (0.0 to 1.0)',
            minimum: 0,
            maximum: 1
          },
          risk_factors: {
            type: ['array', 'null'],
            description: 'Identified risk factors',
            items: {
              type: 'string',
              maxLength: 100
            }
          },
          anomaly_detected: {
            type: 'boolean',
            description: 'Whether anomalous behavior was detected',
            default: false
          }
        },
        required: ['risk_level', 'risk_score']
      },
      compliance: {
        type: ['object', 'null'],
        description: 'Compliance information',
        properties: {
          regulations: {
            type: ['array', 'null'],
            description: 'Applicable regulations',
            items: {
              type: 'string',
              enum: ['GDPR', 'CCPA', 'HIPAA', 'SOX', 'PCI_DSS', 'SOC2', 'ISO27001']
            }
          },
          data_classification: {
            type: ['string', 'null'],
            description: 'Data classification level',
            enum: ['public', 'internal', 'confidential', 'restricted']
          },
          retention_period: {
            type: ['integer', 'null'],
            description: 'Data retention period in days',
            minimum: 0
          },
          legal_hold: {
            type: 'boolean',
            description: 'Whether data is under legal hold',
            default: false
          }
        }
      },
      metadata: {
        type: ['object', 'null'],
        description: 'Additional metadata',
        properties: {
          application: {
            type: ['string', 'null'],
            description: 'Application name',
            maxLength: 100
          },
          version: {
            type: ['string', 'null'],
            description: 'Application version',
            maxLength: 20
          },
          environment: {
            type: ['string', 'null'],
            description: 'Environment (dev, staging, prod)',
            enum: ['development', 'staging', 'production']
          },
          service: {
            type: ['string', 'null'],
            description: 'Service name',
            maxLength: 100
          },
          tags: {
            type: ['array', 'null'],
            description: 'Event tags',
            items: {
              type: 'string',
              maxLength: 50
            }
          }
        },
        additionalProperties: true
      },
      duration_ms: {
        type: ['integer', 'null'],
        description: 'Action duration in milliseconds',
        minimum: 0
      },
      severity: {
        type: 'string',
        description: 'Event severity',
        enum: ['info', 'low', 'medium', 'high', 'critical'],
        default: 'info'
      },
      archived: {
        type: 'boolean',
        description: 'Whether the log entry is archived',
        default: false
      },
      retention_date: {
        type: ['integer', 'null'],
        description: 'Log retention expiration timestamp',
        minimum: 0
      }
    },
    required: [
      'audit_id',
      'event_type',
      'action',
      'resource',
      'actor',
      'context',
      'outcome',
      'severity'
    ],
    additionalProperties: false
  })
};
