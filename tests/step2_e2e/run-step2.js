const fs = require('fs');
const path = require('path');

const cfg = {
  gateway: process.env.GATEWAY_URL || 'http://gateway:3000',
  adminPortal: process.env.ADMIN_PORTAL_URL || 'http://admin-portal:3100',
  outDir: process.env.E2E_OUT_DIR || '/tests/step2_e2e/reports',
  timeoutMs: Number(process.env.E2E_TIMEOUT_MS || 12000),
};

const SENSITIVE_KEY_PATTERN = /(token|secret|password|authorization|cookie|api[_-]?key)/i;

const report = {
  generatedAt: new Date().toISOString(),
  summary: { total: 0, passed: 0, failed: 0 },
  phases: {},
  owners: {},
  context: {},
  cases: [],
};

let phase = 'setup';

function ensurePhase(name) {
  if (!report.phases[name]) report.phases[name] = { total: 0, passed: 0, failed: 0 };
}

function inferOwner(name, details = {}) {
  const url = String(details.url || '');
  if (url.includes('/api/v1/auth/client') || url.includes('/api/auth/')) return 'auth-service';
  if (url.includes('/api/v1/admin') || url.includes('/api/v1/audit') || url.includes('/api/v1/tenant')) return 'gateway';
  if (url.includes('/api/v1/sdk')) return 'gateway+auth-service';
  if (url.includes('admin-portal')) return 'admin-portal';
  return 'platform';
}

function redact(value) {
  if (Array.isArray(value)) return value.map((v) => redact(v));
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (SENSITIVE_KEY_PATTERN.test(k)) {
      out[k] = typeof v === 'string' && v.length > 6 ? `${v.slice(0, 3)}***redacted***` : '***redacted***';
      continue;
    }
    out[k] = redact(v);
  }
  return out;
}

function sanitizeHeaders(headers) {
  const out = {};
  for (const [k, v] of Object.entries(headers || {})) {
    if (SENSITIVE_KEY_PATTERN.test(k)) continue;
    out[k] = v;
  }
  return out;
}

function setPhase(name) {
  phase = name;
  ensurePhase(name);
  console.log(`\n[PHASE] ${name}`);
}

function record(name, ok, details = {}) {
  ensurePhase(phase);
  const owner = inferOwner(name, details);
  report.summary.total += 1;
  report.phases[phase].total += 1;
  if (ok) {
    report.summary.passed += 1;
    report.phases[phase].passed += 1;
  } else {
    report.summary.failed += 1;
    report.phases[phase].failed += 1;
  }

  if (!report.owners[owner]) report.owners[owner] = { total: 0, passed: 0, failed: 0 };
  report.owners[owner].total += 1;
  if (ok) report.owners[owner].passed += 1;
  else report.owners[owner].failed += 1;

  report.cases.push({ phase, owner, name, status: ok ? 'passed' : 'failed', details, timestamp: new Date().toISOString() });
  console.log(`[${ok ? 'PASS' : 'FAIL'}] (${owner}) ${name}`);
}

async function httpCase(name, method, url, options = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), cfg.timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      headers: options.headers || {},
      body: options.body ? JSON.stringify(options.body) : undefined,
      redirect: options.noRedirect ? 'manual' : 'follow',
      signal: ctrl.signal,
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    const expected = options.expectStatus;
    const ok = expected === 'any'
      ? true
      : Array.isArray(expected)
        ? expected.includes(res.status)
        : expected
          ? res.status === expected
          : (res.status >= 200 && res.status < 300);

    record(name, ok, {
      method,
      url,
      status: res.status,
      headers: sanitizeHeaders(Object.fromEntries(res.headers.entries())),
      response: redact(json || text),
      requestBody: redact(options.body || null),
    });
    return { res, text, json, ok };
  } catch (error) {
    record(name, false, { method, url, error: String(error) });
    return { ok: false, text: '' };
  } finally {
    clearTimeout(timer);
  }
}

function md() {
  const lines = [];
  lines.push('# Step2 E2E Report');
  lines.push(`- Generated: ${report.generatedAt}`);
  lines.push(`- Total: ${report.summary.total}`);
  lines.push(`- Passed: ${report.summary.passed}`);
  lines.push(`- Failed: ${report.summary.failed}`);
  lines.push('');
  lines.push('## Phase Breakdown');
  lines.push('| Phase | Total | Passed | Failed |');
  lines.push('|---|---:|---:|---:|');
  Object.entries(report.phases).forEach(([k, v]) => lines.push(`| ${k} | ${v.total} | ${v.passed} | ${v.failed} |`));
  lines.push('');
  lines.push('## Owner Breakdown');
  lines.push('| Owner | Total | Passed | Failed |');
  lines.push('|---|---:|---:|---:|');
  Object.entries(report.owners).forEach(([k, v]) => lines.push(`| ${k} | ${v.total} | ${v.passed} | ${v.failed} |`));
  lines.push('');
  const failed = report.cases.filter((c) => c.status === 'failed');
  if (!failed.length) lines.push('## Failed Cases\nNone');
  else {
    lines.push('## Failed Cases');
    failed.forEach((c, idx) => {
      lines.push(`### ${idx + 1}. ${c.name}`);
      lines.push('```json');
      lines.push(JSON.stringify(c.details, null, 2));
      lines.push('```');
    });
  }
  return lines.join('\n');
}

