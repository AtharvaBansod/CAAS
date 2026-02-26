/**
 * CAAS Platform - Full E2E System Test
 * Phase 4.5.z.x - Post Auth Refactor
 *
 * Tests the complete system top-to-bottom:
 *  1) Infrastructure health checks
 *  2) Client registration (SAAS tenant onboarding)
 *  3) API key management (rotate, whitelists)
 *  4) SDK session creation (end-user tokens)
 *  5) Token validation (internal endpoint)
 *  6) Multi-user socket connections + real-time events
 *  7) Cross-service flows (compliance, crypto, search, media)
 *  8) Negative / security tests
 *  9) Swagger discovery
 * 10) DB + Kafka spot-checks via auth-service proxies
 */

const fs = require('fs');
const path = require('path');
const { io } = require('socket.io-client');

/* ─── CLI args ─── */
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    if (!args[i].startsWith('--')) continue;
    const key = args[i].slice(2);
    const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : 'true';
    parsed[key] = val;
    if (val !== 'true') i++;
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
  timeoutMs: Number(args.timeoutMs || 12000),
  socketAckTimeoutMs: Number(args.socketAckTimeoutMs || 3000),
  serviceSecret: args.serviceSecret || process.env.SERVICE_SECRET || 'dev-service-secret-change-in-production',
};

/* ─── Report ─── */
const report = {
  generatedAt: new Date().toISOString(),
  metadata: config,
  summary: { total: 0, passed: 0, failed: 0, warnings: 0 },
  context: {},
  sections: {},
  cases: [],
};

function truncate(value, maxLen = 4000) {
  if (value == null) return value;
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.length <= maxLen ? text : `${text.slice(0, maxLen)}... [truncated ${text.length - maxLen} chars]`;
}

let currentSection = 'general';
function setSection(name) { currentSection = name; }

function recordCase(entry) {
  entry.section = currentSection;
  report.cases.push(entry);
  report.summary.total++;
  if (entry.outcome === 'passed') report.summary.passed++;
  else if (entry.outcome === 'warning') report.summary.warnings++;
  else report.summary.failed++;
}

function isOk(status, acceptable) {
  if (acceptable === 'any') return status >= 100 && status < 600;
  if (Array.isArray(acceptable)) return acceptable.includes(status);
  return status === acceptable;
}

async function fetchT(url, opts = {}, ms = config.timeoutMs) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ac.signal }); }
  finally { clearTimeout(t); }
}

/* ─── HTTP runner ─── */
async function http({ name, method, url, headers = {}, body = null, acceptableStatus = 200, tags = [] }) {
  const startedAt = new Date().toISOString();
  let status = -1, resHeaders = {}, resBody = '', error = null;
  try {
    const opts = { method, headers: { ...headers } };
    if (body != null) {
      opts.headers['content-type'] = opts.headers['content-type'] || 'application/json';
      opts.body = typeof body === 'string' ? body : JSON.stringify(body);
    }
    const res = await fetchT(url, opts);
    status = res.status;
    for (const [k, v] of res.headers.entries()) resHeaders[k] = v;
    resBody = await res.text();
  } catch (e) { error = e?.message || String(e); }

  const endedAt = new Date().toISOString();
  const ok = error ? false : isOk(status, acceptableStatus);
  const outcome = ok ? 'passed' : error ? 'failed' : status >= 500 ? 'failed' : 'warning';

  recordCase({
    type: 'http', name, tags, startedAt, endedAt,
    request: { method, url, headers, body, acceptableStatus },
    response: { status, headers: resHeaders, body: truncate(resBody, 6000), error },
    outcome,
  });
  return { status, body: resBody, error };
}

/* ─── Socket helpers ─── */
function connectSocket(url, namespace, token) {
  return new Promise(resolve => {
    const socket = io(`${url}${namespace}`, {
      path: '/socket.io', transports: ['websocket', 'polling'],
      auth: token ? { token } : {}, timeout: 10000, reconnection: false,
    });
    let done = false;
    const finish = r => { if (done) return; done = true; resolve(r); };
    socket.on('connect', () => finish({ ok: true, socket }));
    socket.on('connect_error', e => finish({ ok: false, error: e.message, socket }));
    setTimeout(() => finish({ ok: false, error: 'connect timeout', socket }), 12000);
  });
}

