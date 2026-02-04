import { SchemaType } from '@kafkajs/confluent-schema-registry';
import { Schema } from '../registry-client';

export const CHAT_MESSAGE_SCHEMA: Schema = {
  type: SchemaType.JSON,
  subject: 'chat-message-value',
  schema: JSON.stringify({
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Chat Message',
    description: 'Chat message payload for messaging events',
    type: 'object',
    properties: {
      message_id: {
        type: 'string',
        description: 'Unique message identifier',
        minLength: 1,
        maxLength: 100
      },
      conversation_id: {
        type: 'string',
        description: 'Conversation identifier',
        minLength: 1,
        maxLength: 100
      },
      sender_id: {
        type: 'string',
        description: 'Message sender user ID',
        minLength: 1,
        maxLength: 50
      },
      message_type: {
        type: 'string',
        description: 'Type of message',
        enum: ['text', 'image', 'video', 'audio', 'file', 'system', 'reply']
      },
      content: {
        type: 'object',
        description: 'Message content',
        properties: {
          text: {
            type: ['string', 'null'],
            description: 'Text content',
            maxLength: 10000
          },
          media: {
            type: ['object', 'null'],
            description: 'Media content',
            properties: {
              file_id: {
                type: 'string',
                description: 'File identifier',
                maxLength: 100
              },
              file_name: {
                type: 'string',
                description: 'Original file name',
                maxLength: 255
              },
              file_size: {
                type: 'integer',
                description: 'File size in bytes',
                minimum: 0
              },
              mime_type: {
                type: 'string',
                description: 'MIME type',
                maxLength: 100
              },
              url: {
                type: ['string', 'null'],
                description: 'File URL',
                maxLength: 500
              },
              thumbnail_url: {
                type: ['string', 'null'],
                description: 'Thumbnail URL',
                maxLength: 500
              },
              duration: {
                type: ['integer', 'null'],
                description: 'Duration in seconds (for audio/video)',
                minimum: 0
              },
              dimensions: {
                type: ['object', 'null'],
                description: 'Image/video dimensions',
                properties: {
                  width: {
                    type: 'integer',
                    minimum: 0
                  },
                  height: {
                    type: 'integer',
                    minimum: 0
                  }
                },
                required: ['width', 'height']
              }
            },
            required: ['file_id', 'file_name', 'file_size', 'mime_type']
          },
          reply_to: {
            type: ['object', 'null'],
            description: 'Reply information',
            properties: {
              message_id: {
                type: 'string',
                description: 'Original message ID',
                maxLength: 100
              },
              sender_id: {
                type: 'string',
                description: 'Original sender ID',
                maxLength: 50
              },
              preview: {
                type: 'string',
                description: 'Preview of original message',
                maxLength: 200
              }
            },
            required: ['message_id', 'sender_id']
          },
          mentions: {
            type: ['array', 'null'],
            description: 'User mentions',
            items: {
              type: 'object',
              properties: {
                user_id: {
                  type: 'string',
                  description: 'Mentioned user ID',
                  maxLength: 50
                },
                display_name: {
                  type: 'string',
                  description: 'Display name',
                  maxLength: 100
                },
                offset: {
                  type: 'integer',
                  description: 'Character offset in text',
                  minimum: 0
                },
                length: {
                  type: 'integer',
                  description: 'Length of mention',
                  minimum: 1
                }
              },
              required: ['user_id', 'display_name', 'offset', 'length']
            }
          },
          formatting: {
            type: ['array', 'null'],
            description: 'Text formatting',
            items: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['bold', 'italic', 'underline', 'strikethrough', 'code', 'link']
                },
                offset: {
                  type: 'integer',
                  minimum: 0
                },
                length: {
                  type: 'integer',
                  minimum: 1
                },
                url: {
                  type: ['string', 'null'],
                  description: 'URL for link formatting',
                  maxLength: 500
                }
              },
              required: ['type', 'offset', 'length']
            }
          }
        },
        additionalProperties: false
      },
      thread_id: {
        type: ['string', 'null'],
        description: 'Thread identifier for threaded conversations',
        maxLength: 100
      },
      edited_at: {
        type: ['integer', 'null'],
        description: 'Edit timestamp',
        minimum: 0
      },
      deleted_at: {
        type: ['integer', 'null'],
        description: 'Deletion timestamp',
        minimum: 0
      },
      reactions: {
        type: ['array', 'null'],
        description: 'Message reactions',
        items: {
          type: 'object',
          properties: {
            emoji: {
              type: 'string',
              description: 'Emoji reaction',
              maxLength: 10
            },
            user_id: {
              type: 'string',
              description: 'User who reacted',
              maxLength: 50
            },
            timestamp: {
              type: 'integer',
              description: 'Reaction timestamp',
              minimum: 0
            }
          },
          required: ['emoji', 'user_id', 'timestamp']
        }
      },
      delivery_status: {
        type: 'string',
        description: 'Message delivery status',
        enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
        default: 'pending'
      },
      priority: {
        type: 'string',
        description: 'Message priority',
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal'
      },
      expires_at: {
        type: ['integer', 'null'],
        description: 'Message expiration timestamp',
        minimum: 0
      }
    },
    required: [
      'message_id',
      'conversation_id',
      'sender_id',
      'message_type',
      'content',
      'delivery_status',
      'priority'
    ],
    additionalProperties: false
  })
};