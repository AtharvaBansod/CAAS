# SDK Authentication Flow

> Visual flow for SDK authentication process.

---

## Flow Diagram

```mermaid
sequenceDiagram
    participant CA as Client App Server
    participant SDK as CAAS SDK
    participant API as CAAS API
    participant Auth as Auth Service
    
    Note over CA: User logs into client app
    
    CA->>API: POST /auth/session (API Key + User Data)
    API->>Auth: Validate API Key
    Auth->>Auth: Generate JWT for user
    Auth->>API: Return session token
    API->>CA: Session token + refresh token
    
    CA->>SDK: Initialize with session token
    SDK->>API: Connect WebSocket
    API->>Auth: Validate JWT
    Auth->>API: Token valid
    API->>SDK: Connected
    
    Note over SDK,API: Token Refresh (before expiry)
    SDK->>API: POST /auth/refresh
    API->>Auth: Validate refresh token
    Auth->>API: New access token
    API->>SDK: New token
```

---

## Server-Side Session Creation

```typescript
// Client's server creates session
const caas = CaasClient.initialize({
  apiKey: process.env.CAAS_API_KEY,
  apiSecret: process.env.CAAS_API_SECRET
});

const session = await caas.auth.createSession({
  externalUserId: user.id,
  userData: {
    name: user.name,
    avatar: user.avatarUrl,
    email: user.email
  }
});

// Return token to client-side
res.json({ token: session.accessToken });
```

---

## Client-Side Initialization

```typescript
// Client-side SDK init with token
const caas = new CaasClient({
  token: tokenFromServer
});

await caas.connect();
```

---

## Related Documents
- [Authentication Flow](./authentication-flow.md)
- [API SDK Roadmap](../roadmaps/7_apiSdk.md)
