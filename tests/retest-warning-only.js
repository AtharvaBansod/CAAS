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
const inputReport = args.input;
if (!inputReport) {
  console.error('Missing --input <report.json>');
  process.exit(1);
}

const timeoutMs = Number(args.timeoutMs || 8000);
const ackTimeoutMs = Number(args.ackTimeoutMs || 1800);
const gatewayUrl = args.gatewayUrl || 'http://gateway:3000';
const authServiceUrl = args.authServiceUrl || 'http://auth-service:3001';

function normalizeHost(url) {
  return url
    .replace('http://localhost:3000', gatewayUrl)
    .replace('http://localhost:3001', authServiceUrl)
    .replace('http://localhost:3002', 'http://socket-service-1:3001')
    .replace('http://localhost:3003', 'http://socket-service-2:3001')
    .replace('http://localhost:3005', 'http://media-service:3005')
    .replace('http://localhost:3006', 'http://search-service:3006')
    .replace('http://localhost:3007', 'http://auth-service:3001')
    .replace('http://localhost:3008', 'http://compliance-service:3008')
    .replace('http://localhost:3009', 'http://crypto-service:3009');
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function getFreshToken() {
  const response = await fetchWithTimeout(`${gatewayUrl}/v1/auth/sdk/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      app_id: 'default-tenant',
      app_secret: 'secret',
      user_external_id: `warn-retest-${Date.now()}`,
    }),
  });

  if (!response.ok) return null;
  const body = await response.json();
  return body.access_token || null;
}

async function connectSocket(socketUrl, namespace, token) {
  return new Promise((resolve) => {
    const socket = io(`${socketUrl}${namespace}`, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      auth: token ? { token } : {},
      timeout: timeoutMs,
      reconnection: false,
    });

    let done = false;
    const finish = (payload) => {
      if (done) return;
      done = true;
      resolve(payload);
    };

    socket.on('connect', () => finish({ ok: true, socket }));
    socket.on('connect_error', (error) => finish({ ok: false, error: error.message, socket }));
    setTimeout(() => finish({ ok: false, error: 'connect timeout', socket }), timeoutMs);
  });
}

async function emitWithAck(socket, event, payload) {
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
      resolve({ disconnected: true, reason });
    };

    const onConnectError = (error) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      cleanup();
      resolve({ connectError: error?.message || String(error) });
    };

    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      cleanup();
      resolve({ timeout: true });
    }, ackTimeoutMs);

    socket.once('disconnect', onDisconnect);
    socket.once('connect_error', onConnectError);

    socket.emit(event, payload, (data) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      cleanup();
      resolve({ data });
    });
  });
}

(async () => {
  const inputPath = path.isAbsolute(inputReport) ? inputReport : path.join(process.cwd(), inputReport);
  const data = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  const warningCases = (data.cases || []).filter((item) => item.outcome === 'warning');

  const freshToken = await getFreshToken();
  const summary = { total: warningCases.length, passed: 0, warning: 0, failed: 0 };
  const results = [];

  for (const testCase of warningCases) {
    if (testCase.type === 'http') {
      const request = testCase.request || {};
      const method = request.method || 'GET';
      const url = normalizeHost(request.url || '');
      const headers = { ...(request.headers || {}) };
      if (headers.authorization && freshToken) {
        headers.authorization = `Bearer ${freshToken}`;
      }

      const options = { method, headers };
      if (request.body !== undefined && request.body !== null) {
        if (!options.headers['content-type']) options.headers['content-type'] = 'application/json';
        options.body = typeof request.body === 'string' ? request.body : JSON.stringify(request.body);
      }

      try {
        const response = await fetchWithTimeout(url, options);
        const bodyText = await response.text();
        const improved = response.status < 500;
        const outcome = improved ? 'passed' : 'warning';
        summary[outcome] += 1;
        results.push({ name: testCase.name, type: 'http', status: response.status, outcome, body: bodyText.slice(0, 300) });
      } catch (error) {
        summary.failed += 1;
        results.push({ name: testCase.name, type: 'http', outcome: 'failed', error: error.message || String(error) });
      }
      continue;
    }

    if (testCase.type === 'socket') {
      const request = testCase.request || {};
      const token = request.withAuthToken ? freshToken : null;
      const connection = await connectSocket(request.socketUrl, request.namespace, token);
      if (!connection.ok) {
        const outcome = request.withAuthToken ? 'warning' : 'passed';
        summary[outcome] += 1;
        results.push({ name: testCase.name, type: 'socket', outcome, connectError: connection.error });
        continue;
      }

      const ack = await emitWithAck(connection.socket, request.event, request.payload || {});
      connection.socket.disconnect();

      const hasFailure = ack.timeout || ack.connectError || ack.disconnected;
      const outcome = hasFailure ? 'warning' : 'passed';
      summary[outcome] += 1;
      results.push({ name: testCase.name, type: 'socket', outcome, ack });
      continue;
    }

    summary.warning += 1;
    results.push({ name: testCase.name, type: testCase.type, outcome: 'warning', note: 'Unsupported test type' });
  }

  console.log(JSON.stringify({ summary, sample: results.slice(0, 40) }, null, 2));

  if (summary.failed > 0) process.exit(2);
})();