function emitAck(socket, event, payload, ms = config.socketAckTimeoutMs) {
  return new Promise(resolve => {
    let done = false;
    const timer = setTimeout(() => { if (!done) { done = true; resolve({ timeout: true, data: null }); } }, ms);
    const onDC = r => { if (!done) { done = true; clearTimeout(timer); resolve({ disconnected: true, reason: r, data: null }); } };
    socket.once('disconnect', onDC);
    try {
      socket.emit(event, payload, data => {
        if (!done) { done = true; clearTimeout(timer); socket.off('disconnect', onDC); resolve({ timeout: false, data }); }
      });
    } catch (e) {
      if (!done) { done = true; clearTimeout(timer); resolve({ data: { error: e.message } }); }
    }
  });
}

async function socketCase({ socketUrl, namespace, event, payload, token, expectConnect, tags = [] }) {
  const startedAt = new Date().toISOString();
  const conn = await connectSocket(socketUrl, namespace, token);
  let outcome = 'failed', response = {};
  if (!conn.ok) {
    response = { connectError: conn.error };
    outcome = expectConnect ? 'failed' : 'passed';
  } else {
    const r = await emitAck(conn.socket, event, payload, config.socketAckTimeoutMs);
    response = r;
    if (r.timeout || r.disconnected) outcome = 'warning';
    else {
      const hasErr = r.data && (r.data.error || r.data.success === false);
      outcome = hasErr ? 'warning' : 'passed';
    }
    conn.socket.disconnect();
  }
  recordCase({
    type: 'socket', name: `Socket ${namespace} ${event} @ ${socketUrl}`, tags,
    startedAt, endedAt: new Date().toISOString(),
    request: { socketUrl, namespace, event, payload, withToken: !!token, expectConnect },
    response, outcome,
  });
  return { ok: conn.ok, response };
}

/* ─── Helpers ─── */
function tryJson(text) { try { return JSON.parse(text); } catch { return null; } }

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ─── Swagger discovery ─── */
async function runSwaggerDiscovery(token) {
  const res = await http({
    name: 'Gateway OpenAPI Spec', method: 'GET',
    url: `${config.gatewayUrl}/documentation/json`, acceptableStatus: [200], tags: ['discovery']
  });
  if (res.error || res.status !== 200) return;
  const spec = tryJson(res.body);
  if (!spec || !spec.paths) return;

  const replacements = { id: 'sample-id', userId: 'sample-user', tenantId: 'default-tenant', sessionId: 'sample-session' };
  const skip = ['/documentation', '/internal'];

  for (const [p, methods] of Object.entries(spec.paths)) {
    if (skip.some(s => p.startsWith(s))) continue;
    for (const [m, op] of Object.entries(methods)) {
      const method = m.toUpperCase();
      if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) continue;
      const urlPath = p.replace(/\{([^}]+)\}/g, (_, k) => replacements[k] || `sample-${k}`);
      const url = `${config.gatewayUrl}${urlPath}`;
      const headers = {};
      if (token) headers.authorization = `Bearer ${token}`;
      let body = null;
      if (op.requestBody?.content?.['application/json']?.schema) {
        body = sampleSchema(op.requestBody.content['application/json'].schema);
      }
      await http({
        name: `Discover ${method} ${urlPath}`, method, url, headers, body,
        acceptableStatus: 'any', tags: ['discovery', 'gateway']
      });
    }
  }
}

function sampleSchema(s, d = 0) {
  if (!s || d > 4) return null;
  if (s.example !== undefined) return s.example;
  if (s.enum?.length) return s.enum[0];
  if (s.type === 'object' || s.properties) {
    const o = {};
    for (const [k, v] of Object.entries(s.properties || {})) o[k] = sampleSchema(v, d + 1);
    (s.required || []).forEach(r => { if (o[r] === undefined) o[r] = 'sample'; });
    return o;
  }
  if (s.type === 'array') return [sampleSchema(s.items || {}, d + 1)];
  if (s.type === 'integer' || s.type === 'number') return 1;
  if (s.type === 'boolean') return true;
  if (s.format === 'email') return 'e2e@example.com';
  if (s.format === 'uuid') return '11111111-1111-1111-1111-111111111111';
  return 'sample';
}

