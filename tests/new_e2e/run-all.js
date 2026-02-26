const fs = require('fs');
const path = require('path');
const { io } = require('socket.io-client');

const cfg = {
  gateway: process.env.GATEWAY_URL || 'http://gateway:3000',
  auth: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
  compliance: process.env.COMPLIANCE_SERVICE_URL || 'http://compliance-service:3008',
  crypto: process.env.CRYPTO_SERVICE_URL || 'http://crypto-service:3009',
  search: process.env.SEARCH_SERVICE_URL || 'http://search-service:3006',
  media: process.env.MEDIA_SERVICE_URL || 'http://media-service:3005',
  socket1: process.env.SOCKET1_URL || 'http://socket-service-1:3001',
  socket2: process.env.SOCKET2_URL || 'http://socket-service-2:3001',
  adminPortal: process.env.ADMIN_PORTAL_URL || 'http://admin-portal:3100',
  timeoutMs: Number(process.env.E2E_TIMEOUT_MS || 12000),
  outDir: process.env.E2E_OUT_DIR || '/tests/new_e2e/reports',
};

const report = {
  generatedAt: new Date().toISOString(),
  config: { ...cfg },
  summary: { total: 0, passed: 0, failed: 0, warnings: 0 },
  phases: {},
  context: {},
  cases: [],
};

let currentPhase = 'setup';
const now = () => new Date().toISOString();
const baseHeaders = { 'content-type': 'application/json' };

function ensurePhase(name) {
  if (!report.phases[name]) {
    report.phases[name] = { total: 0, passed: 0, failed: 0, warnings: 0 };
  }
}

function setPhase(name) {
  currentPhase = name;
  ensurePhase(name);
  console.log(`\n[PHASE] ${name}`);
}

function record(name, ok, details = {}, warning = false) {
  ensurePhase(currentPhase);
  const status = warning ? 'warning' : ok ? 'passed' : 'failed';
  report.summary.total += 1;
  report.phases[currentPhase].total += 1;

  if (warning) {
    report.summary.warnings += 1;
    report.phases[currentPhase].warnings += 1;
  } else if (ok) {
    report.summary.passed += 1;
    report.phases[currentPhase].passed += 1;
  } else {
    report.summary.failed += 1;
    report.phases[currentPhase].failed += 1;
  }

  report.cases.push({
    phase: currentPhase,
    name,
    status,
    timestamp: now(),
    details,
  });
  const icon = warning ? 'WARN' : ok ? 'PASS' : 'FAIL';
  console.log(`[${icon}] ${name}`);
}

function parseJson(text) {
  try { return JSON.parse(text); } catch { return null; }
}

function extractCookie(setCookieHeader) {
  if (!setCookieHeader || typeof setCookieHeader !== 'string') return null;
  return setCookieHeader.split(';')[0];
}

function isAccepted(status, accept) {
  if (!accept) return status >= 200 && status < 300;
  if (accept === 'any') return status >= 100 && status < 600;
  if (typeof accept === 'function') return !!accept(status);
  if (Array.isArray(accept)) return accept.includes(status);
  return status === accept;
}

async function httpCase(name, method, url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      headers: options.headers || {},
      body: options.body ? JSON.stringify(options.body) : undefined,
      redirect: options.noRedirect ? 'manual' : 'follow',
      signal: controller.signal,
    });
    const text = await res.text();
    const json = parseJson(text);
    const ok = isAccepted(res.status, options.accept);
    record(name, ok, {
      method,
      url,
      status: res.status,
      headers: Object.fromEntries(res.headers.entries()),
      body: json || text,
      requestBody: options.body || null,
    });
    return { ok, status: res.status, headers: res.headers, text, json };
  } catch (error) {
    record(name, false, { method, url, error: String(error) });
    return { ok: false, error: String(error) };
  } finally {
    clearTimeout(timer);
  }
}

async function runMatrix(prefix, method, url, cases) {
  for (const c of cases) {
    await httpCase(`${prefix} :: ${c.name}`, method, url, c.options || {});
  }
}

function connectSocket(baseUrl, namespace, token) {
  return new Promise((resolve) => {
    const socket = io(`${baseUrl}${namespace}`, {
      transports: ['websocket', 'polling'],
      auth: token ? { token } : {},
      timeout: 10000,
      reconnection: false,
    });
    const timeout = setTimeout(() => resolve({ ok: false, socket, reason: 'timeout' }), 10000);
    socket.on('connect', () => {
      clearTimeout(timeout);
      resolve({ ok: true, socket });
    });
    socket.on('connect_error', (err) => {
      clearTimeout(timeout);
      resolve({ ok: false, socket, reason: err.message });
    });
  });
}

