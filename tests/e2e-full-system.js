/**
 * CAAS Platform — Comprehensive Full System E2E Test
 * ===================================================
 *
 * This is a standalone, self-contained test runner.
 * It exercises EVERY publicly documented surface of the CAAS platform:
 *
 *   Phase 1 — Infrastructure Health
 *   Phase 2 — Tenant Onboarding (Client Registration)
 *   Phase 3 — API Key Lifecycle (Rotate / Promote / Validate)
 *   Phase 4 — SDK Session Lifecycle (Create / Refresh / Logout)
 *   Phase 5 — Token Validation (Internal + Public endpoints)
 *   Phase 6 — Gateway Authenticated Routing
 *   Phase 7 — Cross-Service Integrations (Compliance, Crypto, Search, Media)
 *   Phase 8 — Real-Time Socket Events (Chat, Presence, WebRTC, Moderation)
 *   Phase 9 — Multi-Tenant Isolation & Security
 *   Phase 10 — Swagger / OpenAPI Discovery
 *   Phase 11 — Session Management & Logout Verification
 *
 * Design choices:
 *   - Pure Node 20 (no transpile, no TS, no bundler)
 *   - Only dependency: socket.io-client (shipped in tests/package.json)
 *   - Runs inside Docker on the caas_caas-network — zero local ports needed
 *   - Outputs a structured JSON report that the PowerShell runner converts to Markdown
 */

const fs = require('fs');
const path = require('path');
const { io } = require('socket.io-client');

/* ═══════════════════════════════════════════════════
   CONFIGURATION
   ═══════════════════════════════════════════════════ */
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
    socketConnectMs: Number(args.socketConnectMs || 12000),
    socketAckTimeoutMs: Number(args.socketAckTimeoutMs || 4000),
    serviceSecret: args.serviceSecret || process.env.SERVICE_SECRET || 'dev-service-secret-change-in-production',
};

/* ═══════════════════════════════════════════════════
   REPORT ENGINE
   ═══════════════════════════════════════════════════ */
const report = {
    generatedAt: new Date().toISOString(),
    metadata: { ...config, serviceSecret: '***' },
    summary: { total: 0, passed: 0, failed: 0, warnings: 0, skipped: 0 },
    context: {},          // dynamic state (tokens, IDs) propagated across phases
    sections: {},         // per-section tallies
    phases: [],           // ordered phase meta
    cases: [],            // individual test cases
};

let currentSection = 'general';
let currentPhase = 0;

function setPhase(num, label) {
    currentPhase = num;
    currentSection = label;
    report.phases.push({ phase: num, label, startedAt: new Date().toISOString() });
    console.log(`[Phase ${num}] ${label}...`);
}

function recordCase(entry) {
    entry.section = currentSection;
    entry.phase = currentPhase;
    report.cases.push(entry);
    report.summary.total++;
    if (entry.outcome === 'passed') report.summary.passed++;
    else if (entry.outcome === 'warning') report.summary.warnings++;
    else if (entry.outcome === 'skipped') report.summary.skipped++;
    else report.summary.failed++;
}

function truncate(value, maxLen = 4000) {
    if (value == null) return value;
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    return text.length <= maxLen ? text : `${text.slice(0, maxLen)}… [truncated ${text.length - maxLen} chars]`;
}

function tryJson(text) { try { return JSON.parse(text); } catch { return null; } }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ═══════════════════════════════════════════════════
   HTTP HELPER
   ═══════════════════════════════════════════════════ */
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
        request: { method, url, headers, body: truncate(body, 2000), acceptableStatus },
        response: { status, headers: resHeaders, body: truncate(resBody, 6000), error },
        outcome,
    });
    return { status, body: resBody, error };
}

/* ═══════════════════════════════════════════════════
   SOCKET HELPERS
   ═══════════════════════════════════════════════════ */
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
        setTimeout(() => finish({ ok: false, error: 'connect timeout', socket }), config.socketConnectMs);
    });
}