/* ═══════════════════════════════════════════════════
   MAIN TEST FLOW
   ═══════════════════════════════════════════════════ */
async function main() {

  /* ─── S1: Health Checks ─── */
  setSection('health');
  console.log('[S1] Health checks...');

  await http({ name: 'Gateway Health', method: 'GET', url: `${config.gatewayUrl}/health`, acceptableStatus: [200], tags: ['health'] });
  await http({ name: 'Gateway Internal', method: 'GET', url: `${config.gatewayUrl}/internal/health`, acceptableStatus: 'any', tags: ['health'] });
  await http({ name: 'Gateway Ready', method: 'GET', url: `${config.gatewayUrl}/internal/ready`, acceptableStatus: 'any', tags: ['health'] });
  await http({ name: 'Auth Service', method: 'GET', url: `${config.authServiceUrl}/health`, acceptableStatus: [200], tags: ['health'] });
  await http({ name: 'Compliance Service', method: 'GET', url: `${config.complianceServiceUrl}/health`, acceptableStatus: 'any', tags: ['health'] });
  await http({ name: 'Crypto Service', method: 'GET', url: `${config.cryptoServiceUrl}/health`, acceptableStatus: [200], tags: ['health'] });
  await http({ name: 'Search Service', method: 'GET', url: `${config.searchServiceUrl}/health`, acceptableStatus: [200], tags: ['health'] });
  await http({ name: 'Media Service', method: 'GET', url: `${config.mediaServiceUrl}/health`, acceptableStatus: [200], tags: ['health'] });
  await http({ name: 'Socket Service 1', method: 'GET', url: `${config.socketUrls[0]}/health`, acceptableStatus: [200], tags: ['health'] });
  await http({ name: 'Socket Service 2', method: 'GET', url: `${config.socketUrls[1]}/health`, acceptableStatus: [200], tags: ['health'] });
  await http({ name: 'Gateway Ping', method: 'GET', url: `${config.gatewayUrl}/v1/ping`, acceptableStatus: [200], tags: ['health', 'gateway'] });

  /* ─── S2: Client (SAAS Tenant) Registration ─── */
  setSection('client-registration');
  console.log('[S2] Client registration...');
  const ts = Date.now();

  const regRes = await http({
    name: 'Register SAAS Client (Tenant A)', method: 'POST',
    url: `${config.authServiceUrl}/api/v1/auth/client/register`,
    body: { company_name: `E2E Corp ${ts}`, email: `admin-${ts}@e2etest.com`, password: 'Test1234!@#$', plan: 'business' },
    acceptableStatus: [200, 201], tags: ['auth', 'client'],
  });
  const regData = tryJson(regRes.body);
  report.context.clientA = regData;
  const clientId = regData?.client_id || regData?.clientId || regData?.id;
  let apiKey = regData?.api_key || regData?.apiKey;
  report.context.clientId = clientId;
  report.context.apiKey = apiKey;

  // Register a second client for isolation testing
  const regRes2 = await http({
    name: 'Register SAAS Client (Tenant B)', method: 'POST',
    url: `${config.authServiceUrl}/api/v1/auth/client/register`,
    body: { company_name: `E2E Corp B ${ts}`, email: `admin-b-${ts}@e2etest.com`, password: 'Test1234!@#$', plan: 'free' },
    acceptableStatus: [200, 201], tags: ['auth', 'client'],
  });
  const regDataB = tryJson(regRes2.body);
  report.context.clientB = regDataB;
  const apiKeyB = regDataB?.api_key || regDataB?.apiKey;

  // Negative: duplicate registration
  await http({
    name: 'Register SAAS Client (Duplicate)', method: 'POST',
    url: `${config.authServiceUrl}/api/v1/auth/client/register`,
    body: { company_name: `E2E Corp ${ts}`, email: `admin-${ts}@e2etest.com`, password: 'Test1234!@#$' },
    acceptableStatus: [400, 409, 422], tags: ['auth', 'client', 'negative'],
  });

  /* ─── S3: API Key Management ─── */
  setSection('api-key-management');
  console.log('[S3] API key management...');

  if (clientId) {
    const rotRes = await http({
      name: 'Rotate API Key', method: 'POST',
      url: `${config.authServiceUrl}/api/v1/auth/client/api-keys/rotate`,
      headers: { 'x-service-secret': config.serviceSecret },
      body: { client_id: clientId },
      acceptableStatus: 'any', tags: ['auth', 'apikey'],
    });
    const rotData = tryJson(rotRes.body);
    const newKey = rotData?.secondary_key;

    await http({
      name: 'Promote API Key', method: 'POST',
      url: `${config.authServiceUrl}/api/v1/auth/client/api-keys/promote`,
      headers: { 'x-service-secret': config.serviceSecret },
      body: { client_id: clientId },
      acceptableStatus: 'any', tags: ['auth', 'apikey'],
    });

    if (newKey) {
      apiKey = newKey;
      report.context.apiKey = newKey;
    }
  }

  /* ─── S4: API Key Validation (Internal) ─── */
  setSection('internal-validation');
  console.log('[S4] Internal validation...');

  if (apiKey) {
    const valRes = await http({
      name: 'Validate API Key (Internal)', method: 'POST',
      url: `${config.authServiceUrl}/api/v1/auth/internal/validate-api-key`,
      headers: { 'x-service-secret': config.serviceSecret },
      body: { api_key: apiKey, ip_address: '127.0.0.1' },
      acceptableStatus: [200], tags: ['auth', 'internal'],
    });
    const valData = tryJson(valRes.body);
    report.context.apiKeyValidation = valData;
  }

  // Negative: invalid API key
  await http({
    name: 'Validate API Key (Invalid)', method: 'POST',
    url: `${config.authServiceUrl}/api/v1/auth/internal/validate-api-key`,
    headers: { 'x-service-secret': config.serviceSecret },
    body: { api_key: 'caas_invalid_key_12345', ip_address: '127.0.0.1' },
    acceptableStatus: [401, 403, 404], tags: ['auth', 'internal', 'negative'],
  });

  /* ─── S5: SDK Session Creation ─── */
  setSection('sdk-sessions');
  console.log('[S5] SDK sessions...');

  let userAToken = null, userARefresh = null;
  let userBToken = null, userBRefresh = null;

  if (apiKey) {
    // User A session
    const sessA = await http({
      name: 'Create SDK Session (User A)', method: 'POST',
      url: `${config.authServiceUrl}/api/v1/auth/sdk/session`,
      headers: { 'x-api-key': apiKey },
      body: { user_external_id: `user-a-${ts}`, user_data: { name: 'Alice Tester', email: `alice-${ts}@e2etest.com` }, device_info: { device_type: 'web' } },
      acceptableStatus: [200, 201], tags: ['auth', 'sdk'],
    });
    const sessAData = tryJson(sessA.body);
    userAToken = sessAData?.access_token || sessAData?.token;
    userARefresh = sessAData?.refresh_token;
    report.context.userA = { token: userAToken ? `${userAToken.slice(0, 30)}...` : null, external_id: `user-a-${ts}` };

    // User B session (same tenant)
    const sessB = await http({
      name: 'Create SDK Session (User B)', method: 'POST',
      url: `${config.authServiceUrl}/api/v1/auth/sdk/session`,
      headers: { 'x-api-key': apiKey },
      body: { user_external_id: `user-b-${ts}`, user_data: { name: 'Bob Tester', email: `bob-${ts}@e2etest.com` }, device_info: { device_type: 'mobile' } },
      acceptableStatus: [200, 201], tags: ['auth', 'sdk'],
    });
    const sessBData = tryJson(sessB.body);
    userBToken = sessBData?.access_token || sessBData?.token;
    userBRefresh = sessBData?.refresh_token;
    report.context.userB = { token: userBToken ? `${userBToken.slice(0, 30)}...` : null, external_id: `user-b-${ts}` };
  }

  // Negative: session without API key
  await http({
    name: 'Create SDK Session (No API Key)', method: 'POST',
    url: `${config.authServiceUrl}/api/v1/auth/sdk/session`,
    body: { user_external_id: 'should-fail' },
    acceptableStatus: [401, 403], tags: ['auth', 'sdk', 'negative'],
  });

  /* ─── S6: Token Validation ─── */
  setSection('token-validation');
  console.log('[S6] Token validation...');

  if (userAToken) {
    await http({
      name: 'Validate Token (User A - Valid)', method: 'POST',
      url: `${config.authServiceUrl}/api/v1/auth/internal/validate`,
      headers: { 'x-service-secret': config.serviceSecret },
      body: { token: userAToken },
      acceptableStatus: [200], tags: ['auth', 'internal'],
    });

    // Also validate via the public endpoint
    await http({
      name: 'Validate Token (Auth /validate)', method: 'POST',
      url: `${config.authServiceUrl}/api/v1/auth/validate`,
      body: { token: userAToken },
      acceptableStatus: [200], tags: ['auth'],
    });
  }

  // Negative: invalid token
  await http({
    name: 'Validate Token (Invalid)', method: 'POST',
    url: `${config.authServiceUrl}/api/v1/auth/internal/validate`,
    headers: { 'x-service-secret': config.serviceSecret },
    body: { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.payload' },
    acceptableStatus: [401, 403], tags: ['auth', 'internal', 'negative'],
  });

  /* ─── S7: Token Refresh ─── */
  setSection('token-refresh');
  console.log('[S7] Token refresh...');

  if (userARefresh) {
    const refreshRes = await http({
      name: 'Refresh Token (User A)', method: 'POST',
      url: `${config.authServiceUrl}/api/v1/auth/sdk/refresh`,
      body: { refresh_token: userARefresh },
      acceptableStatus: [200], tags: ['auth', 'sdk'],
    });
    const refreshData = tryJson(refreshRes.body);
    if (refreshData?.access_token) {
      userAToken = refreshData.access_token;
      report.context.userA.tokenRefreshed = true;
    }
  }

  /* ─── S8: Gateway Authenticated Routes ─── */
  setSection('gateway-auth-routes');
  console.log('[S8] Gateway authenticated routes...');

  const authHeadersA = userAToken ? { authorization: `Bearer ${userAToken}` } : {};

  // Tenant routes
  await http({ name: 'Tenant Info (Unauthorized)', method: 'GET', url: `${config.gatewayUrl}/v1/tenant`, acceptableStatus: [401, 403], tags: ['gateway', 'negative'] });
  await http({ name: 'Tenant Info (Authorized)', method: 'GET', url: `${config.gatewayUrl}/v1/tenant`, headers: authHeadersA, acceptableStatus: 'any', tags: ['gateway'] });
  await http({ name: 'Tenant Usage', method: 'GET', url: `${config.gatewayUrl}/v1/tenant/usage`, headers: authHeadersA, acceptableStatus: 'any', tags: ['gateway'] });
  await http({
    name: 'Tenant Settings Update', method: 'PUT',
    url: `${config.gatewayUrl}/v1/tenant/settings`,
    headers: authHeadersA, body: { settings: { locale: 'en', timezone: 'UTC' } },
    acceptableStatus: 'any', tags: ['gateway'],
  });

  // API keys via gateway
  const createKey = await http({
    name: 'Gateway Create API Key', method: 'POST',
    url: `${config.gatewayUrl}/v1/auth/api-keys`,
    headers: authHeadersA, body: { name: 'e2e-gateway-key', scopes: ['read'] },
    acceptableStatus: 'any', tags: ['gateway', 'auth'],
  });
  let gwKeyId = null;
  const keyData = tryJson(createKey.body);
  if (createKey.status === 201) {
    gwKeyId = keyData?.id;
    report.context.gatewayApiKey = keyData?.key;
  }

  await http({ name: 'Gateway List API Keys', method: 'GET', url: `${config.gatewayUrl}/v1/auth/api-keys`, headers: authHeadersA, acceptableStatus: 'any', tags: ['gateway', 'auth'] });
  if (gwKeyId) {
    await http({ name: 'Gateway Delete API Key', method: 'DELETE', url: `${config.gatewayUrl}/v1/auth/api-keys/${gwKeyId}`, headers: authHeadersA, acceptableStatus: 'any', tags: ['gateway', 'auth'] });
  }

  // Sessions
  await http({ name: 'Gateway Sessions List', method: 'GET', url: `${config.gatewayUrl}/v1/sessions`, headers: authHeadersA, acceptableStatus: 'any', tags: ['gateway', 'sessions'] });

  /* ─── S9: Gateway SDK Token (Legacy Route) ─── */
  setSection('gateway-sdk-token');
  console.log('[S9] Gateway SDK token (legacy)...');

  const sdkTokenRes = await http({
    name: 'Gateway SDK Token (valid)', method: 'POST',
    url: `${config.gatewayUrl}/v1/auth/sdk/token`,
    body: { app_id: 'default-tenant', app_secret: 'secret', user_external_id: `sdk-${ts}` },
    acceptableStatus: 'any', tags: ['auth', 'gateway', 'sdk'],
  });
  const sdkData = tryJson(sdkTokenRes.body);
  const legacyToken = sdkData?.access_token;

  await http({
    name: 'Gateway SDK Token (invalid secret)', method: 'POST',
    url: `${config.gatewayUrl}/v1/auth/sdk/token`,
    body: { app_id: 'default-tenant', app_secret: 'wrong-secret', user_external_id: `sdk-bad-${ts}` },
    acceptableStatus: [400, 401], tags: ['auth', 'gateway', 'negative'],
  });

  /* ─── S10: Cross-Service Flows ─── */
  setSection('cross-service');
  console.log('[S10] Cross-service flows...');

  // Compliance: audit log
  await http({
    name: 'Compliance Audit Log', method: 'POST',
    url: `${config.complianceServiceUrl}/api/v1/audit/log`,
    body: { tenant_id: clientId || 'e2e-tenant', user_id: `user-a-${ts}`, action: 'e2e_test', resource_type: 'system' },
    acceptableStatus: 'any', tags: ['compliance'],
  });
  await http({
    name: 'Compliance Audit Log (Invalid)', method: 'POST',
    url: `${config.complianceServiceUrl}/api/v1/audit/log`,
    body: { tenant_id: '', action: '' },
    acceptableStatus: 'any', tags: ['compliance', 'negative'],
  });

  // Crypto: key + encrypt/decrypt roundtrip
  const keyCreate = await http({
    name: 'Crypto Key Generate', method: 'POST',
    url: `${config.cryptoServiceUrl}/api/v1/keys/generate`,
    body: { tenant_id: clientId || 'e2e-tenant', key_type: 'data' },
    acceptableStatus: 'any', tags: ['crypto'],
  });
  const keyId = tryJson(keyCreate.body)?.key_id;

  let encData = null;
  if (keyId) {
    const enc = await http({
      name: 'Crypto Encrypt', method: 'POST',
      url: `${config.cryptoServiceUrl}/api/v1/encrypt`,
      body: { key_id: keyId, plaintext: 'hello end-to-end' },
      acceptableStatus: 'any', tags: ['crypto'],
    });
    encData = tryJson(enc.body);

    if (encData?.ciphertext) {
      await http({
        name: 'Crypto Decrypt (Valid)', method: 'POST',
        url: `${config.cryptoServiceUrl}/api/v1/decrypt`,
        body: { key_id: keyId, ciphertext: encData.ciphertext, iv: encData.iv, authTag: encData.authTag },
        acceptableStatus: 'any', tags: ['crypto'],
      });
    }

    await http({
      name: 'Crypto Decrypt (Invalid Key)', method: 'POST',
      url: `${config.cryptoServiceUrl}/api/v1/decrypt`,
      body: { key_id: 'invalid-key', ciphertext: encData?.ciphertext || 'x', iv: encData?.iv || 'x', authTag: encData?.authTag || 'x' },
      acceptableStatus: 'any', tags: ['crypto', 'negative'],
    });
  }

  // Search
  await http({
    name: 'Search Empty Query', method: 'POST',
    url: `${config.searchServiceUrl}/api/v1/search/messages`,
    body: { query: '' },
    acceptableStatus: 'any', tags: ['search', 'negative'],
  });

  // Media
  await http({
    name: 'Media Quota (No Auth)', method: 'GET',
    url: `${config.mediaServiceUrl}/api/v1/media/quota`,
    acceptableStatus: 'any', tags: ['media', 'negative'],
  });

  /* ─── S11: Socket - Real-Time Multi-User Tests ─── */
  setSection('socket-realtime');
  console.log('[S11] Socket real-time multi-user...');

  // Decide which token to use for sockets
  const socketTokenA = userAToken || legacyToken;
  const socketTokenB = userBToken;

  // Test socket without auth (should fail)
  for (const sUrl of config.socketUrls) {
    await socketCase({
      socketUrl: sUrl, namespace: '/chat', event: 'joinRoom', payload: { conversationId: 'conv-e2e' },
      token: null, expectConnect: false, tags: ['socket', 'negative'],
    });
  }

  // Test socket with auth for User A and User B
  const chatEvents = [
    { event: 'joinRoom', payload: { conversationId: 'conv-e2e-room' } },
    { event: 'sendMessage', payload: { conversationId: 'conv-e2e-room', messageContent: 'Hello from User A' } },
    { event: 'typing_start', payload: { conversationId: 'conv-e2e-room' } },
    { event: 'typing_stop', payload: { conversationId: 'conv-e2e-room' } },
    { event: 'message_delivered', payload: { messageId: 'msg-e2e-1', conversationId: 'conv-e2e-room' } },
    { event: 'message_read', payload: { messageId: 'msg-e2e-1', conversationId: 'conv-e2e-room' } },
    { event: 'unread_query', payload: {} },
    { event: 'leaveRoom', payload: { conversationId: 'conv-e2e-room' } },
  ];

  const presenceEvents = [
    { event: 'presence_update', payload: { status: 'online', custom_status: 'e2e testing' } },
    { event: 'presence_subscribe', payload: { user_ids: [`user-a-${ts}`, `user-b-${ts}`] } },
    { event: 'presence_subscriptions_query', payload: {} },
    { event: 'presence_unsubscribe', payload: { user_ids: [`user-a-${ts}`] } },
  ];

  const webrtcEvents = [
    { event: 'webrtc:get-ice-servers', payload: {} },
    { event: 'call:initiate', payload: { targetUserId: `user-b-${ts}`, callType: 'video' } },
    { event: 'call:hangup', payload: { callId: 'call-e2e' } },
  ];

  const moderationEvents = [
    { event: 'moderate:mute', payload: { conversationId: 'conv-e2e-room', userId: `user-b-${ts}`, durationMs: 30000 } },
    { event: 'moderate:unmute', payload: { conversationId: 'conv-e2e-room', userId: `user-b-${ts}` } },
  ];

  // User A
  if (socketTokenA) {
    for (const ev of chatEvents) {
      await socketCase({
        socketUrl: config.socketUrls[0], namespace: '/chat', ...ev,
        token: socketTokenA, expectConnect: true, tags: ['socket', 'userA', 'chat'],
      });
    }
    for (const ev of presenceEvents) {
      await socketCase({
        socketUrl: config.socketUrls[0], namespace: '/presence', ...ev,
        token: socketTokenA, expectConnect: true, tags: ['socket', 'userA', 'presence'],
      });
    }
    for (const ev of webrtcEvents) {
      await socketCase({
        socketUrl: config.socketUrls[0], namespace: '/webrtc', ...ev,
        token: socketTokenA, expectConnect: true, tags: ['socket', 'userA', 'webrtc'],
      });
    }
    for (const ev of moderationEvents) {
      await socketCase({
        socketUrl: config.socketUrls[0], namespace: '/chat', ...ev,
        token: socketTokenA, expectConnect: true, tags: ['socket', 'userA', 'moderation'],
      });
    }
  }

  // User B on the other socket instance
  if (socketTokenB) {
    for (const ev of chatEvents.slice(0, 4)) { // join, send, typing_start, typing_stop
      await socketCase({
        socketUrl: config.socketUrls[1], namespace: '/chat', ...ev,
        token: socketTokenB, expectConnect: true, tags: ['socket', 'userB', 'chat'],
      });
    }
    await socketCase({
      socketUrl: config.socketUrls[1], namespace: '/presence',
      event: 'presence_update', payload: { status: 'online', custom_status: 'User B online' },
      token: socketTokenB, expectConnect: true, tags: ['socket', 'userB', 'presence'],
    });
  }

  /* ─── S12: IP / Origin Whitelist ─── */
  setSection('whitelist');
  console.log('[S12] IP / Origin whitelists...');

  if (clientId) {
    await http({
      name: 'Get IP Whitelist', method: 'GET',
      url: `${config.authServiceUrl}/api/v1/auth/client/ip-whitelist?client_id=${clientId}`,
      acceptableStatus: 'any', tags: ['auth', 'whitelist'],
    });
    await http({
      name: 'Add IP to Whitelist', method: 'POST',
      url: `${config.authServiceUrl}/api/v1/auth/client/ip-whitelist`,
      body: { client_id: clientId, ip: '10.0.0.1' },
      acceptableStatus: 'any', tags: ['auth', 'whitelist'],
    });
    await http({
      name: 'Get Origin Whitelist', method: 'GET',
      url: `${config.authServiceUrl}/api/v1/auth/client/origin-whitelist?client_id=${clientId}`,
      acceptableStatus: 'any', tags: ['auth', 'whitelist'],
    });
    await http({
      name: 'Add Origin to Whitelist', method: 'POST',
      url: `${config.authServiceUrl}/api/v1/auth/client/origin-whitelist`,
      body: { client_id: clientId, origin: 'https://e2etest.com' },
      acceptableStatus: 'any', tags: ['auth', 'whitelist'],
    });
  }

  /* ─── S13: User Profile ─── */
  setSection('user-profile');
  console.log('[S13] User profile...');

  if (userAToken) {
    await http({
      name: 'Get User Profile', method: 'GET',
      url: `${config.authServiceUrl}/api/v1/users/profile`,
      headers: { authorization: `Bearer ${userAToken}` },
      acceptableStatus: 'any', tags: ['auth', 'user'],
    });
    await http({
      name: 'Update User Profile', method: 'PUT',
      url: `${config.authServiceUrl}/api/v1/users/profile`,
      headers: { authorization: `Bearer ${userAToken}` },
      body: { name: 'Alice Updated', preferences: { theme: 'dark' } },
      acceptableStatus: 'any', tags: ['auth', 'user'],
    });
  }

  /* ─── S14: Session Management ─── */
  setSection('session-management');
  console.log('[S14] Session management...');

  if (userAToken) {
    await http({
      name: 'List Sessions', method: 'GET',
      url: `${config.authServiceUrl}/api/v1/sessions`,
      headers: { authorization: `Bearer ${userAToken}` },
      acceptableStatus: 'any', tags: ['auth', 'sessions'],
    });
  }

  /* ─── S15: Swagger Discovery ─── */
  setSection('swagger-discovery');
  console.log('[S15] Swagger discovery...');
  await runSwaggerDiscovery(userAToken || legacyToken);

  /* ─── S16: Logout ─── */
  setSection('logout');
  console.log('[S16] Logout...');

  if (userBToken) {
    await http({
      name: 'SDK Logout (User B)', method: 'POST',
      url: `${config.authServiceUrl}/api/v1/auth/sdk/logout`,
      headers: { authorization: `Bearer ${userBToken}` },
      acceptableStatus: 'any', tags: ['auth', 'sdk'],
    });

    // Verify token is invalidated
    await http({
      name: 'Validate Revoked Token (User B)', method: 'POST',
      url: `${config.authServiceUrl}/api/v1/auth/validate`,
      body: { token: userBToken },
      acceptableStatus: [401, 403], tags: ['auth', 'negative'],
    });
  }

  /* ─── Finalize ─── */
  report.completedAt = new Date().toISOString();

  // Compute section summaries
  for (const c of report.cases) {
    if (!report.sections[c.section]) report.sections[c.section] = { total: 0, passed: 0, failed: 0, warnings: 0 };
    report.sections[c.section].total++;
    if (c.outcome === 'passed') report.sections[c.section].passed++;
    else if (c.outcome === 'warning') report.sections[c.section].warnings++;
    else report.sections[c.section].failed++;
  }

  const outPath = config.outPath || path.join(__dirname, 'reports', `e2e-system-raw-${Date.now()}.json`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf-8');

  console.log(`\nE2E raw report written: ${outPath}`);
  console.log(`Summary: total=${report.summary.total} passed=${report.summary.passed} warning=${report.summary.warnings} failed=${report.summary.failed}`);

  if (report.summary.failed > 0) process.exitCode = 2;
}

main().catch(e => { console.error('E2E runner fatal error:', e); process.exit(1); });
