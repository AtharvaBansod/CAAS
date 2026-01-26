# Conversations

## Overview

Conversation management including creation, retrieval, and management of 1:1 and group conversations.

## Task Files

| File | Tasks | Description |
|------|-------|-------------|
| 01-conversation-crud.json | 4 | CONV-001 to CONV-004: CRUD operations |
| 02-group-conversations.json | 4 | CONV-005 to CONV-008: Group features |
| 03-conversation-settings.json | 4 | CONV-009 to CONV-012: Settings, muting |

## Conversation Types

| Type | Description | Max Participants |
|------|-------------|------------------|
| `direct` | 1:1 private conversation | 2 |
| `group` | Group conversation | Configurable (default: 100) |
| `channel` | Broadcast channel | Unlimited |

## API Endpoints

- `POST /v1/conversations` - Create conversation
- `GET /v1/conversations` - List user's conversations
- `GET /v1/conversations/:id` - Get conversation details
- `PUT /v1/conversations/:id` - Update conversation
- `DELETE /v1/conversations/:id` - Delete/leave conversation

## Dependencies

- MONGO-005: Query optimization
- AUTH-001: JWT authentication
- AUTHZ-004: Permission checks
