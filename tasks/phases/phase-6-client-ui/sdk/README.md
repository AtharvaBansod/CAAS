# JavaScript SDK Feature

## Overview

TypeScript SDK for browser and Node.js that provides a simple interface for integrating CAAS chat functionality into applications.

## Architecture

```
packages/sdk/
├── src/
│   ├── index.ts              # Main entry point
│   ├── client.ts             # CAASClient class
│   ├── api/                  # REST API clients
│   │   ├── conversations.ts
│   │   ├── messages.ts
│   │   ├── users.ts
│   │   └── media.ts
│   ├── realtime/             # Socket.IO integration
│   │   ├── socket-client.ts
│   │   └── events.ts
│   ├── types/                # TypeScript types
│   │   ├── index.ts
│   │   ├── conversation.ts
│   │   ├── message.ts
│   │   └── user.ts
│   └── utils/                # Utilities
│       ├── errors.ts
│       └── retry.ts
├── package.json
├── tsconfig.json
├── rollup.config.js
└── README.md
```

## Key Features

### REST API
- Full CRUD for conversations and messages
- User management
- Media upload/download

### Real-Time
- Socket.IO integration
- Event subscription
- Automatic reconnection

### Developer Experience
- TypeScript-first with excellent types
- Tree-shakeable exports
- Comprehensive error handling

## Usage Example

```typescript
import { CAASClient } from '@caas/sdk';

const client = new CAASClient({
  apiKey: 'your-api-key',
  appId: 'your-app-id',
});

// Connect to real-time events
await client.connect();

// Listen for new messages
client.on('message', (message) => {
  console.log('New message:', message);
});

// Send a message
await client.messages.send({
  conversationId: 'conv-123',
  content: 'Hello, world!',
});
```

## Task Groups

1. **01-sdk-core.json** - Core SDK setup and client
2. **02-sdk-realtime.json** - Socket.IO integration

## Technologies

- TypeScript
- Rollup for bundling
- Socket.IO Client
- Fetch API for HTTP
