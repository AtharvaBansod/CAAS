import { SchemaType } from '@kafkajs/confluent-schema-registry';
import { Schema } from '../registry-client';

export const PRESENCE_UPDATE_SCHEMA: Schema = {
  type: SchemaType.JSON,
  subject: 'presence-update-value',
  schema: JSON.stringify({
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Presence Update',
    description: 'User presence update payload for real-time presence tracking',
    type: 'object',
    properties: {
      user_id: {
        type: 'string',
        description: 'User identifier',
        minLength: 1,
        maxLength: 50
      },
      status: {
        type: 'string',
        description: 'User presence status',
        enum: ['online', 'offline', 'away', 'busy', 'invisible']
      },
      custom_status: {
        type: ['object', 'null'],
        description: 'Custom status message',
        properties: {
          text: {
            type: 'string',
            description: 'Status text',
            maxLength: 100
          },
          emoji: {
            type: ['string', 'null'],
            description: 'Status emoji',
            maxLength: 10
          },
          expires_at: {
            type: ['integer', 'null'],
            description: 'Status expiration timestamp',
            minimum: 0
          }
        },
        required: ['text']
      },
      last_seen: {
        type: 'integer',
        description: 'Last seen timestamp',
        minimum: 0
      },
      device_info: {
        type: 'object',
        description: 'Device information',
        properties: {
          device_id: {
            type: 'string',
            description: 'Device identifier',
            maxLength: 100
          },
          device_type: {
            type: 'string',
            description: 'Type of device',
            enum: ['web', 'mobile', 'desktop', 'tablet', 'api']
          },
          platform: {
            type: ['string', 'null'],
            description: 'Platform/OS',
            maxLength: 50
          },
          app_version: {
            type: ['string', 'null'],
            description: 'Application version',
            maxLength: 20
          },
          user_agent: {
            type: ['string', 'null'],
            description: 'User agent string',
            maxLength: 500
          },
          ip_address: {
            type: ['string', 'null'],
            description: 'IP address',
            maxLength: 45
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
              },
              timezone: {
                type: ['string', 'null'],
                maxLength: 50
              }
            },
            required: ['country']
          }
        },
        required: ['device_id', 'device_type']
      },
      activity: {
        type: ['object', 'null'],
        description: 'Current activity',
        properties: {
          type: {
            type: 'string',
            description: 'Activity type',
            enum: ['typing', 'in_call', 'in_meeting', 'playing_game', 'listening_music', 'custom']
          },
          details: {
            type: ['string', 'null'],
            description: 'Activity details',
            maxLength: 200
          },
          conversation_id: {
            type: ['string', 'null'],
            description: 'Conversation ID (for typing activity)',
            maxLength: 100
          },
          started_at: {
            type: 'integer',
            description: 'Activity start timestamp',
            minimum: 0
          },
          expires_at: {
            type: ['integer', 'null'],
            description: 'Activity expiration timestamp',
            minimum: 0
          }
        },
        required: ['type', 'started_at']
      },
      capabilities: {
        type: ['array', 'null'],
        description: 'Device capabilities',
        items: {
          type: 'string',
          enum: [
            'voice_call',
            'video_call',
            'screen_share',
            'file_upload',
            'push_notifications',
            'background_sync'
          ]
        }
      },
      connection_quality: {
        type: ['object', 'null'],
        description: 'Connection quality metrics',
        properties: {
          signal_strength: {
            type: 'string',
            enum: ['excellent', 'good', 'fair', 'poor']
          },
          network_type: {
            type: 'string',
            enum: ['wifi', 'cellular', 'ethernet', 'unknown']
          },
          latency_ms: {
            type: ['integer', 'null'],
            description: 'Network latency in milliseconds',
            minimum: 0
          },
          bandwidth_kbps: {
            type: ['integer', 'null'],
            description: 'Available bandwidth in kbps',
            minimum: 0
          }
        }
      },
      privacy_settings: {
        type: ['object', 'null'],
        description: 'Privacy settings',
        properties: {
          show_online_status: {
            type: 'boolean',
            description: 'Whether to show online status to others',
            default: true
          },
          show_last_seen: {
            type: 'boolean',
            description: 'Whether to show last seen timestamp',
            default: true
          },
          show_activity: {
            type: 'boolean',
            description: 'Whether to show current activity',
            default: true
          },
          visible_to: {
            type: ['array', 'null'],
            description: 'List of users who can see presence (if restricted)',
            items: {
              type: 'string',
              maxLength: 50
            }
          }
        }
      },
      session_id: {
        type: ['string', 'null'],
        description: 'Session identifier',
        maxLength: 100
      },
      heartbeat_interval: {
        type: ['integer', 'null'],
        description: 'Heartbeat interval in seconds',
        minimum: 1,
        maximum: 300
      }
    },
    required: [
      'user_id',
      'status',
      'last_seen',
      'device_info'
    ],
    additionalProperties: false
  })
};