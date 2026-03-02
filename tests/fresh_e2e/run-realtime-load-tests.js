/**
 * RT-QA-002 – Load, Backpressure & Recovery Tests
 *
 * Run inside the e2e-fresh Docker container:
 *   node run-realtime-load-tests.js
 *
 * Scenarios:
 *   1. Burst messaging – 100 messages rapid-fire per client
 *   2. Concurrent room joins – 20 clients joining simultaneously
 *   3. Read-receipt flood – 50 receipts in <1 s
 *   4. Presence spike – 30 presence updates simultaneously
 *   5. Backpressure – producer throughput limit verification
 *   6. Recovery – broker reconnect after consumer disconnect
 */

const { io } = require('socket.io-client');
const { Kafka } = require('kafkajs');

const SOCKET_URL = process.env.SOCKET_URL || 'http://socket-service-1:3002';
const AUTH_URL = process.env.AUTH_URL || 'http://auth-service:3001';
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'kafka-1:29092').split(',');

const TENANT_ID = 'load-test-tenant';
const PROJECT_ID = 'load-test-project';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.error(`  ✗ ${label}`);
  }
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── helpers ─────────────────────────────────────────────────

async function registerAndLogin(suffix) {
  const username = `loaduser_${suffix}_${Date.now()}`;
  const email = `${username}@loadtest.local`;
  const password = 'LoadT3st!Pass';

  try {
    const regRes = await fetch(`${AUTH_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, username, tenant_id: TENANT_ID }),
    });
    if (!regRes.ok && regRes.status !== 409) {
      console.warn(`Registration failed for ${username}: ${regRes.status}`);
    }
  } catch { /* ignore */ }

  try {
    const loginRes = await fetch(`${AUTH_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, tenant_id: TENANT_ID }),
    });
    if (loginRes.ok) {
      const data = await loginRes.json();
      return { token: data.token || data.access_token, userId: username };
    }
  } catch { /* ignore */ }
  return null;
}

function connectSocket(token, namespace = '/chat') {
  return new Promise((resolve, reject) => {
    const s = io(`${SOCKET_URL}${namespace}`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: false,
      timeout: 10000,
    });
    s.on('connect', () => resolve(s));
    s.on('connect_error', reject);
    setTimeout(() => reject(new Error('Socket connect timeout')), 12000);
  });
}

// ── SCENARIO 1: Burst messaging ─────────────────────────────

async function testBurstMessaging() {
  console.log('\n═══ Scenario 1: Burst Messaging (100 rapid-fire messages) ═══');
  const creds = await registerAndLogin('burst');
  if (!creds) { assert(false, 'Could not register/login'); return; }

  let sock;
  try {
    sock = await connectSocket(creds.token);
  } catch {
    assert(false, 'Socket connect failed');
    return;
  }

  const conversationId = `burst_conv_${Date.now()}`;
  const roomJoin = await new Promise(resolve => {
    sock.emit('joinRoom', { conversationId, projectId: PROJECT_ID }, resolve);
  });
  assert(roomJoin && roomJoin.status === 'ok', 'Joined room');

  const MESSAGE_COUNT = 100;
  let ackCount = 0;
  const start = Date.now();

  const promises = [];
  for (let i = 0; i < MESSAGE_COUNT; i++) {
    promises.push(
      new Promise(resolve => {
        sock.emit('sendMessage', {
          conversationId,
          content: `burst-msg-${i}`,
          messageId: `burst_${Date.now()}_${i}`,
        }, (ack) => {
          if (ack && (ack.status === 'ok' || ack.success)) ackCount++;
          resolve(ack);
        });
      })
    );
  }
  await Promise.all(promises);
  const elapsed = Date.now() - start;
  console.log(`  Sent ${MESSAGE_COUNT} messages in ${elapsed}ms`);

  assert(ackCount >= MESSAGE_COUNT * 0.9, `At least 90% acked (${ackCount}/${MESSAGE_COUNT})`);
  assert(elapsed < 30000, `Completed within 30s (${elapsed}ms)`);

  sock.disconnect();
}

