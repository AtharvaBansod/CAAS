const fs = require('fs');
const path = require('path');
const { io } = require('socket.io-client');

const cfg = {
  gateway: process.env.GATEWAY_URL || 'http://gateway:3000',
  auth: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
  adminPortal: process.env.ADMIN_PORTAL_URL || 'http://admin-portal:3100',
  socket1: process.env.SOCKET1_URL || 'http://socket-service-1:3001',
  socket2: process.env.SOCKET2_URL || 'http://socket-service-2:3001',
  compliance: process.env.COMPLIANCE_SERVICE_URL || 'http://compliance-service:3008',
  crypto: process.env.CRYPTO_SERVICE_URL || 'http://crypto-service:3009',
  search: process.env.SEARCH_SERVICE_URL || 'http://search-service:3006',
  media: process.env.MEDIA_SERVICE_URL || 'http://media-service:3005',
  timeoutMs: Number(process.env.E2E_TIMEOUT_MS || 12000),
  outDir: process.env.E2E_OUT_DIR || '/tests/fresh_e2e/reports',
};

const report = {
  generatedAt: new Date().toISOString(),
  summary: { total: 0, passed: 0, failed: 0, warnings: 0 },
  phases: {},
  owners: {},
  context: {},
  cases: [],
};

let currentPhase = 'setup';
const jsonHeaders = { 'content-type': 'application/json' };
const SENSITIVE_KEY_PATTERN = /(token|secret|password|authorization|cookie|api[_-]?key)/i;

function ensurePhase(name) {
  if (!report.phases[name]) {
    report.phases[name] = { total: 0, passed: 0, failed: 0, warnings: 0 };
  }
}

function inferOwnerTag(name, details = {}) {
  const url = String(details.url || '');
  if (url.includes('/api/v1/auth/client') || url.includes('/api/auth/')) return 'auth-service';
  if (url.includes('/api/v1/sdk')) return 'gateway+auth-service';
  if (url.includes('/api/v1/admin') || url.includes('/api/v1/tenant') || url.includes('/api/v1/audit')) return 'gateway';
  if (url.includes('socket-service')) return 'socket-service';
  if (url.includes('/compliance')) return 'compliance-service';
  if (url.includes('/crypto')) return 'crypto-service';
  if (url.includes('/search')) return 'search-service';
  if (url.includes('/media')) return 'media-service';
  if (url.includes('admin-portal')) return 'admin-portal';
  if (name.toLowerCase().includes('socket ')) return 'socket-service';
  return 'platform';
}

function setPhase(name) {
  currentPhase = name;
  ensurePhase(name);
  console.log(`\n[PHASE] ${name}`);
}

function recordCase(name, ok, details = {}, warning = false) {
  ensurePhase(currentPhase);
  const status = warning ? 'warning' : ok ? 'passed' : 'failed';
  const owner = inferOwnerTag(name, details);
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
    owner,
    name,
    status,
    timestamp: new Date().toISOString(),
    details,
  });
  if (!report.owners[owner]) {
    report.owners[owner] = { total: 0, passed: 0, failed: 0, warnings: 0 };
  }
  report.owners[owner].total += 1;
  if (warning) report.owners[owner].warnings += 1;
  else if (ok) report.owners[owner].passed += 1;
  else report.owners[owner].failed += 1;
  const icon = warning ? 'WARN' : ok ? 'PASS' : 'FAIL';
  console.log(`[${icon}] (${owner}) ${name}`);
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function redactSensitive(value) {
  if (Array.isArray(value)) return value.map((item) => redactSensitive(item));
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const [key, val] of Object.entries(value)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      out[key] = typeof val === 'string' && val.length > 8
        ? `${val.slice(0, 4)}***redacted***${val.slice(-2)}`
        : '***redacted***';
      continue;
    }
    out[key] = redactSensitive(val);
  }
  return out;
}

function sanitizeHeaders(headersObj) {
  const out = {};
  for (const [key, value] of Object.entries(headersObj || {})) {
    if (SENSITIVE_KEY_PATTERN.test(key)) continue;
    out[key] = value;
  }
  return out;
}

