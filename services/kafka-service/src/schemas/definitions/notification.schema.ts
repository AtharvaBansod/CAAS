import { SchemaType } from '@kafkajs/confluent-schema-registry';
import { Schema } from '../registry-client';

export const NOTIFICATION_SCHEMA: Schema = {
  type: SchemaType.JSON,
  subject: 'notification-value',
  schema: JSON.stringify({
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Notification',
    description: 'Notification payload for user notifications',
    type: 'object',
    properties: {
      notification_id: {
        type: 'string',
        description: 'Unique notification identifier',
        minLength: 1,
        maxLength: 100
      },
      user_id: {
        type: 'string',
        description: 'Target user identifier',
        minLength: 1,
        maxLength: 50
      },
      type: {
        type: 'string',
        description: 'Notification type',
        enum: [
          'message',
          'mention',
          'reaction',
          'friend_request',
          'group_invite',
          'call_incoming',
          'call_missed',
          'system',
          'security',
          'billing'
        ]
      },
      priority: {
        type: 'string',
        description: 'Notification priority',
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal'
      },
      title: {
        type: 'string',
        description: 'Notification title',
        minLength: 1,
        maxLength: 100
      },
      body: {
        type: 'string',
        description: 'Notification body text',
        minLength: 1,
        maxLength: 500
      },
      icon: {
        type: ['string', 'null'],
        description: 'Notification icon URL',
        maxLength: 500
      },
      image: {
        type: ['string', 'null'],
        description: 'Notification image URL',
        maxLength: 500
      },
      action_data: {
        type: 'object',
        description: 'Action-specific data',
        properties: {
          // Message notifications
          message: {
            type: ['object', 'null'],
            properties: {
              message_id: {
                type: 'string',
                maxLength: 100
              },
              conversation_id: {
                type: 'string',
                maxLength: 100
              },
              sender_id: {
                type: 'string',
                maxLength: 50
              },
              sender_name: {
                type: 'string',
                maxLength: 100
              },
              preview: {
                type: 'string',
                maxLength: 200
              },
              message_type: {
                type: 'string',
                enum: ['text', 'image', 'video', 'audio', 'file']
              }
            },
            required: ['message_id', 'conversation_id', 'sender_id', 'sender_name']
          },
          
          // Mention notifications
          mention: {
            type: ['object', 'null'],
            properties: {
              message_id: {
                type: 'string',
                maxLength: 100
              },
              conversation_id: {
                type: 'string',
                maxLength: 100
              },
              mentioned_by: {
                type: 'string',
                maxLength: 50
              },
              mentioned_by_name: {
                type: 'string',
                maxLength: 100
              },
              context: {
                type: 'string',
                maxLength: 200
              }
            },
            required: ['message_id', 'conversation_id', 'mentioned_by', 'mentioned_by_name']
          },
          
          // Reaction notifications
          reaction: {
            type: ['object', 'null'],
            properties: {
              message_id: {
                type: 'string',
                maxLength: 100
              },
              conversation_id: {
                type: 'string',
                maxLength: 100
              },
              reactor_id: {
                type: 'string',
                maxLength: 50
              },
              reactor_name: {
                type: 'string',
                maxLength: 100
              },
              emoji: {
                type: 'string',
                maxLength: 10
              }
            },
            required: ['message_id', 'conversation_id', 'reactor_id', 'reactor_name', 'emoji']
          },
          
          // Friend request notifications
          friend_request: {
            type: ['object', 'null'],
            properties: {
              request_id: {
                type: 'string',
                maxLength: 100
              },
              requester_id: {
                type: 'string',
                maxLength: 50
              },
              requester_name: {
                type: 'string',
                maxLength: 100
              },
              requester_avatar: {
                type: ['string', 'null'],
                maxLength: 500
              },
              message: {
                type: ['string', 'null'],
                maxLength: 200
              }
            },
            required: ['request_id', 'requester_id', 'requester_name']
          },
          
          // Group invite notifications
          group_invite: {
            type: ['object', 'null'],
            properties: {
              invite_id: {
                type: 'string',
                maxLength: 100
              },
              group_id: {
                type: 'string',
                maxLength: 100
              },
              group_name: {
                type: 'string',
                maxLength: 100
              },
              inviter_id: {
                type: 'string',
                maxLength: 50
              },
              inviter_name: {
                type: 'string',
                maxLength: 100
              },
              member_count: {
                type: 'integer',
                minimum: 0
              }
            },
            required: ['invite_id', 'group_id', 'group_name', 'inviter_id', 'inviter_name']
          },
          
          // Call notifications
          call: {
            type: ['object', 'null'],
            properties: {
              call_id: {
                type: 'string',
                maxLength: 100
              },
              caller_id: {
                type: 'string',
                maxLength: 50
              },
              caller_name: {
                type: 'string',
                maxLength: 100
              },
              call_type: {
                type: 'string',
                enum: ['voice', 'video']
              },
              conversation_id: {
                type: ['string', 'null'],
                maxLength: 100
              },
              duration: {
                type: ['integer', 'null'],
                description: 'Call duration in seconds (for missed calls)',
                minimum: 0
              }
            },
            required: ['call_id', 'caller_id', 'caller_name', 'call_type']
          },
          
          // System notifications
          system: {
            type: ['object', 'null'],
            properties: {
              category: {
                type: 'string',
                enum: ['maintenance', 'update', 'feature', 'announcement']
              },
              severity: {
                type: 'string',
                enum: ['info', 'warning', 'error']
              },
              action_required: {
                type: 'boolean',
                default: false
              },
              deadline: {
                type: ['integer', 'null'],
                description: 'Action deadline timestamp',
                minimum: 0
              }
            },
            required: ['category', 'severity']
          }
        },
        additionalProperties: false
      },
      actions: {
        type: ['array', 'null'],
        description: 'Available actions for the notification',
        items: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Action identifier',
              maxLength: 50
            },
            title: {
              type: 'string',
              description: 'Action title',
              maxLength: 50
            },
            type: {
              type: 'string',
              description: 'Action type',
              enum: ['accept', 'decline', 'reply', 'view', 'dismiss', 'snooze', 'custom']
            },
            url: {
              type: ['string', 'null'],
              description: 'Action URL',
              maxLength: 500
            },
            payload: {
              type: ['object', 'null'],
              description: 'Action payload data'
            }
          },
          required: ['id', 'title', 'type']
        }
      },
      delivery_channels: {
        type: 'array',
        description: 'Delivery channels for the notification',
        items: {
          type: 'string',
          enum: ['push', 'email', 'sms', 'in_app', 'webhook']
        },
        minItems: 1
      },
      delivery_settings: {
        type: ['object', 'null'],
        description: 'Delivery-specific settings',
        properties: {
          push: {
            type: ['object', 'null'],
            properties: {
              sound: {
                type: ['string', 'null'],
                maxLength: 50
              },
              badge: {
                type: ['integer', 'null'],
                minimum: 0
              },
              vibrate: {
                type: ['boolean', 'null']
              },
              collapse_key: {
                type: ['string', 'null'],
                maxLength: 100
              }
            }
          },
          email: {
            type: ['object', 'null'],
            properties: {
              template: {
                type: 'string',
                maxLength: 50
              },
              subject_override: {
                type: ['string', 'null'],
                maxLength: 100
              }
            }
          }
        }
      },
      scheduled_at: {
        type: ['integer', 'null'],
        description: 'Scheduled delivery timestamp',
        minimum: 0
      },
      expires_at: {
        type: ['integer', 'null'],
        description: 'Notification expiration timestamp',
        minimum: 0
      },
      read_at: {
        type: ['integer', 'null'],
        description: 'Read timestamp',
        minimum: 0
      },
      clicked_at: {
        type: ['integer', 'null'],
        description: 'Click timestamp',
        minimum: 0
      },
      dismissed_at: {
        type: ['integer', 'null'],
        description: 'Dismissal timestamp',
        minimum: 0
      }
    },
    required: [
      'notification_id',
      'user_id',
      'type',
      'priority',
      'title',
      'body',
      'action_data',
      'delivery_channels'
    ],
    additionalProperties: false
  })
};