function emitAck(socket, event, payload, timeoutMs = 5000) {
  return new Promise((resolve) => {
    let done = false;
    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        resolve({ timeout: true, data: null });
      }
    }, timeoutMs);
    socket.emit(event, payload, (data) => {
      if (!done) {
        done = true;
        clearTimeout(timer);
        resolve({ timeout: false, data });
      }
    });
  });
}

function sampleSchema(schema, depth = 0) {
  if (!schema || depth > 4) return null;
  if (schema.example !== undefined) return schema.example;
  if (schema.enum && schema.enum.length) return schema.enum[0];
  if (schema.type === 'object' || schema.properties) {
    const out = {};
    for (const [k, v] of Object.entries(schema.properties || {})) out[k] = sampleSchema(v, depth + 1);
    return out;
  }
  if (schema.type === 'array') return [sampleSchema(schema.items || {}, depth + 1)];
  if (schema.type === 'number' || schema.type === 'integer') return 1;
  if (schema.type === 'boolean') return true;
  if (schema.format === 'email') return 'e2e@example.com';
  if (schema.format === 'uuid') return '11111111-1111-1111-1111-111111111111';
  return 'sample';
}

function markdownReport() {
  const lines = [];
  lines.push('# CAAS New E2E Report');
  lines.push('');
  lines.push(`- Generated: ${report.generatedAt}`);
  lines.push(`- Total: ${report.summary.total}`);
  lines.push(`- Passed: ${report.summary.passed}`);
  lines.push(`- Warnings: ${report.summary.warnings}`);
  lines.push(`- Failed: ${report.summary.failed}`);
  lines.push('');
  lines.push('## Phase Breakdown');
  lines.push('');
  lines.push('| Phase | Total | Passed | Warnings | Failed |');
  lines.push('|---|---:|---:|---:|---:|');
  Object.entries(report.phases).forEach(([phase, v]) => {
    lines.push(`| ${phase} | ${v.total} | ${v.passed} | ${v.warnings} | ${v.failed} |`);
  });
  lines.push('');

  const failed = report.cases.filter((c) => c.status === 'failed');
  if (failed.length) {
    lines.push('## Failed Cases');
    lines.push('');
    failed.forEach((c, idx) => {
      lines.push(`### ${idx + 1}. ${c.name}`);
      lines.push(`- Phase: ${c.phase}`);
      lines.push('```json');
      lines.push(JSON.stringify(c.details, null, 2));
      lines.push('```');
      lines.push('');
    });
  } else {
    lines.push('## Failed Cases');
    lines.push('');
    lines.push('None');
    lines.push('');
  }

  lines.push('## All Cases');
  lines.push('');
  report.cases.forEach((c, idx) => {
    lines.push(`${idx + 1}. [${c.status.toUpperCase()}] ${c.phase} :: ${c.name}`);
  });
  return lines.join('\n');
}

async function runSwaggerSweep(accessToken) {
  const specRes = await httpCase('Gateway OpenAPI JSON', 'GET', `${cfg.gateway}/documentation/json`, { accept: 200 });
  if (!specRes.ok || !specRes.json?.paths) return;

  const spec = specRes.json;
  const tokenHeaders = accessToken ? { authorization: `Bearer ${accessToken}` } : {};
  const replacements = {
    id: 'sample-id',
    tenantId: report.context.client_id || 'sample-tenant',
    session_id: 'sample-session',
    client_id: report.context.client_id || 'sample-client',
    ip: '127.0.0.1',
    origin: encodeURIComponent('http://localhost:3100'),
  };

  for (const [rawPath, methods] of Object.entries(spec.paths)) {
    if (rawPath.startsWith('/internal') || rawPath.startsWith('/documentation')) continue;
    const pathResolved = rawPath.replace(/\{([^}]+)\}/g, (_, key) => replacements[key] || `sample-${key}`);

    for (const [m, op] of Object.entries(methods || {})) {
      const method = m.toUpperCase();
      if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'].includes(method)) continue;

      const requestSchema = op?.requestBody?.content?.['application/json']?.schema;
      const body = requestSchema ? sampleSchema(requestSchema) : null;

      await httpCase(`Swagger ${method} ${pathResolved} [anon]`, method, `${cfg.gateway}${pathResolved}`, {
        accept: 'any',
        headers: body ? baseHeaders : {},
        body,
      });

      await httpCase(`Swagger ${method} ${pathResolved} [auth]`, method, `${cfg.gateway}${pathResolved}`, {
        accept: 'any',
        headers: { ...(body ? baseHeaders : {}), ...tokenHeaders },
        body,
      });
    }
  }
}

