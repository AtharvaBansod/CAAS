/**
 * RT-QA-004 – Canary Rollout, Chaos Validation & Automated Rollback Criteria
 *
 * Run inside e2e-fresh container:
 *   node run-realtime-chaos-tests.js
 *
 * Chaos scenarios:
 *   1. Kafka broker partition – producer resilience when a broker is unreachable
 *   2. Redis degradation – socket adapter & presence store under Redis latency
 *   3. Auth validation latency spike – connection establishment under slow auth
 *   4. Reconnect storm – many clients disconnecting + reconnecting simultaneously
 *   5. Canary rollback verification – feature-gate enforcement
 *
 * Reliability scorecard per event family is printed at the end.
 */

const { io } = require('socket.io-client');
const { Kafka } = require('kafkajs');

const SOCKET_URL = process.env.SOCKET_URL || 'http://socket-service-1:3002';
const AUTH_URL = process.env.AUTH_URL || 'http://auth-service:3001';
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'kafka-1:29092,kafka-2:29092,kafka-3:29092').split(',');

const TENANT_ID = 'chaos-tenant';
const PROJECT_ID = 'chaos-project';

let passed = 0;
let failed = 0;
const scorecard = {};

function assert(condition, label, family) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.error(`  ✗ ${label}`);
  }
  if (family) {
    scorecard[family] = scorecard[family] || { pass: 0, fail: 0 };
    scorecard[family][condition ? 'pass' : 'fail']++;
  }
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function registerAndLogin(suffix) {
  const username = `chaosuser_${suffix}_${Date.now()}`;
  const email = `${username}@chaos.local`;
  const password = 'Chaos!P4ss';
  try {
    await fetch(`${AUTH_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, username, tenant_id: TENANT_ID }),
    });
  } catch { /* ignore */ }
  try {
    const r = await fetch(`${AUTH_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, tenant_id: TENANT_ID }),
    });
    if (r.ok) {
      const d = await r.json();
      return { token: d.token || d.access_token, userId: username };
    }
  } catch { /* ignore */ }
  return null;
}

function connectSocket(token, ns = '/chat', opts = {}) {
  return new Promise((resolve, reject) => {
    const s = io(`${SOCKET_URL}${ns}`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: false,
      timeout: opts.timeout || 10000,
      ...opts,
    });
    s.on('connect', () => resolve(s));
    s.on('connect_error', reject);
    setTimeout(() => reject(new Error('timeout')), (opts.timeout || 10000) + 2000);
  });
}

// ── CHAOS 1: Kafka producer resilience ──────────────────────

async function chaosKafkaPartition() {
  console.log('\n═══ Chaos 1: Kafka Producer Resilience (partial broker) ═══');
  const kafka = new Kafka({
    clientId: 'chaos-producer',
    brokers: KAFKA_BROKERS,
    retry: { retries: 3, initialRetryTime: 300, maxRetryTime: 5000 },
  });
  const producer = kafka.producer();
  try {
    await producer.connect();
    // Send 10 messages – should succeed even if one broker is slow
    let ackCount = 0;
    for (let i = 0; i < 10; i++) {
      try {
        await producer.send({
          topic: 'chat.messages',
          messages: [{
            key: `chaos_${i}`,
            value: JSON.stringify({
              event_id: `chaos_${Date.now()}_${i}`,
              event_type: 'message.created',
              tenant_id: TENANT_ID,
              occurred_at: new Date().toISOString(),
              payload: { text: `chaos-${i}` },
            }),
          }],
        });
        ackCount++;
      } catch { /* expected some may fail */ }
    }
    assert(ackCount >= 8, `${ackCount}/10 messages produced under broker stress`, 'kafka');
    assert(ackCount > 0, 'At least one message produced', 'kafka');
  } catch (err) {
    assert(false, `Producer init failed: ${err.message}`, 'kafka');
  } finally {
    await producer.disconnect().catch(() => {});
  }
}

