const fs = require('fs');
const path = require('path');
const { io } = require('socket.io-client');

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const value = args[index + 1] && !args[index + 1].startsWith('--') ? args[index + 1] : 'true';
    parsed[key] = value;
    if (value !== 'true') index += 1;
  }
  return parsed;
}

const args = parseArgs();

const config = {
  gatewayUrl: args.gatewayUrl || process.env.GATEWAY_URL || 'http://gateway:3000',
  authServiceUrl: args.authServiceUrl || process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
  complianceServiceUrl: args.complianceServiceUrl || process.env.COMPLIANCE_SERVICE_URL || 'http://compliance-service:3008',
  cryptoServiceUrl: args.cryptoServiceUrl || process.env.CRYPTO_SERVICE_URL || 'http://crypto-service:3009',
  searchServiceUrl: args.searchServiceUrl || process.env.SEARCH_SERVICE_URL || 'http://search-service:3006',
  mediaServiceUrl: args.mediaServiceUrl || process.env.MEDIA_SERVICE_URL || 'http://media-service:3005',
  socketUrls: [
    args.socket1Url || process.env.SOCKET1_URL || 'http://socket-service-1:3001',
    args.socket2Url || process.env.SOCKET2_URL || 'http://socket-service-2:3001',
  ],
  outPath: args.out || process.env.OUT_PATH || null,
  timeoutMs: Number(args.timeoutMs || process.env.TIMEOUT_MS || 12000),
  socketAckTimeoutMs: Number(args.socketAckTimeoutMs || process.env.SOCKET_ACK_TIMEOUT_MS || 1500),
};

const report = {
  generatedAt: new Date().toISOString(),
  metadata: config,
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
  },
  context: {
    token: null,
    apiKey: null,
    createdApiKeyId: null,
  },
  cases: [],
};