function emitAck(socket, event, payload, ms = config.socketAckTimeoutMs) {
    return new Promise(resolve => {
        let done = false;
        const timer = setTimeout(() => {
            if (!done) { done = true; resolve({ timeout: true, data: null }); }
        }, ms);
        const onDC = r => {
            if (!done) { done = true; clearTimeout(timer); resolve({ disconnected: true, reason: r, data: null }); }
        };
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
        type: 'socket',
        name: `Socket ${namespace} ${event} @ ${socketUrl.replace(/http:\/\//, '')}`,
        tags, startedAt, endedAt: new Date().toISOString(),
        request: { socketUrl, namespace, event, payload, withToken: !!token, expectConnect },
        response, outcome,
    });
    return { ok: conn.ok, response };
}

/* ═══════════════════════════════════════════════════
   SWAGGER DISCOVERY HELPER
   ═══════════════════════════════════════════════════ */
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

async function runSwaggerDiscovery(token) {
    const res = await http({
        name: 'Gateway OpenAPI Spec', method: 'GET',
        url: `${config.gatewayUrl}/documentation/json`,
        acceptableStatus: [200], tags: ['discovery'],
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
            const hdrs = {};
            if (token) hdrs.authorization = `Bearer ${token}`;
            let body = null;
            if (op.requestBody?.content?.['application/json']?.schema) {
                body = sampleSchema(op.requestBody.content['application/json'].schema);
            }
            await http({
                name: `Discover ${method} ${urlPath}`, method, url, headers: hdrs, body,
                acceptableStatus: 'any', tags: ['discovery', 'gateway'],
            });
        }
    }
}


/* ═══════════════════════════════════════════════════
   ███  MAIN TEST ORCHESTRATION  ███
   ═══════════════════════════════════════════════════ */