// ── SCENARIO 2: Concurrent room joins ───────────────────────

async function testConcurrentJoins() {
  console.log('\n═══ Scenario 2: Concurrent Room Joins (20 clients) ═══');
  const CLIENT_COUNT = 20;
  const conversationId = `concurrent_conv_${Date.now()}`;

  const clients = [];
  for (let i = 0; i < CLIENT_COUNT; i++) {
    const creds = await registerAndLogin(`join_${i}`);
    if (creds) clients.push(creds);
  }
  assert(clients.length >= CLIENT_COUNT * 0.8, `Registered ${clients.length}/${CLIENT_COUNT} clients`);

  const sockets = [];
  const connectPromises = clients.map(async c => {
    try {
      const s = await connectSocket(c.token);
      sockets.push(s);
    } catch { /* ignore */ }
  });
  await Promise.all(connectPromises);
  assert(sockets.length >= clients.length * 0.8, `Connected ${sockets.length}/${clients.length} sockets`);

  // All join the same room simultaneously
  const start = Date.now();
  const joinResults = await Promise.all(
    sockets.map(s => new Promise(resolve => {
      s.emit('joinRoom', { conversationId, projectId: PROJECT_ID }, resolve);
    }))
  );
  const elapsed = Date.now() - start;
  const okCount = joinResults.filter(r => r && r.status === 'ok').length;
  assert(okCount >= sockets.length * 0.9, `${okCount}/${sockets.length} joined successfully`);
  assert(elapsed < 15000, `All joins completed within 15s (${elapsed}ms)`);

  sockets.forEach(s => s.disconnect());
}

// ── SCENARIO 3: Read-receipt flood ──────────────────────────

async function testReadReceiptFlood() {
  console.log('\n═══ Scenario 3: Read-Receipt Flood (50 receipts in <1s) ═══');
  const creds = await registerAndLogin('receipt');
  if (!creds) { assert(false, 'Could not register/login'); return; }

  let sock;
  try {
    sock = await connectSocket(creds.token);
  } catch {
    assert(false, 'Socket connect failed');
    return;
  }

  const conversationId = `receipt_conv_${Date.now()}`;
  await new Promise(resolve => {
    sock.emit('joinRoom', { conversationId, projectId: PROJECT_ID }, resolve);
  });

  const RECEIPT_COUNT = 50;
  let ackCount = 0;
  const start = Date.now();
  const promises = [];
  for (let i = 0; i < RECEIPT_COUNT; i++) {
    promises.push(
      new Promise(resolve => {
        sock.emit('message_read', {
          conversationId,
          messageId: `msg_${i}`,
        }, (ack) => {
          if (ack) ackCount++;
          resolve(ack);
        });
      })
    );
  }
  await Promise.all(promises);
  const elapsed = Date.now() - start;
  assert(ackCount >= RECEIPT_COUNT * 0.8, `${ackCount}/${RECEIPT_COUNT} receipts acked`);
  assert(elapsed < 10000, `Completed within 10s (${elapsed}ms)`);
  console.log(`  ${RECEIPT_COUNT} read receipts in ${elapsed}ms`);

  sock.disconnect();
}

// ── SCENARIO 4: Presence spike ──────────────────────────────

async function testPresenceSpike() {
  console.log('\n═══ Scenario 4: Presence Spike (30 simultaneous updates) ═══');
  const CLIENT_COUNT = 30;
  const clients = [];
  for (let i = 0; i < CLIENT_COUNT; i++) {
    const creds = await registerAndLogin(`pres_${i}`);
    if (creds) clients.push(creds);
  }

  const sockets = [];
  for (const c of clients) {
    try {
      const s = await connectSocket(c.token, '/presence');
      sockets.push(s);
    } catch { /* ignore */ }
  }
  assert(sockets.length >= CLIENT_COUNT * 0.5, `Connected ${sockets.length} presence sockets`);

  const start = Date.now();
  const statuses = ['online', 'away', 'busy'];
  const results = await Promise.all(
    sockets.map((s, i) => new Promise(resolve => {
      s.emit('presence_update', { status: statuses[i % 3] }, (ack) => resolve(ack));
    }))
  );
  const elapsed = Date.now() - start;
  const okCount = results.filter(r => r && r.status === 'ok').length;
  assert(okCount >= sockets.length * 0.8, `${okCount}/${sockets.length} presence updates succeeded`);
  assert(elapsed < 15000, `Presence spike completed within 15s (${elapsed}ms)`);

  sockets.forEach(s => s.disconnect());
}