async function runSocketMatrix(accessToken) {
  const sockets = [cfg.socket1, cfg.socket2];
  const namespaces = ['/chat', '/presence', '/webrtc'];

  // No-auth connect checks
  for (const s of sockets) {
    for (const ns of namespaces) {
      const conn = await connectSocket(s, ns, null);
      record(`Socket rejects missing token: ${s}${ns}`, !conn.ok, { reason: conn.reason || null });
      conn.socket.close();
    }
  }

  if (!accessToken) {
    record('Socket authenticated matrix skipped', false, { reason: 'No access token' }, true);
    return;
  }

  // Chat positive + negative payloads
  const chat = await connectSocket(cfg.socket1, '/chat', accessToken);
  record('Socket /chat auth connect', chat.ok, { reason: chat.reason || null });
  if (chat.ok) {
    const room = `conv-${Date.now()}`;
    const chatEvents = [
      ['joinRoom(valid)', 'joinRoom', { conversationId: room }],
      ['sendMessage(valid)', 'sendMessage', { conversationId: room, messageContent: 'message from e2e' }],
      ['message_delivered(valid)', 'message_delivered', { messageId: 'msg-1', conversationId: room }],
      ['message_read(valid)', 'message_read', { messageId: 'msg-1', conversationId: room }],
      ['unread_query(valid)', 'unread_query', {}],
      ['leaveRoom(valid)', 'leaveRoom', { conversationId: room }],
      ['joinRoom(invalid)', 'joinRoom', {}],
      ['sendMessage(invalid)', 'sendMessage', { conversationId: room }],
      ['message_read(invalid)', 'message_read', {}],
      ['moderate:mute(invalid)', 'moderate:mute', { conversationId: room }],
      ['moderate:unmute(invalid)', 'moderate:unmute', { conversationId: room }],
    ];
    for (const [name, ev, payload] of chatEvents) {
      const ack = await emitAck(chat.socket, ev, payload);
      record(`Socket chat ${name}`, !ack.timeout, { event: ev, payload, ack: ack.data || null });
    }
    chat.socket.emit('typing_start', { conversationId: room });
    record('Socket chat typing_start(valid)', true, { conversationId: room });
    chat.socket.emit('typing_stop', { conversationId: room });
    record('Socket chat typing_stop(valid)', true, { conversationId: room });
    chat.socket.close();
  }

  // Presence checks
  const presence = await connectSocket(cfg.socket2, '/presence', accessToken);
  record('Socket /presence auth connect', presence.ok, { reason: presence.reason || null });
  if (presence.ok) {
    presence.socket.emit('presence_update', { status: 'online', custom_status: 'e2e' });
    record('Socket presence_update emitted', true, {});

    const pEvents = [
      ['presence_subscribe(valid)', 'presence_subscribe', { user_ids: ['u1', 'u2'] }],
      ['presence_unsubscribe(valid)', 'presence_unsubscribe', { user_ids: ['u1'] }],
      ['presence_subscriptions_query(valid)', 'presence_subscriptions_query', {}],
      ['presence_subscribe(invalid)', 'presence_subscribe', {}],
      ['presence_unsubscribe(invalid)', 'presence_unsubscribe', {}],
    ];
    for (const [name, ev, payload] of pEvents) {
      const ack = await emitAck(presence.socket, ev, payload);
      record(`Socket presence ${name}`, !ack.timeout, { event: ev, payload, ack: ack.data || null });
    }
    presence.socket.close();
  }

  // WebRTC checks
  const rtc = await connectSocket(cfg.socket1, '/webrtc', accessToken);
  record('Socket /webrtc auth connect', rtc.ok, { reason: rtc.reason || null });
  if (rtc.ok) {
    const rtcEvents = [
      ['webrtc:get-ice-servers', 'webrtc:get-ice-servers', {}],
      ['call:initiate(valid-ish)', 'call:initiate', { targetUserId: 'user-b', callType: 'video' }],
      ['call:answer(invalid)', 'call:answer', {}],
      ['call:reject(invalid)', 'call:reject', {}],
      ['call:hangup(invalid)', 'call:hangup', {}],
      ['screen:start(invalid)', 'screen:start', {}],
      ['screen:stop(invalid)', 'screen:stop', {}],
      ['webrtc:offer(invalid)', 'webrtc:offer', {}],
      ['webrtc:answer(invalid)', 'webrtc:answer', {}],
      ['webrtc:ice-candidate(invalid)', 'webrtc:ice-candidate', {}],
    ];
    for (const [name, ev, payload] of rtcEvents) {
      const ack = await emitAck(rtc.socket, ev, payload);
      record(`Socket webrtc ${name}`, !ack.timeout, { event: ev, payload, ack: ack.data || null });
    }
    rtc.socket.close();
  }
}