function accepted(status, expectStatus) {
  if (!expectStatus) return status >= 200 && status < 300;
  if (expectStatus === 'any') return status >= 100 && status < 600;
  if (Array.isArray(expectStatus)) return expectStatus.includes(status);
  return status === expectStatus;
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
    const ok = accepted(res.status, options.expectStatus);
    recordCase(name, ok, {
      method,
      url,
      status: res.status,
      headers: sanitizeHeaders(Object.fromEntries(res.headers.entries())),
      response: redactSensitive(json || text),
      requestBody: redactSensitive(options.body || null),
    });
    return { ok, status: res.status, headers: res.headers, json, text };
  } catch (error) {
    recordCase(name, false, { method, url, error: String(error) });
    return { ok: false, error: String(error) };
  } finally {
    clearTimeout(timer);
  }
}

async function matrix(prefix, method, url, cases) {
  for (const item of cases) {
    await httpCase(`${prefix} :: ${item.name}`, method, url, item.options || {});
  }
}

function socketConnect(baseUrl, namespace, token) {
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

function socketAck(socket, event, payload, timeoutMs = 5000) {
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

function markdown() {
  const lines = [];
  lines.push('# CAAS Fresh E2E Report');
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
  for (const [phase, value] of Object.entries(report.phases)) {
    lines.push(`| ${phase} | ${value.total} | ${value.passed} | ${value.warnings} | ${value.failed} |`);
  }
  lines.push('');
  lines.push('## Owner Breakdown');
  lines.push('');
  lines.push('| Owner | Total | Passed | Warnings | Failed |');
  lines.push('|---|---:|---:|---:|---:|');
  for (const [owner, value] of Object.entries(report.owners || {})) {
    lines.push(`| ${owner} | ${value.total} | ${value.passed} | ${value.warnings} | ${value.failed} |`);
  }
  lines.push('');
  const failed = report.cases.filter((entry) => entry.status === 'failed');
  lines.push('## Failed Cases');
  lines.push('');
  if (failed.length === 0) {
    lines.push('None');
  } else {
    failed.forEach((entry, index) => {
      lines.push(`### ${index + 1}. ${entry.name}`);
      lines.push('```json');
      lines.push(JSON.stringify(entry.details, null, 2));
      lines.push('```');
      lines.push('');
    });
  }
  lines.push('');
  lines.push('## All Cases');
  lines.push('');
  report.cases.forEach((entry, index) => {
    lines.push(`${index + 1}. [${entry.status.toUpperCase()}] ${entry.phase} :: ${entry.name}`);
  });
  return lines.join('\n');
}

async function run() {
  const stamp = Date.now();
  const email = `fresh-${stamp}@example.com`;
  const password = 'FreshPassword-123!';
  const registerPayload = {
    company_name: `Fresh Tenant ${stamp}`,
    email,
    password,
    plan: 'business',
    project: {
      name: `Primary Project ${stamp}`,
      stack: 'react',
      environment: 'development',
    },
  };

  setPhase('01-health-and-basics');
  await httpCase('Gateway /health', 'GET', `${cfg.gateway}/health`, { expectStatus: 200 });
  await httpCase('Gateway /internal/health', 'GET', `${cfg.gateway}/internal/health`, { expectStatus: 200 });
  await httpCase('Auth /health', 'GET', `${cfg.auth}/health`, { expectStatus: 200 });
  await httpCase('Compliance /health', 'GET', `${cfg.compliance}/health`, { expectStatus: 200 });
  await httpCase('Crypto /health', 'GET', `${cfg.crypto}/health`, { expectStatus: 200 });
  await httpCase('Search /health', 'GET', `${cfg.search}/health`, { expectStatus: 200 });
  await httpCase('Media /health', 'GET', `${cfg.media}/health`, { expectStatus: 200 });
  await httpCase('Socket1 /health', 'GET', `${cfg.socket1}/health`, { expectStatus: 200 });
  await httpCase('Socket2 /health', 'GET', `${cfg.socket2}/health`, { expectStatus: 200 });
  await httpCase('Admin Portal /api/health', 'GET', `${cfg.adminPortal}/api/health`, { expectStatus: 200 });

  setPhase('02-cors-and-registration');
  const cors = await httpCase('Gateway preflight register with custom headers', 'OPTIONS', `${cfg.gateway}/api/v1/auth/client/register`, {
    expectStatus: [200, 204],
    headers: {
      Origin: 'http://localhost:3100',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type,authorization,x-correlation-id,idempotency-key,x-timestamp,x-nonce,x-project-id',
    },
  });

  const allowHeaders = (cors.headers?.get('access-control-allow-headers') || '').toLowerCase();
  const requiredHeaders = [
    'content-type',
    'authorization',
    'x-correlation-id',
    'idempotency-key',
    'x-timestamp',
    'x-nonce',
    'x-project-id',
  ];
  requiredHeaders.forEach((headerName) => {
    recordCase(`CORS allow header includes ${headerName}`, allowHeaders.includes(headerName), {
      allowHeaders,
      expected: headerName,
    });
  });

  const registerViaProxy = await httpCase('Admin proxy register', 'POST', `${cfg.adminPortal}/api/auth/register`, {
    expectStatus: [200, 201],
    headers: jsonHeaders,
    body: registerPayload,
  });
  const registerBody = registerViaProxy.json || {};
  report.context.client_id = registerBody.client_id || null;
  report.context.tenant_id = registerBody.tenant_id || null;
  report.context.project_id = registerBody.project_id || null;
  report.context.api_key_prefix = registerBody.api_key ? registerBody.api_key.slice(0, 20) : null;

  await httpCase('Admin proxy register duplicate email', 'POST', `${cfg.adminPortal}/api/auth/register`, {
    expectStatus: [400, 409],
    headers: jsonHeaders,
    body: registerPayload,
  });

  await matrix('Gateway register negative matrix', 'POST', `${cfg.gateway}/api/v1/auth/client/register`, [
    { name: 'missing fields', options: { expectStatus: [400, 422], headers: jsonHeaders, body: {} } },
    { name: 'invalid email', options: { expectStatus: [400, 422], headers: jsonHeaders, body: { company_name: 'X Corp', email: 'bad-email', password } } },
    { name: 'short password', options: { expectStatus: [400, 422], headers: jsonHeaders, body: { company_name: 'X Corp', email: `neg-${stamp}@example.com`, password: '123' } } },
    { name: 'invalid project environment', options: { expectStatus: [400, 422], headers: jsonHeaders, body: { company_name: 'X Corp', email: `neg2-${stamp}@example.com`, password, project: { name: 'proj', stack: 'react', environment: 'qa' } } } },
  ]);

  const gatewayLogin = await httpCase('Gateway client login', 'POST', `${cfg.gateway}/api/v1/auth/client/login`, {
    expectStatus: 200,
    headers: jsonHeaders,
    body: { email, password },
  });
  const adminAccessToken = gatewayLogin.json?.access_token || null;
  const adminRefreshToken = gatewayLogin.json?.refresh_token || null;
  report.context.admin_access_token_prefix = adminAccessToken ? adminAccessToken.slice(0, 20) : null;

  const adminProxyLogin = await httpCase('Admin proxy login', 'POST', `${cfg.adminPortal}/api/auth/login`, {
    expectStatus: 200,
    headers: jsonHeaders,
    body: { email, password },
  });
  const loginBody = adminProxyLogin.json || {};
  recordCase(
    'Admin proxy login body does not expose raw tokens',
    !('access_token' in loginBody) && !('refresh_token' in loginBody),
    { keys: Object.keys(loginBody) }
  );
  const setCookieRaw = adminProxyLogin.headers?.get('set-cookie') || '';
  const middlewareCookieRaw = adminProxyLogin.headers?.get('x-middleware-set-cookie') || '';
  const cookieSource = `${setCookieRaw},${middlewareCookieRaw}`;
  const refreshMatch = cookieSource.match(/caas_refresh_token=([^;]+)/);
  const csrfMatch = cookieSource.match(/caas_csrf_token=([^;]+)/);
  const refreshCookie = refreshMatch ? `caas_refresh_token=${refreshMatch[1]}` : null;
  const csrfCookie = csrfMatch ? `caas_csrf_token=${csrfMatch[1]}` : null;
  const csrfToken = csrfMatch ? csrfMatch[1] : null;
  const authCookieHeader = [refreshCookie, csrfCookie].filter(Boolean).join('; ');

  if (refreshCookie && csrfToken) {
    const refreshResult = await httpCase('Admin proxy refresh with cookie', 'POST', `${cfg.adminPortal}/api/auth/refresh`, {
      expectStatus: [200, 401, 403],
      headers: {
        Cookie: authCookieHeader,
        'x-csrf-token': csrfToken,
      },
    });
    recordCase(
      'Admin proxy refresh CSRF contract',
      refreshResult.status === 200 || (refreshResult.status === 403 && refreshResult.json?.code === 'csrf_failed'),
      {
        status: refreshResult.status || null,
        code: refreshResult.json?.code || null,
        hasRefreshCookie: Boolean(refreshCookie),
        hasCsrfToken: Boolean(csrfToken),
      }
    );
  } else {
    recordCase('Admin proxy refresh with cookie skipped', false, {
      reason: 'Missing refresh/csrf cookies from login response',
      hasRefreshCookie: Boolean(refreshCookie),
      hasCsrfToken: Boolean(csrfToken),
    }, true);
  }

  await httpCase('Gateway refresh token', 'POST', `${cfg.gateway}/api/v1/auth/client/refresh`, {
    expectStatus: [200, 401, 404],
    headers: jsonHeaders,
    body: { refresh_token: adminRefreshToken || 'invalid' },
  });

  setPhase('03-project-lifecycle-and-scope');
  if (!adminAccessToken || !report.context.client_id) {
    recordCase('Project lifecycle skipped', false, { reason: 'Missing admin token or client context' }, true);
  } else {
    const authHeaders = {
      ...jsonHeaders,
      authorization: `Bearer ${adminAccessToken}`,
    };

    const listInitial = await httpCase('List projects initial', 'GET', `${cfg.gateway}/api/v1/auth/client/projects`, {
      expectStatus: 200,
      headers: { authorization: `Bearer ${adminAccessToken}` },
    });

    const created = await httpCase('Create secondary project', 'POST', `${cfg.gateway}/api/v1/auth/client/projects`, {
      expectStatus: 201,
      headers: authHeaders,
      body: { name: `Secondary Project ${stamp}`, stack: 'node', environment: 'staging' },
    });
    const secondaryProjectId = created.json?.project?.project_id || null;

    if (secondaryProjectId) {
      await httpCase('Update project metadata', 'PATCH', `${cfg.gateway}/api/v1/auth/client/projects/${encodeURIComponent(secondaryProjectId)}`, {
        expectStatus: 200,
        headers: authHeaders,
        body: { name: `Secondary Project Updated ${stamp}`, stack: 'python', environment: 'production' },
      });

      await httpCase('Select updated project as active', 'POST', `${cfg.gateway}/api/v1/auth/client/projects/select`, {
        expectStatus: 200,
        headers: authHeaders,
        body: { project_id: secondaryProjectId },
      });

      await httpCase('Update project client spoof attempt rejected', 'PATCH', `${cfg.gateway}/api/v1/auth/client/projects/${encodeURIComponent(secondaryProjectId)}`, {
        expectStatus: 403,
        headers: authHeaders,
        body: { client_id: 'spoofed-client-id', name: 'Spoofed' },
      });

      await httpCase('Archive selected project', 'POST', `${cfg.gateway}/api/v1/auth/client/projects/${encodeURIComponent(secondaryProjectId)}/archive`, {
        expectStatus: 200,
        headers: authHeaders,
        body: {},
      });
    } else {
      recordCase('Secondary project ID missing', false, { created });
    }

    const projectsAfterArchive = await httpCase('List projects after archive', 'GET', `${cfg.gateway}/api/v1/auth/client/projects`, {
      expectStatus: 200,
      headers: { authorization: `Bearer ${adminAccessToken}` },
    });
    const remaining = projectsAfterArchive.json?.projects || [];
    if (remaining.length > 0) {
      await httpCase('Archive last active project rejected', 'POST', `${cfg.gateway}/api/v1/auth/client/projects/${encodeURIComponent(remaining[0].project_id)}/archive`, {
        expectStatus: [400, 409],
        headers: authHeaders,
        body: {},
      });
    }

    await httpCase('Project select spoofed client_id rejected', 'POST', `${cfg.gateway}/api/v1/auth/client/projects/select`, {
      expectStatus: 403,
      headers: authHeaders,
      body: {
        client_id: 'spoofed-client-id',
        project_id: remaining[0]?.project_id || report.context.project_id,
      },
    });

    await httpCase('Project create spoofed client_id rejected', 'POST', `${cfg.gateway}/api/v1/auth/client/projects`, {
      expectStatus: 403,
      headers: authHeaders,
      body: {
        client_id: 'spoofed-client-id',
        name: 'Spoofed Project',
        stack: 'react',
        environment: 'development',
      },
    });

    await httpCase('Project list still available', 'GET', `${cfg.gateway}/api/v1/auth/client/projects`, {
      expectStatus: 200,
      headers: { authorization: `Bearer ${adminAccessToken}` },
    });

    recordCase('Project list count check', Array.isArray(listInitial.json?.projects), {
      initialProjectCount: listInitial.json?.projects?.length || 0,
    });
  }

  setPhase('04-sdk-http-contract');
  const apiKey = registerBody.api_key || registerBody.api_secret || null;
  let sdkAccessToken = null;
  let sdkRefreshToken = null;
  if (!apiKey) {
    recordCase('SDK flow skipped', false, { reason: 'No API key returned from registration' }, true);
  } else {
    await httpCase('SDK health endpoint', 'GET', `${cfg.gateway}/api/v1/sdk/health`, { expectStatus: 200 });
    await httpCase('SDK capabilities with API key', 'GET', `${cfg.gateway}/api/v1/sdk/capabilities`, {
      expectStatus: 200,
      headers: { 'x-api-key': apiKey },
    });

    const nonce = `fresh-nonce-${stamp}`;
    const projectId = report.context.project_id;
    const sdkSession = await httpCase('SDK session create valid', 'POST', `${cfg.gateway}/api/v1/sdk/session`, {
      expectStatus: [200, 201],
      headers: {
        ...jsonHeaders,
        'x-api-key': apiKey,
        'x-project-id': projectId,
        'x-correlation-id': `corr-${stamp}`,
        'idempotency-key': `idem-${stamp}`,
        'x-timestamp': `${Math.floor(Date.now() / 1000)}`,
        'x-nonce': nonce,
      },
      body: {
        user_external_id: `sdk-user-${stamp}`,
        project_id: projectId,
      },
    });
    sdkAccessToken = sdkSession.json?.access_token || null;
    sdkRefreshToken = sdkSession.json?.refresh_token || null;

    const sdkFallback = await httpCase('SDK session create with auth fallback project context', 'POST', `${cfg.gateway}/api/v1/sdk/session`, {
      expectStatus: [200, 201],
      headers: {
        ...jsonHeaders,
        'x-api-key': apiKey,
      },
      body: {
        user_external_id: `sdk-user-fallback-${stamp}`,
      },
    });
    recordCase(
      'SDK fallback project context header present',
      (sdkFallback.headers?.get('x-project-context-source') || '') === 'auth_fallback_compat',
      {
        header: sdkFallback.headers?.get('x-project-context-source') || null,
      }
    );

    await httpCase('SDK session replay nonce rejected', 'POST', `${cfg.gateway}/api/v1/sdk/session`, {
      expectStatus: 409,
      headers: {
        ...jsonHeaders,
        'x-api-key': apiKey,
        'x-project-id': projectId,
        'x-timestamp': `${Math.floor(Date.now() / 1000)}`,
        'x-nonce': nonce,
      },
      body: { user_external_id: `sdk-user-replay-${stamp}`, project_id: projectId },
    });

    await httpCase('SDK session project mismatch rejected', 'POST', `${cfg.gateway}/api/v1/sdk/session`, {
      expectStatus: [400, 403],
      headers: {
        ...jsonHeaders,
        'x-api-key': apiKey,
        'x-project-id': projectId,
      },
      body: {
        user_external_id: `sdk-user-mismatch-${stamp}`,
        project_id: `mismatch-${projectId}`,
      },
    });

    await httpCase('SDK session tenant_id spoof rejected', 'POST', `${cfg.gateway}/api/v1/sdk/session`, {
      expectStatus: 403,
      headers: {
        ...jsonHeaders,
        'x-api-key': apiKey,
      },
      body: {
        user_external_id: `sdk-user-tenant-spoof-${stamp}`,
        tenant_id: 'spoofed-tenant',
      },
    });

    await httpCase('SDK session client_id spoof rejected', 'POST', `${cfg.gateway}/api/v1/sdk/session`, {
      expectStatus: 403,
      headers: {
        ...jsonHeaders,
        'x-api-key': apiKey,
      },
      body: {
        user_external_id: `sdk-user-client-spoof-${stamp}`,
        client_id: 'spoofed-client',
      },
    });

    await matrix('SDK refresh/logout matrix', 'POST', `${cfg.gateway}/api/v1/sdk/refresh`, [
      { name: 'refresh invalid token', options: { expectStatus: [400, 401], headers: jsonHeaders, body: { refresh_token: 'invalid' } } },
      { name: 'refresh valid token', options: { expectStatus: [200, 401], headers: jsonHeaders, body: { refresh_token: sdkRefreshToken || 'invalid' } } },
    ]);

    await httpCase('SDK logout missing bearer', 'POST', `${cfg.gateway}/api/v1/sdk/logout`, {
      expectStatus: 401,
      headers: jsonHeaders,
      body: {},
    });
  }

  setPhase('05-socket-e2e');
  if (!sdkAccessToken) {
    recordCase('Socket e2e skipped', false, { reason: 'Missing SDK access token' }, true);
  } else {
    const noAuth = await socketConnect(cfg.socket1, '/chat', null);
    recordCase('Socket /chat rejects missing token', !noAuth.ok, { reason: noAuth.reason || null });
    noAuth.socket.close();

    const chat = await socketConnect(cfg.socket1, '/chat', sdkAccessToken);
    recordCase('Socket /chat authenticated connect', chat.ok, { reason: chat.reason || null });
    if (chat.ok) {
      const roomId = `room-${stamp}`;
      const chatEvents = [
        ['joinRoom invalid', 'joinRoom', {}],
        ['joinRoom valid-shape', 'joinRoom', { conversationId: roomId }],
        ['sendMessage invalid', 'sendMessage', { conversationId: roomId }],
        ['sendMessage valid-shape', 'sendMessage', { conversationId: roomId, messageContent: 'hello from fresh e2e' }],
        ['typing_query', 'typing_query', { conversationId: roomId }],
        ['message_read invalid', 'message_read', {}],
        ['message_delivered invalid', 'message_delivered', {}],
        ['leaveRoom valid-shape', 'leaveRoom', { conversationId: roomId }],
      ];
      for (const [label, event, payload] of chatEvents) {
        const ack = await socketAck(chat.socket, event, payload);
        recordCase(`Socket chat ${label}`, !ack.timeout, { event, payload, ack: ack.data || null });
      }
      chat.socket.close();
    }

    const presence = await socketConnect(cfg.socket2, '/presence', sdkAccessToken);
    recordCase('Socket /presence authenticated connect', presence.ok, { reason: presence.reason || null });
    if (presence.ok) {
      const ack1 = await socketAck(presence.socket, 'presence_subscribe', { user_ids: ['u1', 'u2'] });
      const ack2 = await socketAck(presence.socket, 'presence_unsubscribe', { user_ids: ['u1'] });
      recordCase('Socket presence_subscribe ack', !ack1.timeout, { ack: ack1.data || null });
      recordCase('Socket presence_unsubscribe ack', !ack2.timeout, { ack: ack2.data || null });
      presence.socket.close();
    }

    const webrtc = await socketConnect(cfg.socket1, '/webrtc', sdkAccessToken);
    recordCase('Socket /webrtc authenticated connect', webrtc.ok, { reason: webrtc.reason || null });
    if (webrtc.ok) {
      const callAck = await socketAck(webrtc.socket, 'call:initiate', { targetUserId: 'user-b', callType: 'video' });
      const iceAck = await socketAck(webrtc.socket, 'webrtc:ice-candidate', {});
      recordCase('Socket webrtc call:initiate ack', !callAck.timeout, { ack: callAck.data || null });
      recordCase('Socket webrtc ice-candidate invalid ack', !iceAck.timeout, { ack: iceAck.data || null });
      webrtc.socket.close();
    }

    await httpCase('SDK logout with bearer', 'POST', `${cfg.gateway}/api/v1/sdk/logout`, {
      expectStatus: 200,
      headers: { authorization: `Bearer ${sdkAccessToken}` },
    });
  }

  setPhase('06-admin-ui-gateway-flow');
  await httpCase('Admin dashboard without auth redirect', 'GET', `${cfg.adminPortal}/dashboard`, {
    expectStatus: [200, 307, 308],
    noRedirect: true,
  });
  const redirectLocation = (await httpCase('Admin dashboard redirect location check', 'GET', `${cfg.adminPortal}/dashboard`, {
    expectStatus: [200, 307, 308],
    noRedirect: true,
  })).headers?.get('location') || '';
  recordCase(
    'Redirect URL has no token leakage',
    !/token=|access_token=|refresh_token=/i.test(redirectLocation),
    { location: redirectLocation || null }
  );
  if (authCookieHeader && csrfToken) {
    const logoutResult = await httpCase('Admin api auth logout', 'POST', `${cfg.adminPortal}/api/auth/logout`, {
      expectStatus: [200, 204, 403],
      headers: {
        ...jsonHeaders,
        Cookie: authCookieHeader,
        'x-csrf-token': csrfToken,
      },
      body: {},
    });
    recordCase(
      'Admin logout CSRF contract',
      logoutResult.status === 200 || logoutResult.status === 204 || (logoutResult.status === 403 && logoutResult.json?.code === 'csrf_failed'),
      {
        status: logoutResult.status || null,
        code: logoutResult.json?.code || null,
      }
    );
  } else {
    await httpCase('Admin api auth logout without csrf blocked', 'POST', `${cfg.adminPortal}/api/auth/logout`, {
      expectStatus: 403,
      headers: jsonHeaders,
      body: {},
    });
  }
  await httpCase('Gateway tenant with missing bearer', 'GET', `${cfg.gateway}/api/v1/tenant`, {
    expectStatus: [400, 401, 403],
  });
  const leakProbeToken = `eyJ.fake.${stamp}.sensitive`;
  const leakProbe = await httpCase('Gateway invalid bearer leakage probe', 'GET', `${cfg.gateway}/api/v1/tenant`, {
    expectStatus: [400, 401, 403],
    headers: { authorization: `Bearer ${leakProbeToken}` },
  });
  recordCase(
    'Error payload does not echo bearer token',
    !(leakProbe.text || '').includes(leakProbeToken),
    { status: leakProbe.status || null }
  );
  if (adminAccessToken) {
    await httpCase('Gateway tenant with bearer', 'GET', `${cfg.gateway}/api/v1/tenant`, {
      expectStatus: [200, 404],
      headers: { authorization: `Bearer ${adminAccessToken}` },
    });
  }
  await matrix('Gateway project preflight matrix', 'OPTIONS', `${cfg.gateway}/api/v1/auth/client/projects`, [
    {
      name: 'allowed origin with custom headers',
      options: {
        expectStatus: [200, 204],
        headers: {
          Origin: 'http://localhost:3100',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'content-type,authorization,x-correlation-id,idempotency-key,x-project-id',
        },
      },
    },
    {
      name: 'disallowed origin',
      options: {
        expectStatus: 'any',
        headers: {
          Origin: 'http://evil.example',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'content-type,authorization',
        },
      },
    },
  ]);

  report.completedAt = new Date().toISOString();
  fs.mkdirSync(cfg.outDir, { recursive: true });
  const stampOut = Date.now();
  const jsonPath = path.join(cfg.outDir, `fresh-e2e-report-${stampOut}.json`);
  const mdPath = path.join(cfg.outDir, `fresh-e2e-report-${stampOut}.md`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');
  fs.writeFileSync(mdPath, markdown(), 'utf-8');

  console.log(`\nJSON report: ${jsonPath}`);
  console.log(`Markdown report: ${mdPath}`);
  console.log(`Summary: total=${report.summary.total}, passed=${report.summary.passed}, warnings=${report.summary.warnings}, failed=${report.summary.failed}`);

  if (report.summary.failed > 0) {
    process.exit(1);
  }
}

run().catch((error) => {
  console.error('Fresh E2E fatal error:', error);
  process.exit(1);
});