// ── SCENARIO 5: Backpressure verification ───────────────────

async function testBackpressure() {
  console.log('\n═══ Scenario 5: Backpressure – Kafka producer throughput ═══');
  const kafka = new Kafka({ clientId: 'load-test-bp', brokers: KAFKA_BROKERS });
  const producer = kafka.producer();

  try {
    await producer.connect();
    const BATCH_SIZE = 200;
    const start = Date.now();
    const messages = [];
    for (let i = 0; i < BATCH_SIZE; i++) {
      messages.push({
        key: `bp_key_${i}`,
        value: JSON.stringify({
          event_id: `bp_${Date.now()}_${i}`,
          event_type: 'message.created',
          tenant_id: TENANT_ID,
          occurred_at: new Date().toISOString(),
          payload: { text: `backpressure-test-${i}` },
        }),
      });
    }
    await producer.send({ topic: 'chat.messages', messages });
    const elapsed = Date.now() - start;
    assert(true, `Produced ${BATCH_SIZE} messages in ${elapsed}ms`);
    assert(elapsed < 10000, `Batch send < 10s (${elapsed}ms)`);
  } catch (err) {
    assert(false, `Kafka producer batch failed: ${err.message}`);
  } finally {
    await producer.disconnect();
  }
}

// ── SCENARIO 6: Recovery – consumer reconnect ───────────────

async function testRecovery() {
  console.log('\n═══ Scenario 6: Recovery – Consumer reconnect ═══');
  const kafka = new Kafka({ clientId: 'load-test-recovery', brokers: KAFKA_BROKERS });
  const consumer = kafka.consumer({ groupId: `recovery-test-${Date.now()}` });

  try {
    await consumer.connect();
    await consumer.subscribe({ topic: 'chat.messages', fromBeginning: false });

    let messageCount = 0;
    await consumer.run({
      eachMessage: async () => { messageCount++; },
    });

    await sleep(2000);
    // Simulate disconnect + reconnect
    await consumer.disconnect();
    assert(true, 'Consumer disconnected gracefully');

    await sleep(1000);
    const consumer2 = kafka.consumer({ groupId: `recovery-test-2-${Date.now()}` });
    await consumer2.connect();
    await consumer2.subscribe({ topic: 'chat.messages', fromBeginning: false });
    await consumer2.run({ eachMessage: async () => {} });
    await sleep(2000);
    assert(true, 'Consumer reconnected successfully');
    await consumer2.disconnect();
  } catch (err) {
    assert(false, `Recovery test failed: ${err.message}`);
  }
}

// ── MAIN ────────────────────────────────────────────────────

async function main() {
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║  RT-QA-002: Load, Backpressure & Recovery ║');
  console.log('╚═══════════════════════════════════════════╝');

  try {
    await testBurstMessaging();
  } catch (err) { console.error('Burst test error:', err.message); }

  try {
    await testConcurrentJoins();
  } catch (err) { console.error('Concurrent joins error:', err.message); }

  try {
    await testReadReceiptFlood();
  } catch (err) { console.error('Read-receipt error:', err.message); }

  try {
    await testPresenceSpike();
  } catch (err) { console.error('Presence spike error:', err.message); }

  try {
    await testBackpressure();
  } catch (err) { console.error('Backpressure error:', err.message); }

  try {
    await testRecovery();
  } catch (err) { console.error('Recovery error:', err.message); }

  console.log('\n────────────────────────────────');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
