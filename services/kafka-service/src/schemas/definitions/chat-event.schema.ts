import { SchemaType } from '@kafkajs/confluent-schema-registry';
import { Schema } from '../registry-client';

export const CHAT_EVENT_SCHEMA: Schema = {
  type: SchemaType.JSON,
  subject: 'chat-event-value',
  schema: JSON.stringify({
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Chat Event',
    description: 'Chat event payload for real-time chat events',
    type: 'object',
    properties: {
      event_id: {
        type: 'string',
        description: 'Unique event identifier',
        minLength: 1,
        maxLength: 100
      },
      event_type: {
        type: 'string',
        description: 'Type of chat event',
        enum: [
          'typing_started',
          'typing_stopped',
          'message_read',
          'message_delivered',
          'reaction_added',
          'reaction_removed',
          'user_joined',
          'user_left',
          'conversation_updated'
        ]
      },
      conversation_id: {
        type: 'string',
        description: 'Conversation identifier',
        minLength: 1,
        maxLength: 100
      },
      user_id: {
        type: 'string',
        description: 'User who triggered the event',
        minLength: 1,
        maxLength: 50
      },
      target_message_id: {
        type: ['string', 'null'],
        description: 'Target message ID (for reactions, read receipts)',
        maxLength: 100
      },
      event_data: {
        type: 'object',
        description: 'Event-specific data',
        properties: {
          // Typing events
          typing_users: {
            type: ['array', 'null'],
            description: 'List of users currently typing',
            items: {
              type: 'object',
              properties: {
                user_id: {
                  type: 'string',
                  maxLength: 50
                },
                display_name: {
                  type: 'string',
                  maxLength: 100
                },
                started_at: {
                  type: 'integer',
                  minimum: 0
                }
              },
              required: ['user_id', 'display_name', 'started_at']
            }
          },
          
          // Reaction events
          reaction: {
            type: ['object', 'null'],
            description: 'Reaction data',
            properties: {
              emoji: {
                type: 'string',
                description: 'Emoji reaction',
                maxLength: 10
              },
              count: {
                type: 'integer',
                description: 'Total count of this reaction',
                minimum: 0
              },
              users: {
                type: 'array',
                description: 'Users who reacted',
                items: {
                  type: 'object',
                  properties: {
                    user_id: {
                      type: 'string',
                      maxLength: 50
                    },
                    display_name: {
                      type: 'string',
                      maxLength: 100
                    },
                    timestamp: {
                      type: 'integer',
                      minimum: 0
                    }
                  },
                  required: ['user_id', 'display_name', 'timestamp']
                }
              }
            },
            required: ['emoji', 'count', 'users']
          },
          
          // Read receipt events
          read_receipt: {
            type: ['object', 'null'],
            description: 'Read receipt data',
            properties: {
              message_id: {
                type: 'string',
                maxLength: 100
              },
              read_at: {
                type: 'integer',
                minimum: 0
              },
              read_by: {
                type: 'array',
                description: 'Users who read the message',
                items: {
                  type: 'object',
                  properties: {
                    user_id: {
                      type: 'string',
                      maxLength: 50
                    },
                    read_at: {
                      type: 'integer',
                      minimum: 0
                    }
                  },
                  required: ['user_id', 'read_at']
                }
              }
            },
            required: ['message_id', 'read_at', 'read_by']
          },
          
          // Delivery events
          delivery: {
            type: ['object', 'null'],
            description: 'Delivery status data',
            properties: {
              message_id: {
                type: 'string',
                maxLength: 100
              },
              status: {
                type: 'string',
                enum: ['sent', 'delivered', 'failed']
              },
              delivered_at: {
                type: 'integer',
                minimum: 0
              },
              error_message: {
                type: ['string', 'null'],
                description: 'Error message if delivery failed',
                maxLength: 500
              }
            },
            required: ['message_id', 'status', 'delivered_at']
          },
          
          // User join/leave events
          user_activity: {
            type: ['object', 'null'],
            description: 'User activity data',
            properties: {
              action: {
                type: 'string',
                enum: ['joined', 'left', 'invited', 'removed']
              },
              invited_by: {
                type: ['string', 'null'],
                description: 'User who invited (for join events)',
                maxLength: 50
              },
              removed_by: {
                type: ['string', 'null'],
                description: 'User who removed (for leave events)',
                maxLength: 50
              },
              reason: {
                type: ['string', 'null'],
                description: 'Reason for action',
                maxLength: 200
              }
            },
            required: ['action']
          },
          
          // Conversation update events
          conversation_update: {
            type: ['object', 'null'],
            description: 'Conversation update data',
            properties: {
              field: {
                type: 'string',
                description: 'Updated field',
                enum: ['name', 'description', 'avatar', 'settings', 'permissions']
              },
              old_value: {
                type: ['string', 'object', 'null'],
                description: 'Previous value'
              },
              new_value: {
                type: ['string', 'object', 'null'],
                description: 'New value'
              },
              updated_by: {
                type: 'string',
                description: 'User who made the update',
                maxLength: 50
              }
            },
            required: ['field', 'new_value', 'updated_by']
          }
        },
        additionalProperties: false
      },
      expires_at: {
        type: ['integer', 'null'],
        description: 'Event expiration timestamp (for temporary events like typing)',
        minimum: 0
      },
      sequence_number: {
        type: ['integer', 'null'],
        description: 'Sequence number for ordering events',
        minimum: 0
      }
    },
    required: [
      'event_id',
      'event_type',
      'conversation_id',
      'user_id',
      'event_data'
    ],
    additionalProperties: false
  })
};