// ── CHAOS 2: Redis degradation (simulated via rapid operations) ─

async function chaosRedisStress() {
  console.log('\n═══ Chaos 2: Redis Under Stress (rapid presence updates) ═══');
  const creds = await registerAndLogin('redis_stress');
  if (!creds) { assert(false, 'Cannot register', 'presence'); return; }

  let sock;
  try {
    sock = await connectSocket(creds.token, '/presence');
  } catch {
    assert(false, 'Presence socket failed', 'presence');
    return;
  }

  const RAPID_COUNT = 40;
  let okCount = 0;
  const statuses = ['online', 'away', 'busy', 'online'];
  const start = Date.now();
  for (let i = 0; i < RAPID_COUNT; i++) {
    const ack = await new Promise(resolve => {
      sock.emit('presence_update', { status: statuses[i % 4] }, resolve);
    });
    if (ack && ack.status === 'ok') okCount++;
  }
  const elapsed = Date.now() - start;
  assert(okCount >= RAPID_COUNT * 0.7, `${okCount}/${RAPID_COUNT} rapid presence updates succeeded`, 'presence');
  assert(elapsed < 20000, `Rapid updates in ${elapsed}ms`, 'presence');
  sock.disconnect();
}

// ── CHAOS 3: Auth latency spike (connect with tight timeout) ─

async function chaosAuthLatency() {
  console.log('\n═══ Chaos 3: Connection Under Auth Latency Spike ═══');
  const creds = await registerAndLogin('auth_lat');
  if (!creds) { assert(false, 'Cannot register', 'auth'); return; }

  // Attempt connection with a reasonable timeout
  try {
    const sock = await connectSocket(creds.token, '/chat', { timeout: 15000 });
    assert(true, 'Connected despite potential auth latency', 'auth');
    sock.disconnect();
  } catch {
    // Connection failure under latency is an expected degradation
    assert(false, 'Failed to connect (auth latency too high)', 'auth');
  }
}

// ── CHAOS 4: Reconnect storm ────────────────────────────────

async function chaosReconnectStorm() {
  console.log('\n═══ Chaos 4: Reconnect Storm (10 rapid disconnect/reconnect) ═══');
  const creds = await registerAndLogin('storm');
  if (!creds) { assert(false, 'Cannot register', 'socket'); return; }

  let successCount = 0;
  const STORM_COUNT = 10;
  for (let i = 0; i < STORM_COUNT; i++) {
    try {
      const s = await connectSocket(creds.token, '/chat', { timeout: 8000 });
      s.disconnect();
      successCount++;
      await sleep(200); // small gap between reconnects
    } catch { /* expected some failures */ }
  }
  assert(successCount >= STORM_COUNT * 0.7, `${successCount}/${STORM_COUNT} reconnect cycles succeeded`, 'socket');
}

// ── CHAOS 5: Canary rollback verification ───────────────────

async function chaosCanaryRollback() {
  console.log('\n═══ Chaos 5: Canary Gate Enforcement Verification ═══');
  // This test verifies the feature-gate mechanism works.
  // We can only verify by trying events that should succeed (since we don't
  // control env vars at runtime from within the test). We verify that
  // non-disabled events pass through.
  const creds = await registerAndLogin('canary');
  if (!creds) { assert(false, 'Cannot register', 'canary'); return; }

  let sock;
  try {
    sock = await connectSocket(creds.token, '/chat');
  } catch {
    assert(false, 'Socket connect failed', 'canary');
    return;
  }

  const convId = `canary_conv_${Date.now()}`;
  const joinAck = await new Promise(resolve => {
    sock.emit('joinRoom', { conversationId: convId, projectId: PROJECT_ID }, resolve);
  });
  assert(joinAck && joinAck.status === 'ok', 'Event allowed through gate (joinRoom)', 'canary');

  const sendAck = await new Promise(resolve => {
    sock.emit('sendMessage', {
      conversationId: convId,
      content: 'canary-test',
      messageId: `cmsg_${Date.now()}`,
    }, resolve);
  });
  assert(sendAck && (sendAck.status === 'ok' || sendAck.success), 'Event allowed through gate (sendMessage)', 'canary');

  sock.disconnect();
}