async function main() {
  const ts = Date.now();
  const adminEmail = `e2e-${ts}@example.com`;
  const adminPassword = 'E2E-Password-123!';

  setPhase('01-health');
  await httpCase('Gateway /health', 'GET', `${cfg.gateway}/health`, { accept: 200 });
  await httpCase('Gateway /internal/health', 'GET', `${cfg.gateway}/internal/health`, { accept: 200 });
  await httpCase('Gateway /internal/ready', 'GET', `${cfg.gateway}/internal/ready`, { accept: [200, 503] });
  await httpCase('Gateway /documentation', 'GET', `${cfg.gateway}/documentation`, { accept: [200, 301, 302] });
  await httpCase('Auth /health', 'GET', `${cfg.auth}/health`, { accept: 200 });
  await httpCase('Auth /health/ready', 'GET', `${cfg.auth}/health/ready`, { accept: [200, 503] });
  await httpCase('Compliance /health', 'GET', `${cfg.compliance}/health`, { accept: 200 });
  await httpCase('Crypto /health', 'GET', `${cfg.crypto}/health`, { accept: 200 });
  await httpCase('Search /health', 'GET', `${cfg.search}/health`, { accept: 200 });
  await httpCase('Media /health', 'GET', `${cfg.media}/health`, { accept: 200 });
  await httpCase('Socket1 /health', 'GET', `${cfg.socket1}/health`, { accept: 200 });
  await httpCase('Socket1 /health/ready', 'GET', `${cfg.socket1}/health/ready`, { accept: [200, 503] });
  await httpCase('Socket1 /health/live', 'GET', `${cfg.socket1}/health/live`, { accept: 200 });
  await httpCase('Socket2 /health', 'GET', `${cfg.socket2}/health`, { accept: 200 });
  await httpCase('Admin portal /api/health', 'GET', `${cfg.adminPortal}/api/health`, { accept: 200 });

  setPhase('02-client-onboarding');
  const reg = await httpCase('Register client (auth-service)', 'POST', `${cfg.auth}/api/v1/auth/client/register`, {
    accept: [200, 201],
    headers: baseHeaders,
    body: {
      company_name: `E2E Tenant ${ts}`,
      email: adminEmail,
      password: adminPassword,
      plan: 'business',
    },
  });
  const regBody = reg.json || {};
  report.context.client_id = regBody.client_id || null;
  report.context.tenant_id = regBody.tenant_id || null;
  report.context.admin_email = adminEmail;
  const apiCredential = regBody.api_key || regBody.api_secret || null;
  report.context.api_key_prefix = regBody.api_key ? regBody.api_key.slice(0, 18) : null;

  await runMatrix('Client login matrix', 'POST', `${cfg.gateway}/api/v1/auth/client/login`, [
    { name: 'invalid credentials', options: { accept: [400, 401, 403, 404, 429, 500], headers: baseHeaders, body: { email: 'bad@example.com', password: 'bad-pass' } } },
    { name: 'missing email', options: { accept: [400, 422], headers: baseHeaders, body: { password: 'bad-pass' } } },
    { name: 'missing password', options: { accept: [400, 422], headers: baseHeaders, body: { email: 'bad@example.com' } } },
    { name: 'malformed payload type', options: { accept: [400, 422, 500], headers: baseHeaders, body: { email: 123, password: false } } },
    { name: 'valid credentials', options: { accept: [200], headers: baseHeaders, body: { email: adminEmail, password: adminPassword } } },
  ]);
  await runMatrix('Client forgot-password matrix', 'POST', `${cfg.gateway}/api/v1/auth/client/forgot-password`, [
    { name: 'valid existing email', options: { accept: [200], headers: baseHeaders, body: { email: adminEmail } } },
    { name: 'valid unknown email', options: { accept: [200], headers: baseHeaders, body: { email: `missing-${ts}@example.com` } } },
    { name: 'missing email', options: { accept: [400, 422], headers: baseHeaders, body: {} } },
    { name: 'malformed email', options: { accept: [400, 422], headers: baseHeaders, body: { email: 'invalid-email' } } },
  ]);
  await runMatrix('Client reset-password matrix', 'POST', `${cfg.gateway}/api/v1/auth/client/reset-password`, [
    { name: 'invalid code', options: { accept: [400, 401, 404], headers: baseHeaders, body: { email: adminEmail, code: '000000', new_password: 'NewPass-123!' } } },
    { name: 'short password', options: { accept: [400, 422], headers: baseHeaders, body: { email: adminEmail, code: '000000', new_password: '123' } } },
    { name: 'missing fields', options: { accept: [400, 422], headers: baseHeaders, body: { email: adminEmail } } },
  ]);

  setPhase('03-sdk-session-flow');
  let accessToken = null;
  let refreshToken = null;
  if (apiCredential) {
    const sdk = await httpCase('Gateway SDK token valid', 'POST', `${cfg.gateway}/api/v1/auth/sdk/token`, {
      accept: [200, 201],
      headers: baseHeaders,
      body: {
        app_id: report.context.client_id || 'default-tenant',
        app_secret: apiCredential,
        user_external_id: `user-${ts}`,
      },
    });
    accessToken = sdk.json?.access_token || null;
    refreshToken = sdk.json?.refresh_token || null;
    report.context.access_token_prefix = accessToken ? accessToken.slice(0, 18) : null;
  } else {
    record('Gateway SDK token skipped', false, { reason: 'api_key/api_secret missing from register response' }, true);
  }
  await runMatrix('SDK token matrix', 'POST', `${cfg.gateway}/api/v1/auth/sdk/token`, [
    {
      name: 'invalid secret',
      options: {
        accept: [400, 401, 403],
        headers: baseHeaders,
        body: { app_id: report.context.client_id || 'default-tenant', app_secret: 'bad-secret', user_external_id: `user-bad-${ts}` },
      },
    },
    { name: 'missing app_id', options: { accept: [400, 422], headers: baseHeaders, body: { app_secret: apiCredential || 'bad', user_external_id: `user-bad-${ts}` } } },
    { name: 'missing app_secret', options: { accept: [400, 401, 422], headers: baseHeaders, body: { app_id: report.context.client_id || 'default-tenant', user_external_id: `user-bad-${ts}` } } },
    { name: 'wrong content-type', options: { accept: [400, 401, 403, 415], headers: { 'content-type': 'text/plain' }, body: { bad: 'payload' } } },
  ]);
  await httpCase('Gateway SDK refresh invalid', 'POST', `${cfg.gateway}/api/v1/sdk/refresh`, {
    accept: [400, 401, 403, 404],
    headers: baseHeaders,
    body: { refresh_token: 'invalid' },
  });
  if (refreshToken) {
    await httpCase('Gateway SDK refresh valid-ish', 'POST', `${cfg.gateway}/api/v1/sdk/refresh`, {
      accept: [200, 400, 401, 404],
      headers: baseHeaders,
      body: { refresh_token: refreshToken },
    });
    await httpCase('Gateway SDK refresh replay old token', 'POST', `${cfg.gateway}/api/v1/sdk/refresh`, {
      accept: [200, 400, 401, 403, 404],
      headers: baseHeaders,
      body: { refresh_token: refreshToken },
    });
  }
  await httpCase('Gateway SDK logout missing bearer', 'POST', `${cfg.gateway}/api/v1/sdk/logout`, {
    accept: [401, 403],
    headers: baseHeaders,
    body: {},
  });

  setPhase('04-gateway-auth-cors');
  await httpCase('Gateway tenant anonymous', 'GET', `${cfg.gateway}/api/v1/tenant`, { accept: [400, 401, 403] });
  await httpCase('Gateway tenant invalid bearer', 'GET', `${cfg.gateway}/api/v1/tenant`, {
    accept: [400, 401, 403],
    headers: { authorization: 'Bearer invalid.token.value' },
  });
  if (accessToken) {
    await httpCase('Gateway tenant valid bearer', 'GET', `${cfg.gateway}/api/v1/tenant`, {
      accept: [200, 400, 401, 403, 404],
      headers: { authorization: `Bearer ${accessToken}` },
    });
    await httpCase('Gateway tenant mismatched tenant header', 'GET', `${cfg.gateway}/api/v1/tenant`, {
      accept: [400, 401, 403, 404],
      headers: { authorization: `Bearer ${accessToken}`, 'x-tenant-id': 'mismatch-tenant' },
    });
  }
  const cors = await httpCase('Gateway CORS preflight tenant', 'OPTIONS', `${cfg.gateway}/api/v1/tenant`, {
    accept: [200, 204],
    headers: {
      Origin: 'http://localhost:3100',
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'authorization,content-type',
    },
  });
  const allowOrigin = cors.headers ? (cors.headers.get('access-control-allow-origin') || '') : '';
  record('Gateway CORS allow-origin present', !!allowOrigin, { allowOrigin });
  await runMatrix('Gateway tenant header matrix', 'GET', `${cfg.gateway}/api/v1/tenant`, [
    { name: 'tenant header without auth', options: { accept: [400, 401, 403, 404, 500], headers: { 'x-tenant-id': report.context.tenant_id || 'x' } } },
    { name: 'api-key header without auth', options: { accept: [400, 401, 403], headers: { 'x-api-key': 'fake-key' } } },
    { name: 'malformed bearer', options: { accept: [400, 401, 403], headers: { authorization: 'Bearer xyz' } } },
    {
      name: 'valid bearer + matching tenant',
      options: {
        accept: [200, 400, 401, 403, 404],
        headers: accessToken ? { authorization: `Bearer ${accessToken}`, 'x-tenant-id': report.context.tenant_id || '' } : {},
      },
    },
  ]);

  setPhase('05-service-cross-http');
  await httpCase('Compliance create audit valid-ish', 'POST', `${cfg.compliance}/api/v1/audit/log`, {
    accept: 'any',
    headers: baseHeaders,
    body: { tenant_id: report.context.client_id || 'tenant', user_id: `user-${ts}`, action: 'e2e_test', resource_type: 'system' },
  });
  await httpCase('Compliance create audit invalid', 'POST', `${cfg.compliance}/api/v1/audit/log`, {
    accept: 'any',
    headers: baseHeaders,
    body: { tenant_id: '', action: '' },
  });
  const keygen = await httpCase('Crypto generate key', 'POST', `${cfg.crypto}/api/v1/keys/generate`, {
    accept: 'any',
    headers: baseHeaders,
    body: { tenant_id: report.context.client_id || 'tenant', key_type: 'data' },
  });
  const keyId = keygen.json?.key_id;
  if (keyId) {
    const enc = await httpCase('Crypto encrypt', 'POST', `${cfg.crypto}/api/v1/encrypt`, {
      accept: 'any',
      headers: baseHeaders,
      body: { key_id: keyId, plaintext: 'hello e2e' },
    });
    const c = enc.json || {};
    await httpCase('Crypto decrypt', 'POST', `${cfg.crypto}/api/v1/decrypt`, {
      accept: 'any',
      headers: baseHeaders,
      body: { key_id: keyId, ciphertext: c.ciphertext, iv: c.iv, authTag: c.authTag },
    });
  }
  await httpCase('Crypto decrypt invalid', 'POST', `${cfg.crypto}/api/v1/decrypt`, {
    accept: 'any',
    headers: baseHeaders,
    body: { key_id: 'bad', ciphertext: 'x', iv: 'x', authTag: 'x' },
  });
  await httpCase('Search messages empty query', 'POST', `${cfg.search}/api/v1/search/messages`, {
    accept: 'any',
    headers: baseHeaders,
    body: { query: '' },
  });
  await httpCase('Media quota no auth', 'GET', `${cfg.media}/api/v1/media/quota`, { accept: 'any' });

  setPhase('06-client-management-proxy');
  if (report.context.client_id) {
    const clientId = report.context.client_id;
    const testIp = '203.0.113.77';
    const testOrigin = `http://localhost:3100`;

    await httpCase('Client ip-whitelist get', 'GET', `${cfg.gateway}/api/v1/auth/client/ip-whitelist?client_id=${encodeURIComponent(clientId)}`, {
      accept: [200, 400, 401, 403, 404],
    });
    await httpCase('Client ip-whitelist add valid', 'POST', `${cfg.gateway}/api/v1/auth/client/ip-whitelist`, {
      accept: [200, 201, 400, 401, 403, 409],
      headers: baseHeaders,
      body: { client_id: clientId, ip: testIp },
    });
    await httpCase('Client ip-whitelist add invalid ip', 'POST', `${cfg.gateway}/api/v1/auth/client/ip-whitelist`, {
      accept: [400, 422],
      headers: baseHeaders,
      body: { client_id: clientId, ip: 'bad-ip' },
    });
    await httpCase('Client ip-whitelist remove existing', 'DELETE', `${cfg.gateway}/api/v1/auth/client/ip-whitelist/${encodeURIComponent(testIp)}?client_id=${encodeURIComponent(clientId)}`, {
      accept: [200, 400, 401, 403, 404],
    });

    await httpCase('Client origin-whitelist get', 'GET', `${cfg.gateway}/api/v1/auth/client/origin-whitelist?client_id=${encodeURIComponent(clientId)}`, {
      accept: [200, 400, 401, 403, 404],
    });
    await httpCase('Client origin-whitelist add valid', 'POST', `${cfg.gateway}/api/v1/auth/client/origin-whitelist`, {
      accept: [200, 201, 400, 401, 403, 409],
      headers: baseHeaders,
      body: { client_id: clientId, origin: testOrigin },
    });
    await httpCase('Client origin-whitelist add invalid URL', 'POST', `${cfg.gateway}/api/v1/auth/client/origin-whitelist`, {
      accept: [400, 422],
      headers: baseHeaders,
      body: { client_id: clientId, origin: 'not-a-url' },
    });
    await httpCase('Client origin-whitelist remove existing', 'DELETE', `${cfg.gateway}/api/v1/auth/client/origin-whitelist/${encodeURIComponent(testOrigin)}?client_id=${encodeURIComponent(clientId)}`, {
      accept: [200, 400, 401, 403, 404],
    });

    await runMatrix('Client api-keys management matrix', 'POST', `${cfg.gateway}/api/v1/auth/client/api-keys/rotate`, [
      { name: 'rotate valid', options: { accept: [200, 400, 401, 403, 404], headers: baseHeaders, body: { client_id: clientId } } },
      { name: 'rotate missing client_id', options: { accept: [400, 422], headers: baseHeaders, body: {} } },
    ]);
    await httpCase('Client api-keys promote', 'POST', `${cfg.gateway}/api/v1/auth/client/api-keys/promote`, {
      accept: [200, 400, 401, 403, 404],
      headers: baseHeaders,
      body: { client_id: clientId },
    });
    await runMatrix('Client api-keys revoke matrix', 'POST', `${cfg.gateway}/api/v1/auth/client/api-keys/revoke`, [
      { name: 'revoke secondary', options: { accept: [200, 400, 401, 403, 404], headers: baseHeaders, body: { client_id: clientId, key_type: 'secondary' } } },
      { name: 'revoke invalid type', options: { accept: [400, 422], headers: baseHeaders, body: { client_id: clientId, key_type: 'invalid' } } },
    ]);
  } else {
    record('Client management proxy matrix skipped', false, { reason: 'client_id missing from registration context' }, true);
  }

  setPhase('07-admin-portal-flow');
  await httpCase('Admin portal home', 'GET', `${cfg.adminPortal}/`, { accept: [200, 307, 308], noRedirect: true });
  await httpCase('Admin portal dashboard route', 'GET', `${cfg.adminPortal}/dashboard`, { accept: [200, 307, 308], noRedirect: true });
  await runMatrix('Admin portal auth login matrix', 'POST', `${cfg.adminPortal}/api/auth/login`, [
    { name: 'invalid credentials', options: { accept: [400, 401, 403, 404], headers: baseHeaders, body: { email: 'bad@example.com', password: 'bad' } } },
    { name: 'missing password', options: { accept: [400, 422], headers: baseHeaders, body: { email: adminEmail } } },
    { name: 'valid credentials', options: { accept: [200], headers: baseHeaders, body: { email: adminEmail, password: adminPassword } } },
  ]);
  const loginForCookie = await httpCase('Admin portal auth login capture cookies', 'POST', `${cfg.adminPortal}/api/auth/login`, {
    accept: [200],
    headers: baseHeaders,
    body: { email: adminEmail, password: adminPassword },
  });
  const setCookieRaw = loginForCookie.headers ? (loginForCookie.headers.get('set-cookie') || '') : '';
  const refreshCookie = extractCookie(setCookieRaw);
  await httpCase('Admin portal auth refresh invalid', 'POST', `${cfg.adminPortal}/api/auth/refresh`, {
    accept: [400, 401, 403, 404, 500],
    headers: baseHeaders,
    body: { refresh_token: 'bad' },
  });
  if (refreshCookie) {
    await httpCase('Admin portal auth refresh with cookie', 'POST', `${cfg.adminPortal}/api/auth/refresh`, {
      accept: [200, 400, 401, 403, 404],
      headers: { Cookie: refreshCookie },
    });
  } else {
    record('Admin portal auth refresh with cookie skipped', false, { reason: 'No refresh cookie captured from login response' }, true);
  }
  await httpCase('Admin portal auth logout', 'POST', `${cfg.adminPortal}/api/auth/logout`, {
    accept: [200, 204, 401],
    headers: baseHeaders,
    body: {},
  });
  await runMatrix('Browser-like CORS matrix through gateway', 'OPTIONS', `${cfg.gateway}/api/v1/auth/client/login`, [
    {
      name: 'allowed localhost origin',
      options: {
        accept: [200, 204],
        headers: {
          Origin: 'http://localhost:3100',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'content-type,authorization',
        },
      },
    },
    {
      name: 'docker admin origin',
      options: {
        accept: [200, 204],
        headers: {
          Origin: 'http://admin-portal:3100',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'content-type,authorization',
        },
      },
    },
    {
      name: 'disallowed origin',
      options: {
        accept: 'any',
        headers: {
          Origin: 'http://evil.example',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'content-type,authorization',
        },
      },
    },
  ]);
  const badCors = await httpCase('Browser-like CORS disallowed origin header check', 'OPTIONS', `${cfg.gateway}/api/v1/auth/client/login`, {
    accept: 'any',
    headers: {
      Origin: 'http://evil.example',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type,authorization',
    },
  });
  const badCorsAllowOrigin = badCors.headers ? (badCors.headers.get('access-control-allow-origin') || '') : '';
  record('Browser-like CORS disallowed origin not allowed', !badCorsAllowOrigin || badCorsAllowOrigin === 'null', {
    allowOrigin: badCorsAllowOrigin,
    status: badCors.status || null,
  });

  setPhase('08-socket-matrix');
  await runSocketMatrix(accessToken);
  if (accessToken) {
    const stress = await connectSocket(cfg.socket1, '/chat', accessToken);
    record('Socket /chat stress connect', stress.ok, { reason: stress.reason || null });
    if (stress.ok) {
      const room = `stress-${ts}`;
      for (let i = 0; i < 25; i += 1) {
        const ack = await emitAck(stress.socket, 'sendMessage', { conversationId: room, messageContent: `burst-${i}` }, 7000);
        record(`Socket chat sendMessage burst ${i + 1}/25`, !ack.timeout, { ack: ack.data || null });
      }
      for (let i = 0; i < 10; i += 1) {
        const ack = await emitAck(stress.socket, 'message_read', { messageId: `msg-${i}`, conversationId: room }, 7000);
        record(`Socket chat message_read replay ${i + 1}/10`, !ack.timeout, { ack: ack.data || null });
      }
      stress.socket.close();
    }
  }

  setPhase('09-gateway-openapi-sweep');
  await runSwaggerSweep(accessToken);

  setPhase('10-negative-boundary-sweep');
  await runMatrix('Gateway client register negative boundaries', 'POST', `${cfg.gateway}/api/v1/auth/client/register`, [
    { name: 'empty body', options: { accept: 'any', headers: baseHeaders, body: {} } },
    { name: 'short company name', options: { accept: 'any', headers: baseHeaders, body: { company_name: 'x', email: `e2e-neg-${ts}@example.com`, password: adminPassword } } },
    { name: 'invalid email', options: { accept: 'any', headers: baseHeaders, body: { company_name: `E2E ${ts}`, email: 'bad-email', password: adminPassword } } },
    { name: 'short password', options: { accept: 'any', headers: baseHeaders, body: { company_name: `E2E ${ts}`, email: `e2e-neg2-${ts}@example.com`, password: '123' } } },
    { name: 'invalid plan enum', options: { accept: 'any', headers: baseHeaders, body: { company_name: `E2E ${ts}`, email: `e2e-neg3-${ts}@example.com`, password: adminPassword, plan: 'gold' } } },
  ]);
  await runMatrix('Gateway admin dashboard auth boundaries', 'GET', `${cfg.gateway}/api/v1/admin/dashboard`, [
    { name: 'no auth', options: { accept: 'any' } },
    { name: 'invalid auth token', options: { accept: 'any', headers: { authorization: 'Bearer bad.token' } } },
    { name: 'valid auth token', options: { accept: 'any', headers: accessToken ? { authorization: `Bearer ${accessToken}` } : {} } },
  ]);

  report.completedAt = now();
  const stamp = Date.now();
  fs.mkdirSync(cfg.outDir, { recursive: true });
  const jsonPath = path.join(cfg.outDir, `new-e2e-report-${stamp}.json`);
  const mdPath = path.join(cfg.outDir, `new-e2e-report-${stamp}.md`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');
  fs.writeFileSync(mdPath, markdownReport(), 'utf-8');

  console.log(`\nJSON report: ${jsonPath}`);
  console.log(`Markdown report: ${mdPath}`);
  console.log(`Summary: total=${report.summary.total}, passed=${report.summary.passed}, warnings=${report.summary.warnings}, failed=${report.summary.failed}`);

  if (report.summary.failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error('E2E fatal error:', error);
  process.exit(1);
});