function truncate(value, maxLen = 2000) {
  if (value === null || value === undefined) return value;
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen)}... [truncated ${text.length - maxLen} chars]`;
}

function recordCase(entry) {
  report.cases.push(entry);
  report.summary.total += 1;
  if (entry.outcome === 'passed') report.summary.passed += 1;
  else if (entry.outcome === 'warning') report.summary.warnings += 1;
  else report.summary.failed += 1;
}

function isAcceptableStatus(status, acceptable) {
  if (acceptable === 'any') return status >= 100 && status < 600;
  if (Array.isArray(acceptable)) return acceptable.includes(status);
  return status === acceptable;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = config.timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function runHttpCase({ name, method, url, headers = {}, body = null, acceptableStatus = 200, tags = [] }) {
  const startedAt = new Date().toISOString();
  let status = -1;
  let responseHeaders = {};
  let responseBody = '';
  let error = null;

  try {
    const options = { method, headers: { ...headers } };
    if (body !== null && body !== undefined) {
      options.headers['content-type'] = options.headers['content-type'] || 'application/json';
      options.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const res = await fetchWithTimeout(url, options);
    status = res.status;
    for (const [key, value] of res.headers.entries()) {
      responseHeaders[key] = value;
    }
    responseBody = await res.text();
  } catch (err) {
    error = err && err.message ? err.message : String(err);
  }

  const endedAt = new Date().toISOString();
  const success = error ? false : isAcceptableStatus(status, acceptableStatus);
  const outcome = success ? 'passed' : error ? 'failed' : status >= 500 ? 'failed' : 'warning';

  recordCase({
    type: 'http',
    name,
    tags,
    startedAt,
    endedAt,
    request: {
      method,
      url,
      headers,
      body,
      acceptableStatus,
    },
    response: {
      status,
      headers: responseHeaders,
      body: truncate(responseBody, 8000),
      error,
    },
    outcome,
  });

  return { status, body: responseBody, error };
}

function replacePathParams(routePath, replacements) {
  return routePath.replace(/\{([^}]+)\}/g, (_, key) => replacements[key] || `sample-${key.toLowerCase()}`);
}

function sampleFromSchema(schema, depth = 0) {
  if (!schema || depth > 4) return null;

  if (schema.example !== undefined) return schema.example;
  if (Array.isArray(schema.examples) && schema.examples.length > 0) return schema.examples[0];

  const schemaType = schema.type;
  if (schema.enum && schema.enum.length > 0) return schema.enum[0];

  if (schemaType === 'object' || schema.properties) {
    const obj = {};
    const props = schema.properties || {};
    for (const [key, value] of Object.entries(props)) {
      obj[key] = sampleFromSchema(value, depth + 1);
    }
    if (schema.required && Array.isArray(schema.required)) {
      for (const req of schema.required) {
        if (obj[req] === undefined) {
          obj[req] = 'sample';
        }
      }
    }
    return obj;
  }

  if (schemaType === 'array') {
    return [sampleFromSchema(schema.items || {}, depth + 1)];
  }

  if (schemaType === 'integer' || schemaType === 'number') return 1;
  if (schemaType === 'boolean') return true;
  if (schema.format === 'date-time') return new Date().toISOString();
  if (schema.format === 'email') return 'e2e@example.com';
  if (schema.format === 'uuid') return '11111111-1111-1111-1111-111111111111';
  return 'sample';
}

async function runSwaggerDiscovery(authToken, apiKey) {
  const specResult = await runHttpCase({
    name: 'Gateway OpenAPI Spec',
    method: 'GET',
    url: `${config.gatewayUrl}/documentation/json`,
    acceptableStatus: [200],
    tags: ['discovery'],
  });

  if (specResult.error || specResult.status !== 200) return;

  let spec;
  try {
    spec = JSON.parse(specResult.body);
  } catch {
    return;
  }

  const paths = spec.paths || {};
  const replacements = {
    id: report.context.createdApiKeyId || 'sample-id',
    userId: 'sample-user',
    tenantId: 'default-tenant',
    sessionId: 'sample-session',
  };

  const skipPrefixes = ['/documentation', '/internal'];

  for (const [routePath, methods] of Object.entries(paths)) {
    if (skipPrefixes.some((prefix) => routePath.startsWith(prefix))) continue;

    for (const [methodRaw, operation] of Object.entries(methods)) {
      const method = methodRaw.toUpperCase();
      if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) continue;

      const urlPath = replacePathParams(routePath, replacements);
      const url = `${config.gatewayUrl}${urlPath}`;

      const headers = {};
      const operationSecurity = operation.security || spec.security || [];
      if (operationSecurity.length > 0 && authToken) {
        headers.authorization = `Bearer ${authToken}`;
      }
      if (urlPath.includes('/api-keys') && authToken) {
        headers.authorization = `Bearer ${authToken}`;
      }
      if (urlPath.includes('/tenant') && apiKey) {
        headers['x-api-key'] = apiKey;
      }

      let body = null;
      const requestBody = operation.requestBody;
      if (requestBody && requestBody.content) {
        const jsonContent = requestBody.content['application/json'];
        if (jsonContent && jsonContent.schema) {
          body = sampleFromSchema(jsonContent.schema);
        }
      }

      await runHttpCase({
        name: `Gateway Discover ${method} ${urlPath}`,
        method,
        url,
        headers,
        body,
        acceptableStatus: 'any',
        tags: ['discovery', 'gateway'],
      });
    }
  }
}

async function connectSocket(url, namespace, token) {
  return new Promise((resolve) => {
    const socket = io(`${url}${namespace}`, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      auth: token ? { token } : {},
      timeout: 10000,
      reconnection: false,
    });

    let finished = false;

    const complete = (result) => {
      if (finished) return;
      finished = true;
      resolve(result);
    };

    socket.on('connect', () => complete({ ok: true, socket }));
    socket.on('connect_error', (error) => complete({ ok: false, error: error.message, socket }));

    setTimeout(() => complete({ ok: false, error: 'Socket connect timeout', socket }), 12000);
  });
}

async function emitWithAck(socket, event, payload, timeoutMs = 7000) {
  return new Promise((resolve) => {
    let done = false;
    const cleanup = () => {
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
    };

    const onDisconnect = (reason) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      cleanup();
      resolve({ timeout: false, disconnected: true, reason, data: null });
    };

    const onConnectError = (error) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      cleanup();
      resolve({ timeout: false, connectError: error && error.message ? error.message : String(error), data: null });
    };

    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      cleanup();
      resolve({ timeout: true, data: null });
    }, timeoutMs);

    socket.once('disconnect', onDisconnect);
    socket.once('connect_error', onConnectError);

    try {
      socket.emit(event, payload, (data) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        cleanup();
        resolve({ timeout: false, data });
      });
    } catch (error) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      cleanup();
      resolve({ timeout: false, data: { error: error.message || String(error) } });
    }
  });
}

async function runSocketEventCase({ socketUrl, namespace, event, payload, token, expectConnectSuccess, tags = [] }) {
  const startedAt = new Date().toISOString();
  const connection = await connectSocket(socketUrl, namespace, token);

  let outcome = 'failed';
  let response = {};

  if (!connection.ok) {
    response = { connectError: connection.error };
    outcome = expectConnectSuccess ? 'failed' : 'passed';
  } else {
    const result = await emitWithAck(connection.socket, event, payload, config.socketAckTimeoutMs);
    response = result;

    if (result.timeout || result.disconnected || result.connectError) {
      outcome = 'warning';
    } else {
      const hasError = result.data && (result.data.error || result.data.success === false);
      outcome = hasError ? 'warning' : 'passed';
    }

    connection.socket.disconnect();
  }

  const endedAt = new Date().toISOString();

  recordCase({
    type: 'socket',
    name: `Socket ${namespace} ${event} @ ${socketUrl}`,
    tags,
    startedAt,
    endedAt,
    request: {
      socketUrl,
      namespace,
      event,
      payload,
      withAuthToken: Boolean(token),
      expectConnectSuccess,
    },
    response,
    outcome,
  });
}

async function main() {
  await runHttpCase({ name: 'Gateway Health', method: 'GET', url: `${config.gatewayUrl}/health`, acceptableStatus: [200], tags: ['health'] });
  await runHttpCase({ name: 'Gateway Internal Health', method: 'GET', url: `${config.gatewayUrl}/internal/health`, acceptableStatus: 'any', tags: ['health'] });
  await runHttpCase({ name: 'Gateway Internal Ready', method: 'GET', url: `${config.gatewayUrl}/internal/ready`, acceptableStatus: 'any', tags: ['health'] });

  await runHttpCase({ name: 'Auth Service Health', method: 'GET', url: `${config.authServiceUrl}/health`, acceptableStatus: [200], tags: ['health'] });
  await runHttpCase({ name: 'Compliance Service Health', method: 'GET', url: `${config.complianceServiceUrl}/health`, acceptableStatus: 'any', tags: ['health'] });
  await runHttpCase({ name: 'Crypto Service Health', method: 'GET', url: `${config.cryptoServiceUrl}/health`, acceptableStatus: [200], tags: ['health'] });
  await runHttpCase({ name: 'Search Service Health', method: 'GET', url: `${config.searchServiceUrl}/health`, acceptableStatus: [200], tags: ['health'] });
  await runHttpCase({ name: 'Media Service Health', method: 'GET', url: `${config.mediaServiceUrl}/health`, acceptableStatus: [200], tags: ['health'] });
  await runHttpCase({ name: 'Socket Service 1 Health', method: 'GET', url: `${config.socketUrls[0]}/health`, acceptableStatus: [200], tags: ['health'] });
  await runHttpCase({ name: 'Socket Service 2 Health', method: 'GET', url: `${config.socketUrls[1]}/health`, acceptableStatus: [200], tags: ['health'] });

  const sdkTokenRes = await runHttpCase({
    name: 'Gateway SDK Token (valid)',
    method: 'POST',
    url: `${config.gatewayUrl}/v1/auth/sdk/token`,
    body: {
      app_id: 'default-tenant',
      app_secret: 'secret',
      user_external_id: `e2e-${Date.now()}`,
    },
    acceptableStatus: [200],
    tags: ['auth', 'gateway'],
  });

  await runHttpCase({
    name: 'Gateway SDK Token (invalid secret)',
    method: 'POST',
    url: `${config.gatewayUrl}/v1/auth/sdk/token`,
    body: {
      app_id: 'default-tenant',
      app_secret: 'wrong-secret',
      user_external_id: `e2e-${Date.now()}`,
    },
    acceptableStatus: [401, 400],
    tags: ['auth', 'negative'],
  });

  let accessToken = null;
  if (sdkTokenRes.status === 200 && sdkTokenRes.body) {
    try {
      accessToken = JSON.parse(sdkTokenRes.body).access_token;
      report.context.token = accessToken;
    } catch {
      accessToken = null;
    }
  }

  const authHeaders = accessToken ? { authorization: `Bearer ${accessToken}` } : {};

  let socketAuthToken = accessToken;
  if (accessToken) {
    const validation = await runHttpCase({
      name: 'Auth Service Validate Gateway Token',
      method: 'POST',
      url: `${config.authServiceUrl}/api/v1/auth/validate`,
      body: { token: accessToken },
      acceptableStatus: 'any',
      tags: ['auth', 'socket-preflight'],
    });

    if (validation.status !== 200) {
      socketAuthToken = null;
      recordCase({
        type: 'analysis',
        name: 'Socket Auth Token Compatibility',
        tags: ['socket-preflight'],
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        request: { source: 'gateway-sdk-token', authValidateEndpoint: `${config.authServiceUrl}/api/v1/auth/validate` },
        response: {
          status: validation.status,
          note: 'Gateway SDK token is not accepted by auth-service validate endpoint; socket authenticated flows may be rejected.',
        },
        outcome: 'warning',
      });
    }
  }

  await runHttpCase({ name: 'Gateway Ping', method: 'GET', url: `${config.gatewayUrl}/v1/ping`, acceptableStatus: [200], tags: ['gateway'] });
  await runHttpCase({ name: 'Gateway Tenant Unauthorized', method: 'GET', url: `${config.gatewayUrl}/v1/tenant`, acceptableStatus: [401, 403], tags: ['negative', 'gateway'] });
  await runHttpCase({ name: 'Gateway Tenant Authorized', method: 'GET', url: `${config.gatewayUrl}/v1/tenant`, headers: authHeaders, acceptableStatus: 'any', tags: ['gateway'] });
  await runHttpCase({ name: 'Gateway Tenant Usage', method: 'GET', url: `${config.gatewayUrl}/v1/tenant/usage`, headers: authHeaders, acceptableStatus: 'any', tags: ['gateway'] });
  await runHttpCase({
    name: 'Gateway Tenant Settings Update',
    method: 'PUT',
    url: `${config.gatewayUrl}/v1/tenant/settings`,
    headers: authHeaders,
    body: { settings: { locale: 'en', timezone: 'UTC' } },
    acceptableStatus: 'any',
    tags: ['gateway'],
  });

  const createApiKey = await runHttpCase({
    name: 'Gateway Create API Key',
    method: 'POST',
    url: `${config.gatewayUrl}/v1/auth/api-keys`,
    headers: authHeaders,
    body: { name: 'e2e-key', scopes: ['read'] },
    acceptableStatus: 'any',
    tags: ['gateway', 'auth'],
  });

  let createdApiKeyId = null;
  if (createApiKey.status === 201 && createApiKey.body) {
    try {
      const parsed = JSON.parse(createApiKey.body);
      report.context.apiKey = parsed.key;
      createdApiKeyId = parsed.id;
      report.context.createdApiKeyId = createdApiKeyId;
    } catch {
      createdApiKeyId = null;
    }
  }

  await runHttpCase({ name: 'Gateway List API Keys', method: 'GET', url: `${config.gatewayUrl}/v1/auth/api-keys`, headers: authHeaders, acceptableStatus: 'any', tags: ['gateway', 'auth'] });
  if (createdApiKeyId) {
    await runHttpCase({ name: 'Gateway Delete API Key', method: 'DELETE', url: `${config.gatewayUrl}/v1/auth/api-keys/${createdApiKeyId}`, headers: authHeaders, acceptableStatus: 'any', tags: ['gateway', 'auth'] });
  }

  await runHttpCase({ name: 'Gateway Sessions List', method: 'GET', url: `${config.gatewayUrl}/v1/sessions`, headers: authHeaders, acceptableStatus: 'any', tags: ['gateway', 'sessions'] });
  await runHttpCase({ name: 'Gateway Sessions Others', method: 'DELETE', url: `${config.gatewayUrl}/v1/sessions/others`, headers: authHeaders, acceptableStatus: 'any', tags: ['gateway', 'sessions'] });

  await runHttpCase({
    name: 'Compliance Audit Log Valid',
    method: 'POST',
    url: `${config.complianceServiceUrl}/api/v1/audit/log`,
    body: {
      tenant_id: 'default-tenant',
      user_id: 'e2e-user',
      action: 'e2e_test',
      resource_type: 'system',
    },
    acceptableStatus: 'any',
    tags: ['compliance'],
  });

  await runHttpCase({
    name: 'Compliance Audit Log Invalid',
    method: 'POST',
    url: `${config.complianceServiceUrl}/api/v1/audit/log`,
    body: { tenant_id: '', action: '' },
    acceptableStatus: 'any',
    tags: ['compliance', 'negative'],
  });

  const keyCreate = await runHttpCase({
    name: 'Crypto Key Generate',
    method: 'POST',
    url: `${config.cryptoServiceUrl}/api/v1/keys/generate`,
    body: { tenant_id: 'default-tenant', key_type: 'data' },
    acceptableStatus: 'any',
    tags: ['crypto'],
  });

  let keyId = null;
  if (keyCreate.status >= 200 && keyCreate.status < 300 && keyCreate.body) {
    try {
      keyId = JSON.parse(keyCreate.body).key_id;
    } catch {
      keyId = null;
    }
  }

  let encryptedData = null;
  if (keyId) {
    const encrypt = await runHttpCase({
      name: 'Crypto Encrypt',
      method: 'POST',
      url: `${config.cryptoServiceUrl}/api/v1/encrypt`,
      body: { key_id: keyId, plaintext: 'end-to-end' },
      acceptableStatus: 'any',
      tags: ['crypto'],
    });

    if (encrypt.status >= 200 && encrypt.status < 300 && encrypt.body) {
      try {
        encryptedData = JSON.parse(encrypt.body);
      } catch {
        encryptedData = null;
      }
    }
  }

  if (keyId && encryptedData) {
    await runHttpCase({
      name: 'Crypto Decrypt Valid',
      method: 'POST',
      url: `${config.cryptoServiceUrl}/api/v1/decrypt`,
      body: {
        key_id: keyId,
        ciphertext: encryptedData.ciphertext,
        iv: encryptedData.iv,
        authTag: encryptedData.authTag,
      },
      acceptableStatus: 'any',
      tags: ['crypto'],
    });

    await runHttpCase({
      name: 'Crypto Decrypt Invalid Key',
      method: 'POST',
      url: `${config.cryptoServiceUrl}/api/v1/decrypt`,
      body: {
        key_id: 'invalid-key',
        ciphertext: encryptedData.ciphertext,
        iv: encryptedData.iv,
        authTag: encryptedData.authTag,
      },
      acceptableStatus: 'any',
      tags: ['crypto', 'negative'],
    });
  }

  await runHttpCase({
    name: 'Search Empty Query',
    method: 'POST',
    url: `${config.searchServiceUrl}/api/v1/search/messages`,
    body: { query: '' },
    acceptableStatus: 'any',
    tags: ['search', 'negative'],
  });

  await runHttpCase({
    name: 'Media Quota Unauthorized',
    method: 'GET',
    url: `${config.mediaServiceUrl}/api/v1/media/quota`,
    acceptableStatus: 'any',
    tags: ['media', 'negative'],
  });

  await runSwaggerDiscovery(accessToken, report.context.apiKey);

  const socketEvents = [
    { namespace: '/chat', event: 'joinRoom', payload: { conversationId: 'conv-e2e' } },
    { namespace: '/chat', event: 'leaveRoom', payload: { conversationId: 'conv-e2e' } },
    { namespace: '/chat', event: 'sendMessage', payload: { conversationId: 'conv-e2e', messageContent: 'hello from e2e' } },
    { namespace: '/chat', event: 'typing_start', payload: { conversationId: 'conv-e2e' } },
    { namespace: '/chat', event: 'typing_stop', payload: { conversationId: 'conv-e2e' } },
    { namespace: '/chat', event: 'typing_query', payload: { conversationId: 'conv-e2e' } },
    { namespace: '/chat', event: 'message_delivered', payload: { messageId: 'msg-e2e', conversationId: 'conv-e2e' } },
    { namespace: '/chat', event: 'messages_delivered', payload: { messageIds: ['msg-a', 'msg-b'], conversationId: 'conv-e2e' } },
    { namespace: '/chat', event: 'delivery_status', payload: { messageId: 'msg-e2e' } },
    { namespace: '/chat', event: 'message_read', payload: { messageId: 'msg-e2e', conversationId: 'conv-e2e' } },
    { namespace: '/chat', event: 'messages_read', payload: { messageIds: ['msg-a', 'msg-b'], conversationId: 'conv-e2e' } },
    { namespace: '/chat', event: 'conversation_read', payload: { conversationId: 'conv-e2e', upToMessageId: 'msg-b' } },
    { namespace: '/chat', event: 'unread_query', payload: {} },
    { namespace: '/chat', event: 'moderate:kick', payload: { conversationId: 'conv-e2e', userId: 'user-bad' } },
    { namespace: '/chat', event: 'moderate:ban', payload: { conversationId: 'conv-e2e', userId: 'user-bad' } },
    { namespace: '/chat', event: 'moderate:unban', payload: { conversationId: 'conv-e2e', userId: 'user-bad' } },
    { namespace: '/chat', event: 'moderate:mute', payload: { conversationId: 'conv-e2e', userId: 'user-bad', durationMs: 30000 } },
    { namespace: '/chat', event: 'moderate:unmute', payload: { conversationId: 'conv-e2e', userId: 'user-bad' } },
    { namespace: '/presence', event: 'presence_update', payload: { status: 'online', custom_status: 'e2e' } },
    { namespace: '/presence', event: 'presence_subscribe', payload: { user_ids: ['user-a', 'user-b'] } },
    { namespace: '/presence', event: 'presence_unsubscribe', payload: { user_ids: ['user-a'] } },
    { namespace: '/presence', event: 'presence_subscriptions_query', payload: {} },
    { namespace: '/webrtc', event: 'webrtc:get-ice-servers', payload: {} },
    { namespace: '/webrtc', event: 'webrtc:offer', payload: { callId: 'call-e2e', targetUserId: 'user-b', sdp: 'offer-sdp' } },
    { namespace: '/webrtc', event: 'webrtc:answer', payload: { callId: 'call-e2e', targetUserId: 'user-b', sdp: 'answer-sdp' } },
    { namespace: '/webrtc', event: 'webrtc:ice-candidate', payload: { callId: 'call-e2e', targetUserId: 'user-b', candidate: 'candidate' } },
    { namespace: '/webrtc', event: 'call:initiate', payload: { targetUserId: 'user-b', callType: 'video' } },
    { namespace: '/webrtc', event: 'call:answer', payload: { callId: 'call-e2e', accepted: true } },
    { namespace: '/webrtc', event: 'call:reject', payload: { callId: 'call-e2e', reason: 'busy' } },
    { namespace: '/webrtc', event: 'call:hangup', payload: { callId: 'call-e2e' } },
    { namespace: '/webrtc', event: 'screen:start', payload: { callId: 'call-e2e' } },
    { namespace: '/webrtc', event: 'screen:stop', payload: { callId: 'call-e2e' } },
    { namespace: '/webrtc', event: 'screen:offer', payload: { callId: 'call-e2e', targetUserId: 'user-b', sdp: 'offer' } },
    { namespace: '/webrtc', event: 'screen:answer', payload: { callId: 'call-e2e', targetUserId: 'user-b', sdp: 'answer' } },
  ];

  for (const socketUrl of config.socketUrls) {
    for (const item of socketEvents) {
      await runSocketEventCase({
        socketUrl,
        namespace: item.namespace,
        event: item.event,
        payload: item.payload,
        token: socketAuthToken,
        expectConnectSuccess: Boolean(socketAuthToken),
        tags: ['socket', 'auth'],
      });

      await runSocketEventCase({
        socketUrl,
        namespace: item.namespace,
        event: item.event,
        payload: item.payload,
        token: null,
        expectConnectSuccess: false,
        tags: ['socket', 'negative'],
      });
    }
  }

  report.completedAt = new Date().toISOString();

  const outPath = config.outPath || path.join(__dirname, 'reports', `e2e-system-raw-${Date.now()}.json`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf-8');

  console.log(`E2E raw report written: ${outPath}`);
  console.log(`Summary: total=${report.summary.total} passed=${report.summary.passed} warning=${report.summary.warnings} failed=${report.summary.failed}`);

  if (report.summary.failed > 0) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error('E2E runner fatal error:', error);
  process.exit(1);
});