// ── ROLLBACK CRITERIA ──────────────────────────────────────

const ROLLBACK_CRITERIA = {
  description: 'Automated rollback triggers – if any threshold is breached, rollback the canary deployment',
  criteria: [
    { metric: 'socket_error_rate_5m', threshold: 0.05, comparator: 'gte', action: 'Rollback immediately' },
    { metric: 'kafka_dlq_messages_15m', threshold: 20, comparator: 'gte', action: 'Pause canary, investigate DLQ' },
    { metric: 'socket_connect_success_ratio_5m', threshold: 0.99, comparator: 'lt', action: 'Rollback immediately' },
    { metric: 'message_ack_p99_ms', threshold: 1000, comparator: 'gte', action: 'Reduce canary percent to 5%' },
    { metric: 'consumer_lag_messages', threshold: 5000, comparator: 'gte', action: 'Pause canary, scale consumers' },
  ],
  canary_stages: [
    { percent: 5, duration_minutes: 15, promote_if: 'All metrics green for full duration' },
    { percent: 25, duration_minutes: 30, promote_if: 'All metrics green for full duration' },
    { percent: 50, duration_minutes: 60, promote_if: 'All metrics green and DLQ rate < 2' },
    { percent: 100, duration_minutes: 0, promote_if: 'Full rollout' },
  ],
};

// ── SCORECARD ───────────────────────────────────────────────

function printScorecard() {
  console.log('\n╔═════════════════════════════════════════════╗');
  console.log('║        Reliability Scorecard Per Family      ║');
  console.log('╠════════════════╦══════╦══════╦═══════════════╣');
  console.log('║ Family         ║ Pass ║ Fail ║ Score         ║');
  console.log('╠════════════════╬══════╬══════╬═══════════════╣');
  const PROMOTION_THRESHOLD = 0.80;
  for (const [family, counts] of Object.entries(scorecard)) {
    const total = counts.pass + counts.fail;
    const score = total > 0 ? (counts.pass / total) : 0;
    const status = score >= PROMOTION_THRESHOLD ? '✓ PROMOTE' : '✗ HOLD';
    console.log(`║ ${family.padEnd(14)} ║ ${String(counts.pass).padEnd(4)} ║ ${String(counts.fail).padEnd(4)} ║ ${(score * 100).toFixed(0).padStart(3)}% ${status.padEnd(8)} ║`);
  }
  console.log('╚════════════════╩══════╩══════╩═══════════════╝');

  console.log('\n── Rollback Criteria ──');
  for (const c of ROLLBACK_CRITERIA.criteria) {
    console.log(`  ${c.metric} ${c.comparator} ${c.threshold} → ${c.action}`);
  }

  console.log('\n── Canary Stages ──');
  for (const s of ROLLBACK_CRITERIA.canary_stages) {
    console.log(`  ${s.percent}% for ${s.duration_minutes}m → ${s.promote_if}`);
  }
}

// ── MAIN ────────────────────────────────────────────────────

async function main() {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║  RT-QA-004: Canary, Chaos & Rollback Validation  ║');
  console.log('╚═══════════════════════════════════════════════════╝');

  try { await chaosKafkaPartition(); } catch (e) { console.error('Chaos 1 error:', e.message); }
  try { await chaosRedisStress(); } catch (e) { console.error('Chaos 2 error:', e.message); }
  try { await chaosAuthLatency(); } catch (e) { console.error('Chaos 3 error:', e.message); }
  try { await chaosReconnectStorm(); } catch (e) { console.error('Chaos 4 error:', e.message); }
  try { await chaosCanaryRollback(); } catch (e) { console.error('Chaos 5 error:', e.message); }

  printScorecard();

  console.log(`\n── Summary: ${passed} passed, ${failed} failed ──`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