async function main() {
  const ts = Date.now();
  const email = `step2-${ts}@example.com`;
  const password = 'Step2Password-123!';

  setPhase('01-health');
  await httpCase('Gateway health', 'GET', `${cfg.gateway}/health`, { expectStatus: 200 });
  await httpCase('Admin portal health', 'GET', `${cfg.adminPortal}/api/health`, { expectStatus: 200 });

  setPhase('02-register-login');
  const reg = await httpCase('Register client', 'POST', `${cfg.adminPortal}/api/auth/register`, {
    expectStatus: [200, 201],
    headers: { 'content-type': 'application/json' },
    body: {
      company_name: `Step2 Org ${ts}`,
      email,
      password,
      plan: 'business',
      project: { name: `Step2 Project ${ts}`, stack: 'react', environment: 'development' },
    },
  });
  report.context.client_id = reg.json?.client_id || null;

  const login = await httpCase('Admin login', 'POST', `${cfg.adminPortal}/api/auth/login`, {
    expectStatus: 200,
    headers: { 'content-type': 'application/json' },
    body: { email, password },
  });
  const loginBody = login.json || {};
  record('Login body has no raw tokens', !('access_token' in loginBody) && !('refresh_token' in loginBody), { keys: Object.keys(loginBody) });

  const gwLogin = await httpCase('Gateway login', 'POST', `${cfg.gateway}/api/v1/auth/client/login`, {
    expectStatus: 200,
    headers: { 'content-type': 'application/json' },
    body: { email, password },
  });
  const accessToken = gwLogin.json?.access_token || null;
  report.context.access_token_prefix = accessToken ? `${accessToken.slice(0, 12)}...` : null;

  setPhase('03-real-data-modules');
  const authHeaders = accessToken ? { authorization: `Bearer ${accessToken}` } : {};
  await httpCase('Tenant info', 'GET', `${cfg.gateway}/api/v1/tenant`, { expectStatus: [200, 404], headers: authHeaders });
  await httpCase('Dashboard stats', 'GET', `${cfg.gateway}/api/v1/admin/dashboard`, { expectStatus: [200, 404], headers: authHeaders });
  await httpCase('Monitoring data', 'GET', `${cfg.gateway}/api/v1/admin/monitoring`, { expectStatus: [200, 404], headers: authHeaders });
  await httpCase('Audit query', 'GET', `${cfg.gateway}/api/v1/audit/query?page=1&limit=5`, { expectStatus: [200, 404], headers: authHeaders });
  await httpCase('Client API key inventory', 'GET', `${cfg.gateway}/api/v1/auth/client/api-keys`, { expectStatus: [200, 404], headers: authHeaders });
  await httpCase('IP whitelist fetch', 'GET', `${cfg.gateway}/api/v1/auth/client/ip-whitelist`, { expectStatus: [200, 404], headers: authHeaders });
  await httpCase('Origin whitelist fetch', 'GET', `${cfg.gateway}/api/v1/auth/client/origin-whitelist`, { expectStatus: [200, 404], headers: authHeaders });

  setPhase('04-browser-security-cors-csrf');
  await httpCase('CORS preflight allowed origin', 'OPTIONS', `${cfg.gateway}/api/v1/auth/client/login`, {
    expectStatus: [200, 204],
    headers: {
      Origin: 'http://localhost:3100',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type,authorization,x-correlation-id,idempotency-key,x-project-id',
    },
  });

  await httpCase('CORS preflight disallowed origin blocked', 'OPTIONS', `${cfg.gateway}/api/v1/auth/client/login`, {
    expectStatus: 403,
    headers: {
      Origin: 'http://evil.example',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type,authorization',
    },
  });

  const leakProbeToken = `eyJ.step2.${ts}.sensitive`;
  const probe = await httpCase('Invalid bearer leakage probe', 'GET', `${cfg.gateway}/api/v1/tenant`, {
    expectStatus: [400, 401, 403],
    headers: { authorization: `Bearer ${leakProbeToken}` },
  });
  record('Invalid bearer token not echoed in error payload', !(probe.text || '').includes(leakProbeToken), { status: probe.res?.status || null });

  await httpCase('CSRF required on refresh route', 'POST', `${cfg.adminPortal}/api/auth/refresh`, {
    expectStatus: [401, 403],
  });

  await httpCase('CSRF required on logout route', 'POST', `${cfg.adminPortal}/api/auth/logout`, {
    expectStatus: [401, 403],
  });

  report.completedAt = new Date().toISOString();
  fs.mkdirSync(cfg.outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(cfg.outDir, `step2-e2e-report-${stamp}.json`);
  const mdPath = path.join(cfg.outDir, `step2-e2e-report-${stamp}.md`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');
  fs.writeFileSync(mdPath, md(), 'utf-8');

  console.log(`JSON report: ${jsonPath}`);
  console.log(`MD report: ${mdPath}`);
  console.log(`Summary: total=${report.summary.total} passed=${report.summary.passed} failed=${report.summary.failed}`);

  if (report.summary.failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