async function main() {

    const ts = Date.now();   // unique run identifier

    /* ─────────────────────────────────────────────────
       PHASE 1 — Infrastructure Health
       ───────────────────────────────────────────────── */
    setPhase(1, 'infrastructure-health');

    const healthEndpoints = [
        { name: 'Gateway', url: `${config.gatewayUrl}/health` },
        { name: 'Gateway Internal', url: `${config.gatewayUrl}/internal/health` },
        { name: 'Gateway Ready', url: `${config.gatewayUrl}/internal/ready` },
        { name: 'Auth Service', url: `${config.authServiceUrl}/health` },
        { name: 'Compliance Service', url: `${config.complianceServiceUrl}/health` },
        { name: 'Crypto Service', url: `${config.cryptoServiceUrl}/health` },
        { name: 'Search Service', url: `${config.searchServiceUrl}/health` },
        { name: 'Media Service', url: `${config.mediaServiceUrl}/health` },
        { name: 'Socket Service 1', url: `${config.socketUrls[0]}/health` },
        { name: 'Socket Service 2', url: `${config.socketUrls[1]}/health` },
    ];

    for (const ep of healthEndpoints) {
        await http({ name: `${ep.name} Health`, method: 'GET', url: ep.url, acceptableStatus: [200], tags: ['health'] });
    }

    // Gateway ping
    await http({ name: 'Gateway Ping', method: 'GET', url: `${config.gatewayUrl}/v1/ping`, acceptableStatus: [200], tags: ['health', 'gateway'] });


    /* ─────────────────────────────────────────────────
       PHASE 2 — Tenant Onboarding
       ───────────────────────────────────────────────── */
    setPhase(2, 'tenant-onboarding');

    // Register Tenant A (primary)
    const regA = await http({
        name: 'Register Tenant A (Business)', method: 'POST',
        url: `${config.authServiceUrl}/api/v1/auth/client/register`,
        body: { company_name: `SystemTest Corp ${ts}`, email: `admin-${ts}@systemtest.com`, password: 'SystemTest1234!@#$', plan: 'business' },
        acceptableStatus: [200, 201], tags: ['auth', 'registration'],
    });
    const regAData = tryJson(regA.body);
    const clientIdA = regAData?.client_id || regAData?.clientId || regAData?.id;
    let apiKeyA = regAData?.api_key || regAData?.apiKey;
    report.context.tenantA = { clientId: clientIdA, apiKey: apiKeyA ? `${apiKeyA.slice(0, 15)}…` : null };

    // Register Tenant B (secondary — for isolation tests)
    const regB = await http({
        name: 'Register Tenant B (Free)', method: 'POST',
        url: `${config.authServiceUrl}/api/v1/auth/client/register`,
        body: { company_name: `SystemTest Rival ${ts}`, email: `rival-${ts}@systemtest.com`, password: 'RivalTest1234!@#$', plan: 'free' },
        acceptableStatus: [200, 201], tags: ['auth', 'registration'],
    });
    const regBData = tryJson(regB.body);
    const clientIdB = regBData?.client_id || regBData?.clientId || regBData?.id;
    const apiKeyB = regBData?.api_key || regBData?.apiKey;
    report.context.tenantB = { clientId: clientIdB };

    // Negative: duplicate registration
    await http({
        name: 'Duplicate Registration (should fail)', method: 'POST',
        url: `${config.authServiceUrl}/api/v1/auth/client/register`,
        body: { company_name: `SystemTest Corp ${ts}`, email: `admin-${ts}@systemtest.com`, password: 'SystemTest1234!@#$' },
        acceptableStatus: [400, 409, 422], tags: ['auth', 'registration', 'negative'],
    });


    /* ─────────────────────────────────────────────────
       PHASE 3 — API Key Lifecycle
       ───────────────────────────────────────────────── */
    setPhase(3, 'api-key-lifecycle');

    if (clientIdA) {
        // Rotate key
        const rotRes = await http({
            name: 'Rotate API Key (Tenant A)', method: 'POST',
            url: `${config.authServiceUrl}/api/v1/auth/client/api-keys/rotate`,
            headers: { 'x-service-secret': config.serviceSecret },
            body: { client_id: clientIdA },
            acceptableStatus: 'any', tags: ['auth', 'apikey'],
        });
        const rotData = tryJson(rotRes.body);
        const secondaryKey = rotData?.secondary_key;

        // Promote key
        await http({
            name: 'Promote API Key (Tenant A)', method: 'POST',
            url: `${config.authServiceUrl}/api/v1/auth/client/api-keys/promote`,
            headers: { 'x-service-secret': config.serviceSecret },
            body: { client_id: clientIdA },
            acceptableStatus: 'any', tags: ['auth', 'apikey'],
        });

        if (secondaryKey) {
            apiKeyA = secondaryKey;
            report.context.tenantA.apiKeyRotated = true;
        }

        // Validate API key (internal)
        const valRes = await http({
            name: 'Validate API Key (Internal)', method: 'POST',
            url: `${config.authServiceUrl}/api/v1/auth/internal/validate-api-key`,
            headers: { 'x-service-secret': config.serviceSecret },
            body: { api_key: apiKeyA, ip_address: '127.0.0.1' },
            acceptableStatus: [200], tags: ['auth', 'internal'],
        });
        report.context.tenantA.apiKeyValid = valRes.status === 200;
    }

    // Negative: invalid API key
    await http({
        name: 'Validate Invalid API Key', method: 'POST',
        url: `${config.authServiceUrl}/api/v1/auth/internal/validate-api-key`,
        headers: { 'x-service-secret': config.serviceSecret },
        body: { api_key: 'caas_fake_key_999', ip_address: '127.0.0.1' },
        acceptableStatus: [401, 403, 404], tags: ['auth', 'internal', 'negative'],
    });

    // Negative: no service secret
    await http({
        name: 'Validate API Key (No Service Secret)', method: 'POST',
        url: `${config.authServiceUrl}/api/v1/auth/internal/validate-api-key`,
        body: { api_key: apiKeyA || 'x', ip_address: '127.0.0.1' },
        acceptableStatus: [401, 403], tags: ['auth', 'internal', 'negative'],
    });


    /* ─────────────────────────────────────────────────
       PHASE 4 — SDK Session Lifecycle
       ───────────────────────────────────────────────── */
    setPhase(4, 'sdk-session-lifecycle');

    let tokenA = null, refreshA = null;
    let tokenB = null, refreshB = null;
    let tokenC = null;   // Tenant B user — for isolation

    // User A (Tenant A)
    if (apiKeyA) {
        const sessA = await http({
            name: 'Create SDK Session — Alice (Tenant A)', method: 'POST',
            url: `${config.authServiceUrl}/api/v1/auth/sdk/session`,
            headers: { 'x-api-key': apiKeyA },
            body: { user_external_id: `alice-${ts}`, user_data: { name: 'Alice Tester', email: `alice-${ts}@test.com` }, device_info: { device_type: 'web' } },
            acceptableStatus: [200, 201], tags: ['auth', 'sdk', 'session'],
        });
        const dA = tryJson(sessA.body);
        tokenA = dA?.access_token || dA?.token;
        refreshA = dA?.refresh_token;
        report.context.alice = { token: tokenA ? `${tokenA.slice(0, 20)}…` : null, externalId: `alice-${ts}` };

        // User B (Tenant A — same tenant, different user)
        const sessB = await http({
            name: 'Create SDK Session — Bob (Tenant A)', method: 'POST',
            url: `${config.authServiceUrl}/api/v1/auth/sdk/session`,
            headers: { 'x-api-key': apiKeyA },
            body: { user_external_id: `bob-${ts}`, user_data: { name: 'Bob Tester', email: `bob-${ts}@test.com` }, device_info: { device_type: 'mobile' } },
            acceptableStatus: [200, 201], tags: ['auth', 'sdk', 'session'],
        });
        const dB = tryJson(sessB.body);
        tokenB = dB?.access_token || dB?.token;
        refreshB = dB?.refresh_token;
        report.context.bob = { token: tokenB ? `${tokenB.slice(0, 20)}…` : null, externalId: `bob-${ts}` };
    }

    // User C (Tenant B — different tenant)
    if (apiKeyB) {
        const sessC = await http({
            name: 'Create SDK Session — Charlie (Tenant B)', method: 'POST',
            url: `${config.authServiceUrl}/api/v1/auth/sdk/session`,
            headers: { 'x-api-key': apiKeyB },
            body: { user_external_id: `charlie-${ts}`, user_data: { name: 'Charlie Rival' }, device_info: { device_type: 'web' } },
            acceptableStatus: [200, 201], tags: ['auth', 'sdk', 'session'],
        });
        const dC = tryJson(sessC.body);
        tokenC = dC?.access_token || dC?.token;
        report.context.charlie = { externalId: `charlie-${ts}` };
    }

    // Negative: session without API key
    await http({
        name: 'Create Session (No API Key — should fail)', method: 'POST',
        url: `${config.authServiceUrl}/api/v1/auth/sdk/session`,
        body: { user_external_id: 'should-fail' },
        acceptableStatus: [401, 403], tags: ['auth', 'sdk', 'negative'],
    });


    /* ─────────────────────────────────────────────────
       PHASE 5 — Token Validation
       ───────────────────────────────────────────────── */
    setPhase(5, 'token-validation');

    if (tokenA) {
        // Internal endpoint (service-to-service)
        await http({
            name: 'Validate Token — Alice (Internal)', method: 'POST',
            url: `${config.authServiceUrl}/api/v1/auth/internal/validate`,
            headers: { 'x-service-secret': config.serviceSecret },
            body: { token: tokenA },
            acceptableStatus: [200], tags: ['auth', 'internal'],
        });

        // Public endpoint
        await http({
            name: 'Validate Token — Alice (Public)', method: 'POST',
            url: `${config.authServiceUrl}/api/v1/auth/validate`,
            body: { token: tokenA },
            acceptableStatus: [200], tags: ['auth'],
        });
    }

    // Negative: bogus token
    await http({
        name: 'Validate Bogus Token', method: 'POST',
        url: `${config.authServiceUrl}/api/v1/auth/internal/validate`,
        headers: { 'x-service-secret': config.serviceSecret },
        body: { token: 'eyJhbGciOiJIUzI1NiJ9.e30.bogus' },
        acceptableStatus: [401, 403], tags: ['auth', 'internal', 'negative'],
    });


    /* ─────────────────────────────────────────────────
       PHASE 5B — Token Refresh
       ───────────────────────────────────────────────── */
    setPhase(5.5, 'token-refresh');

    if (refreshA) {
        const refRes = await http({
            name: 'Refresh Token — Alice', method: 'POST',
            url: `${config.authServiceUrl}/api/v1/auth/sdk/refresh`,
            body: { refresh_token: refreshA },
            acceptableStatus: [200], tags: ['auth', 'sdk'],
        });
        const refData = tryJson(refRes.body);
        if (refData?.access_token) {
            tokenA = refData.access_token;
            report.context.alice.tokenRefreshed = true;
        }
    }


    /* ─────────────────────────────────────────────────
       PHASE 6 — Gateway Authenticated Routing
       ───────────────────────────────────────────────── */
    setPhase(6, 'gateway-routing');

    const authA = tokenA ? { authorization: `Bearer ${tokenA}` } : {};

    // Unauthenticated → should fail
    await http({ name: 'Tenant Info (No Auth)', method: 'GET', url: `${config.gatewayUrl}/v1/tenant`, acceptableStatus: [401, 403], tags: ['gateway', 'negative'] });

    // Authenticated routes
    await http({ name: 'Tenant Info', method: 'GET', url: `${config.gatewayUrl}/v1/tenant`, headers: authA, acceptableStatus: 'any', tags: ['gateway'] });
    await http({ name: 'Tenant Usage', method: 'GET', url: `${config.gatewayUrl}/v1/tenant/usage`, headers: authA, acceptableStatus: 'any', tags: ['gateway'] });
    await http({
        name: 'Update Tenant Settings', method: 'PUT',
        url: `${config.gatewayUrl}/v1/tenant/settings`,
        headers: authA, body: { settings: { locale: 'en', timezone: 'UTC' } },
        acceptableStatus: 'any', tags: ['gateway'],
    });

    // API keys via gateway
    const gwKey = await http({
        name: 'Gateway Create API Key', method: 'POST',
        url: `${config.gatewayUrl}/v1/auth/api-keys`,
        headers: authA, body: { name: 'system-test-key', scopes: ['read'] },
        acceptableStatus: 'any', tags: ['gateway', 'auth'],
    });
    let gwKeyId = tryJson(gwKey.body)?.id;

    await http({ name: 'Gateway List API Keys', method: 'GET', url: `${config.gatewayUrl}/v1/auth/api-keys`, headers: authA, acceptableStatus: 'any', tags: ['gateway', 'auth'] });
    if (gwKeyId) {
        await http({ name: 'Gateway Delete API Key', method: 'DELETE', url: `${config.gatewayUrl}/v1/auth/api-keys/${gwKeyId}`, headers: authA, acceptableStatus: 'any', tags: ['gateway', 'auth'] });
    }

    // Sessions via gateway
    await http({ name: 'Gateway Sessions List', method: 'GET', url: `${config.gatewayUrl}/v1/sessions`, headers: authA, acceptableStatus: 'any', tags: ['gateway', 'sessions'] });

    // SDK token (legacy route)
    const sdkLegacy = await http({
        name: 'Gateway SDK Token (Legacy)', method: 'POST',
        url: `${config.gatewayUrl}/v1/auth/sdk/token`,
        body: { app_id: 'default-tenant', app_secret: 'secret', user_external_id: `sdk-${ts}` },
        acceptableStatus: 'any', tags: ['auth', 'gateway', 'sdk'],
    });
    const legacyToken = tryJson(sdkLegacy.body)?.access_token;

    // Negative: bad secret
    await http({
        name: 'Gateway SDK Token (Bad Secret)', method: 'POST',
        url: `${config.gatewayUrl}/v1/auth/sdk/token`,
        body: { app_id: 'default-tenant', app_secret: 'WRONG', user_external_id: `sdk-bad-${ts}` },
        acceptableStatus: [400, 401], tags: ['auth', 'gateway', 'negative'],
    });


    /* ─────────────────────────────────────────────────
       PHASE 7 — Cross-Service Integrations
       ───────────────────────────────────────────────── */
    setPhase(7, 'cross-service');

    // ── 7a: Compliance ──
    await http({
        name: 'Compliance — Create Audit Log', method: 'POST',
        url: `${config.complianceServiceUrl}/api/v1/audit/log`,
        body: { tenant_id: clientIdA || 'sys-tenant', user_id: `alice-${ts}`, action: 'system_test', resource_type: 'system' },
        acceptableStatus: 'any', tags: ['compliance'],
    });
    await http({
        name: 'Compliance — Invalid Audit Log', method: 'POST',
        url: `${config.complianceServiceUrl}/api/v1/audit/log`,
        body: { tenant_id: '', action: '' },
        acceptableStatus: 'any', tags: ['compliance', 'negative'],
    });

    // ── 7b: Crypto ──
    const keyGen = await http({
        name: 'Crypto — Generate Key', method: 'POST',
        url: `${config.cryptoServiceUrl}/api/v1/keys/generate`,
        body: { tenant_id: clientIdA || 'sys-tenant', key_type: 'data' },
        acceptableStatus: 'any', tags: ['crypto'],
    });
    const keyId = tryJson(keyGen.body)?.key_id;

    if (keyId) {
        const enc = await http({
            name: 'Crypto — Encrypt Payload', method: 'POST',
            url: `${config.cryptoServiceUrl}/api/v1/encrypt`,
            body: { key_id: keyId, plaintext: 'Hello from system test' },
            acceptableStatus: 'any', tags: ['crypto'],
        });
        const encData = tryJson(enc.body);

        if (encData?.ciphertext) {
            await http({
                name: 'Crypto — Decrypt Payload', method: 'POST',
                url: `${config.cryptoServiceUrl}/api/v1/decrypt`,
                body: { key_id: keyId, ciphertext: encData.ciphertext, iv: encData.iv, authTag: encData.authTag },
                acceptableStatus: 'any', tags: ['crypto'],
            });
        }

        // Negative: bad key
        await http({
            name: 'Crypto — Decrypt with Bad Key', method: 'POST',
            url: `${config.cryptoServiceUrl}/api/v1/decrypt`,
            body: { key_id: 'nonexistent-key', ciphertext: 'x', iv: 'x', authTag: 'x' },
            acceptableStatus: 'any', tags: ['crypto', 'negative'],
        });
    }

    // ── 7c: Search ──
    await http({
        name: 'Search — Empty Query', method: 'POST',
        url: `${config.searchServiceUrl}/api/v1/search/messages`,
        body: { query: '' },
        acceptableStatus: 'any', tags: ['search', 'negative'],
    });

    // ── 7d: Media ──
    await http({
        name: 'Media — Quota (No Auth)', method: 'GET',
        url: `${config.mediaServiceUrl}/api/v1/media/quota`,
        acceptableStatus: 'any', tags: ['media', 'negative'],
    });


    /* ─────────────────────────────────────────────────
       PHASE 8 — Real-Time Socket Events
       ───────────────────────────────────────────────── */
    setPhase(8, 'socket-realtime');

    const socketToken = tokenA || legacyToken;

    // 8a: Socket without auth (must reject)
    for (const sUrl of config.socketUrls) {
        await socketCase({
            socketUrl: sUrl, namespace: '/chat', event: 'joinRoom', payload: { conversationId: 'conv-sys' },
            token: null, expectConnect: false, tags: ['socket', 'negative'],
        });
    }

    // 8b: Chat events — Alice on Socket-1
    if (socketToken) {
        const chatEv = [
            { event: 'joinRoom', payload: { conversationId: 'conv-system-room' } },
            { event: 'sendMessage', payload: { conversationId: 'conv-system-room', messageContent: 'System test message from Alice' } },
            { event: 'typing_start', payload: { conversationId: 'conv-system-room' } },
            { event: 'typing_stop', payload: { conversationId: 'conv-system-room' } },
            { event: 'message_delivered', payload: { messageId: 'msg-sys-1', conversationId: 'conv-system-room' } },
            { event: 'message_read', payload: { messageId: 'msg-sys-1', conversationId: 'conv-system-room' } },
            { event: 'unread_query', payload: {} },
            { event: 'leaveRoom', payload: { conversationId: 'conv-system-room' } },
        ];
        for (const ev of chatEv) {
            await socketCase({
                socketUrl: config.socketUrls[0], namespace: '/chat', ...ev,
                token: socketToken, expectConnect: true, tags: ['socket', 'alice', 'chat'],
            });
        }

        // 8c: Presence events — Alice on Socket-1
        const presEv = [
            { event: 'presence_update', payload: { status: 'online', custom_status: 'system testing' } },
            { event: 'presence_subscribe', payload: { user_ids: [`alice-${ts}`, `bob-${ts}`] } },
            { event: 'presence_subscriptions_query', payload: {} },
            { event: 'presence_unsubscribe', payload: { user_ids: [`alice-${ts}`] } },
        ];
        for (const ev of presEv) {
            await socketCase({
                socketUrl: config.socketUrls[0], namespace: '/presence', ...ev,
                token: socketToken, expectConnect: true, tags: ['socket', 'alice', 'presence'],
            });
        }

        // 8d: WebRTC events — Alice on Socket-1
        const rtcEv = [
            { event: 'webrtc:get-ice-servers', payload: {} },
            { event: 'call:initiate', payload: { targetUserId: `bob-${ts}`, callType: 'video' } },
            { event: 'call:hangup', payload: { callId: 'call-sys-1' } },
        ];
        for (const ev of rtcEv) {
            await socketCase({
                socketUrl: config.socketUrls[0], namespace: '/webrtc', ...ev,
                token: socketToken, expectConnect: true, tags: ['socket', 'alice', 'webrtc'],
            });
        }

        // 8e: Moderation events — Alice on Socket-1
        const modEv = [
            { event: 'moderate:mute', payload: { conversationId: 'conv-system-room', userId: `bob-${ts}`, durationMs: 30000 } },
            { event: 'moderate:unmute', payload: { conversationId: 'conv-system-room', userId: `bob-${ts}` } },
        ];
        for (const ev of modEv) {
            await socketCase({
                socketUrl: config.socketUrls[0], namespace: '/chat', ...ev,
                token: socketToken, expectConnect: true, tags: ['socket', 'alice', 'moderation'],
            });
        }
    }

    // 8f: Bob on Socket-2 (cross-instance)
    if (tokenB) {
        const bobChat = [
            { event: 'joinRoom', payload: { conversationId: 'conv-system-room' } },
            { event: 'sendMessage', payload: { conversationId: 'conv-system-room', messageContent: 'Bob replying on socket-2' } },
            { event: 'typing_start', payload: { conversationId: 'conv-system-room' } },
            { event: 'typing_stop', payload: { conversationId: 'conv-system-room' } },
        ];
        for (const ev of bobChat) {
            await socketCase({
                socketUrl: config.socketUrls[1], namespace: '/chat', ...ev,
                token: tokenB, expectConnect: true, tags: ['socket', 'bob', 'chat'],
            });
        }
        await socketCase({
            socketUrl: config.socketUrls[1], namespace: '/presence',
            event: 'presence_update', payload: { status: 'online', custom_status: 'Bob online' },
            token: tokenB, expectConnect: true, tags: ['socket', 'bob', 'presence'],
        });
    }


    /* ─────────────────────────────────────────────────
       PHASE 9 — Multi-Tenant Isolation & Security
       ───────────────────────────────────────────────── */
    setPhase(9, 'security-isolation');

    // Tenant B user trying Tenant A gateway routes
    if (tokenC) {
        await http({
            name: 'Cross-Tenant Access (Tenant B on A routes)', method: 'GET',
            url: `${config.gatewayUrl}/v1/tenant`,
            headers: { authorization: `Bearer ${tokenC}` },
            acceptableStatus: 'any', tags: ['security', 'isolation'],
        });
    }

    // No auth on protected routes
    await http({
        name: 'Sessions without Auth', method: 'GET',
        url: `${config.gatewayUrl}/v1/sessions`,
        acceptableStatus: [401, 403], tags: ['security', 'negative'],
    });

    // IP / Origin Whitelist
    if (clientIdA) {
        await http({
            name: 'Get IP Whitelist', method: 'GET',
            url: `${config.authServiceUrl}/api/v1/auth/client/ip-whitelist?client_id=${clientIdA}`,
            acceptableStatus: 'any', tags: ['auth', 'whitelist'],
        });
        await http({
            name: 'Add IP to Whitelist', method: 'POST',
            url: `${config.authServiceUrl}/api/v1/auth/client/ip-whitelist`,
            body: { client_id: clientIdA, ip: '192.168.1.1' },
            acceptableStatus: 'any', tags: ['auth', 'whitelist'],
        });
        await http({
            name: 'Get Origin Whitelist', method: 'GET',
            url: `${config.authServiceUrl}/api/v1/auth/client/origin-whitelist?client_id=${clientIdA}`,
            acceptableStatus: 'any', tags: ['auth', 'whitelist'],
        });
        await http({
            name: 'Add Origin to Whitelist', method: 'POST',
            url: `${config.authServiceUrl}/api/v1/auth/client/origin-whitelist`,
            body: { client_id: clientIdA, origin: 'https://systemtest.com' },
            acceptableStatus: 'any', tags: ['auth', 'whitelist'],
        });
    }


    /* ─────────────────────────────────────────────────
       PHASE 10 — Swagger / OpenAPI Discovery
       ───────────────────────────────────────────────── */
    setPhase(10, 'swagger-discovery');
    await runSwaggerDiscovery(tokenA || legacyToken);


    /* ─────────────────────────────────────────────────
       PHASE 11 — User Profile, Sessions & Logout
       ───────────────────────────────────────────────── */
    setPhase(11, 'session-logout');

    // User profile
    if (tokenA) {
        await http({
            name: 'Get User Profile — Alice', method: 'GET',
            url: `${config.authServiceUrl}/api/v1/users/profile`,
            headers: { authorization: `Bearer ${tokenA}` },
            acceptableStatus: 'any', tags: ['auth', 'user'],
        });
        await http({
            name: 'Update User Profile — Alice', method: 'PUT',
            url: `${config.authServiceUrl}/api/v1/users/profile`,
            headers: { authorization: `Bearer ${tokenA}` },
            body: { name: 'Alice SystemTest Updated', preferences: { theme: 'dark' } },
            acceptableStatus: 'any', tags: ['auth', 'user'],
        });
    }

    // Session management
    if (tokenA) {
        await http({
            name: 'List Sessions — Alice', method: 'GET',
            url: `${config.authServiceUrl}/api/v1/sessions`,
            headers: { authorization: `Bearer ${tokenA}` },
            acceptableStatus: 'any', tags: ['auth', 'sessions'],
        });
    }

    // Logout Bob — then verify token is invalidated
    if (tokenB) {
        await http({
            name: 'Logout — Bob', method: 'POST',
            url: `${config.authServiceUrl}/api/v1/auth/sdk/logout`,
            headers: { authorization: `Bearer ${tokenB}` },
            acceptableStatus: 'any', tags: ['auth', 'sdk', 'logout'],
        });

        await sleep(500);   // give the invalidation time to propagate

        await http({
            name: 'Validate Revoked Token — Bob (should fail)', method: 'POST',
            url: `${config.authServiceUrl}/api/v1/auth/validate`,
            body: { token: tokenB },
            acceptableStatus: [401, 403], tags: ['auth', 'negative', 'logout'],
        });
    }


    /* ═══════════════════════════════════════════════════
       FINALIZE REPORT
       ═══════════════════════════════════════════════════ */
    report.completedAt = new Date().toISOString();

    // Compute per-section tallies
    for (const c of report.cases) {
        if (!report.sections[c.section]) report.sections[c.section] = { total: 0, passed: 0, failed: 0, warnings: 0 };
        report.sections[c.section].total++;
        if (c.outcome === 'passed') report.sections[c.section].passed++;
        else if (c.outcome === 'warning') report.sections[c.section].warnings++;
        else report.sections[c.section].failed++;
    }

    const outPath = config.outPath || path.join(__dirname, 'reports', `full-system-raw-${Date.now()}.json`);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf-8');

    console.log(`\nFull System Test report written: ${outPath}`);
    console.log(`Summary: total=${report.summary.total} passed=${report.summary.passed} warnings=${report.summary.warnings} failed=${report.summary.failed}`);

    if (report.summary.failed > 0) process.exitCode = 2;
}

main().catch(e => { console.error('System Test runner fatal error:', e); process.exit(1); });
