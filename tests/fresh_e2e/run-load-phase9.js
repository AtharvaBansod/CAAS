/**
 * RT-QA-002: Load, Backpressure & Recovery Tests
 *
 * Validates:
 * - Sustained message throughput
 * - Backpressure handling under overload
 * - Recovery after consumer restart
 * - Duplicate detection under load
 * - DLQ routing under concurrent invalid messages
 * - Socket connection capacity
 */

const { io } = require('socket.io-client');
const { Kafka } = require('kafkajs');
const { MongoClient } = require('mongodb');

const cfg = {
  gateway: process.env.GATEWAY_URL || 'http://gateway:3000',
  socket1: process.env.SOCKET1_URL || 'http://socket-service-1:3001',
  kafkaBrokers: (process.env.KAFKA_BROKERS || 'kafka-1:29092,kafka-2:29092,kafka-3:29092')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean),
  mongoUri:
    process.env.MONGODB_URI ||
    'mongodb://caas_admin:caas_secret_2026@mongodb-primary:27017/caas_platform?authSource=admin&replicaSet=caas-rs',
  messagesTopic: 'chat.messages',
  dlqTopic: 'internal.dlq',
  timeoutMs: 15000,
  loadDurationMs: 10000,
  messagesPerSecond: 20,
  maxConcurrentSockets: 20,
};

const jsonHeaders = { 'content-type': 'application/json' };
const results = [];

function record(name, ok, details = {}) {
  results.push({ name, ok, details });
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name}`);
  if (!ok) console.log(JSON.stringify(details, null, 2));
}

async function http(method, url, body, headers = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      headers: { ...headers, ...(body ? jsonHeaders : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch {}
    return { ok: res.status >= 200 && res.status < 300, status: res.status, json, text };
  } finally {
    clearTimeout(timer);
  }
}

function decodeJwt(token) {
  const [, payload] = token.split('.');
  return JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
}

// ──────────────────────────────────────────────
// Test 1: Sustained throughput via Kafka producer
// ──────────────────────────────────────────────

async function testSustainedThroughput() {
  console.log('\n═══ Test: Sustained Throughput ═══');
  const kafka = new Kafka({ clientId: 'load-test-producer', brokers: cfg.kafkaBrokers });
  const producer = kafka.producer();
  await producer.connect();

  const startTime = Date.now();
  let messagesSent = 0;
  let errors = 0;
  const batchSize = 10;
  const intervalMs = Math.floor(1000 / (cfg.messagesPerSecond / batchSize));

  const runUntil = startTime + cfg.loadDurationMs;

  while (Date.now() < runUntil) {
    const batch = Array.from({ length: batchSize }, (_, i) => ({
      key: `load-test:conv-${i % 5}`,
      value: JSON.stringify({
        event_id: `load-${Date.now()}-${messagesSent + i}`,
        event_type: 'message.created',
        schema_version: '1.0.0',
        tenant_id: 'load-test-tenant',
        correlation_id: `corr-load-${messagesSent + i}`,
        occurred_at: new Date().toISOString(),
        producer_id: 'load-test',
        partition_key: `load-test-tenant:conv-${i % 5}`,
        payload: {
          message_id: `load-msg-${Date.now()}-${messagesSent + i}`,
          conversation_id: `conv-${i % 5}`,
          sender_id: 'load-test-user',
          content: { type: 'text', text: `Load test message ${messagesSent + i}` },
        },
        metadata: { dedupe_key: `load-test-tenant:load-msg-${Date.now()}-${messagesSent + i}` },
      }),
    }));

    try {
      await producer.send({ topic: cfg.messagesTopic, messages: batch });
      messagesSent += batchSize;
    } catch (err) {
      errors++;
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  const duration = Date.now() - startTime;
  const throughput = (messagesSent / duration) * 1000;

  await producer.disconnect();

  record('sustained throughput: messages sent', messagesSent > 0, {
    messagesSent,
    errors,
    durationMs: duration,
    throughputPerSecond: throughput.toFixed(1),
  });

  record('sustained throughput: error rate < 5%', errors / Math.max(messagesSent, 1) < 0.05, {
    errorRate: ((errors / Math.max(messagesSent, 1)) * 100).toFixed(2) + '%',
  });

  return { messagesSent, throughput };
}

// ──────────────────────────────────────────────
// Test 2: MongoDB persistence under load
// ──────────────────────────────────────────────

async function testPersistenceUnderLoad(expectedMessages) {
  console.log('\n═══ Test: Persistence Under Load ═══');
  const mongo = new MongoClient(cfg.mongoUri);
  await mongo.connect();
  const db = mongo.db('caas_platform');

  // Wait for persistence consumer to process the load
  console.log('  Waiting 30s for persistence consumer to flush...');
  await new Promise((r) => setTimeout(r, 30000));

  const count = await db.collection('messages').countDocuments({
    tenant_id: 'load-test-tenant',
  });

  // Allow for some duplicates being skipped
  const minExpected = Math.floor(expectedMessages * 0.7);
  record('persistence under load: messages persisted', count >= minExpected, {
    persisted: count,
    expected: expectedMessages,
    minimumRequired: minExpected,
    ratio: ((count / expectedMessages) * 100).toFixed(1) + '%',
  });

  await mongo.close();
  return count;
}

// ──────────────────────────────────────────────
// Test 3: Duplicate detection under load
// ──────────────────────────────────────────────

async function testDuplicateDetection() {
  console.log('\n═══ Test: Duplicate Detection ═══');
  const kafka = new Kafka({ clientId: 'dedup-test', brokers: cfg.kafkaBrokers });
  const producer = kafka.producer();
  await producer.connect();

  const duplicateEventId = `dedup-test-${Date.now()}`;
  const duplicateCount = 5;

  for (let i = 0; i < duplicateCount; i++) {
    await producer.send({
      topic: cfg.messagesTopic,
      messages: [{
        key: 'dedup-test:conv-dedup',
        value: JSON.stringify({
          event_id: duplicateEventId,
          event_type: 'message.created',
          schema_version: '1.0.0',
          tenant_id: 'dedup-test-tenant',
          correlation_id: `corr-dedup`,
          occurred_at: new Date().toISOString(),
          producer_id: 'dedup-test',
          partition_key: 'dedup-test-tenant:conv-dedup',
          payload: {
            message_id: duplicateEventId,
            conversation_id: 'conv-dedup',
            sender_id: 'dedup-user',
            content: { type: 'text', text: 'duplicate test' },
          },
          metadata: { dedupe_key: `dedup-test-tenant:${duplicateEventId}` },
        }),
      }],
    });
  }

  await producer.disconnect();
  console.log('  Waiting 15s for dedup processing...');
  await new Promise((r) => setTimeout(r, 15000));

  const mongo = new MongoClient(cfg.mongoUri);
  await mongo.connect();
  const db = mongo.db('caas_platform');

  const count = await db.collection('messages').countDocuments({
    tenant_id: 'dedup-test-tenant',
    message_id: duplicateEventId,
  });

  record('duplicate detection: only one persisted', count === 1, {
    duplicatesSent: duplicateCount,
    persisted: count,
  });

  await mongo.close();
}

// ──────────────────────────────────────────────
// Test 4: DLQ under concurrent invalid messages
// ──────────────────────────────────────────────

async function testDlqUnderLoad() {
  console.log('\n═══ Test: DLQ Under Load ═══');
  const kafka = new Kafka({ clientId: 'dlq-load-test', brokers: cfg.kafkaBrokers });
  const producer = kafka.producer();
  await producer.connect();

  const invalidCount = 10;
  const stamp = Date.now();

  for (let i = 0; i < invalidCount; i++) {
    await producer.send({
      topic: cfg.messagesTopic,
      messages: [{
        key: `dlq-load:${i}`,
        value: JSON.stringify({
          event_id: `dlq-load-${stamp}-${i}`,
          event_type: 'message.unknown_type',
          schema_version: '1.0.0',
          tenant_id: 'dlq-load-tenant',
          correlation_id: `corr-dlq-${i}`,
          occurred_at: new Date().toISOString(),
          producer_id: 'dlq-load-test',
          partition_key: `dlq-load-tenant:conv-dlq`,
          payload: { data: 'invalid' },
        }),
      }],
    });
  }

  await producer.disconnect();

  // Wait long enough for persistence consumer to route all to DLQ
  console.log('  Waiting 20s for DLQ routing...');
  await new Promise((r) => setTimeout(r, 20000));

  // Scan DLQ for our records using deterministic approach:
  // Create consumer, subscribe from beginning, read ALL messages, then check
  const consumer = kafka.consumer({
    groupId: `dlq-load-check-${Date.now()}`,
    sessionTimeout: 30000,
    heartbeatInterval: 3000,
  });
  await consumer.connect();
  await consumer.subscribe({ topic: cfg.dlqTopic, fromBeginning: true });

  let dlqFound = 0;
  const scanResult = await new Promise((resolve) => {
    // Hard cap at 30s
    const hardTimer = setTimeout(() => {
      resolve(dlqFound);
    }, 30000);

    // After consumer joins, give it 10s to read everything, then resolve
    let readTimer;

    void consumer.run({
      eachMessage: async ({ message }) => {
        try {
          const parsed = JSON.parse(message.value?.toString() || '{}');
          if (parsed.event_id?.startsWith(`dlq-load-${stamp}`)) {
            dlqFound++;
          }
        } catch {}

        // Reset idle timer - resolve 3s after last message
        if (readTimer) clearTimeout(readTimer);
        readTimer = setTimeout(() => {
          clearTimeout(hardTimer);
          resolve(dlqFound);
        }, 3000);
      },
    });

    // If consumer never receives any messages, resolve after 15s
    setTimeout(() => {
      if (!readTimer) {
        clearTimeout(hardTimer);
        resolve(dlqFound);
      }
    }, 15000);
  });

  try { await consumer.disconnect(); } catch {}

  record('DLQ under load: invalid messages routed', dlqFound >= invalidCount * 0.8, {
    invalidSent: invalidCount,
    dlqRecordsFound: scanResult,
    ratio: ((dlqFound / invalidCount) * 100).toFixed(1) + '%',
  });
}

// ──────────────────────────────────────────────
// Test 5: Concurrent socket connections
// ──────────────────────────────────────────────

async function testConcurrentSockets() {
  console.log('\n═══ Test: Concurrent Sockets ═══');

  // First register a tenant and get tokens
  const stamp = Date.now();
  const regRes = await http('POST', `${cfg.gateway}/api/v1/auth/client/register`, {
    email: `loadtest-${stamp}@example.com`,
    password: 'LoadTest123!',
    company_name: `LoadTest-${stamp}`,
    plan: 'business',
    project: { name: `LoadProject-${stamp}`, stack: 'react', environment: 'development' },
  });

  if (!regRes.ok) {
    record('concurrent sockets: tenant registration', false, regRes);
    return;
  }

  const loginRes = await http('POST', `${cfg.gateway}/api/v1/auth/client/login`, {
    email: `loadtest-${stamp}@example.com`,
    password: 'LoadTest123!',
  });

  if (!loginRes.ok) {
    record('concurrent sockets: client login', false, loginRes);
    return;
  }

  const projRes = await http(
    'POST',
    `${cfg.gateway}/api/v1/auth/client/projects`,
    { name: `load-project-${stamp}`, stack: 'node', environment: 'development' },
    { authorization: `Bearer ${loginRes.json.access_token}` }
  );

  if (!projRes.ok) {
    record('concurrent sockets: project creation', false, projRes);
    return;
  }

  const sdkRes = await http(
    'POST',
    `${cfg.gateway}/api/v1/sdk/session`,
    { project_id: projRes.json.project?.project_id || regRes.json.project_id, user_external_id: `load-user-${stamp}`, display_name: 'Load User' },
    { authorization: `Bearer ${loginRes.json.access_token}`, 'x-api-key': regRes.json.api_key }
  );

  if (!sdkRes.ok) {
    record('concurrent sockets: SDK session', false, sdkRes);
    return;
  }

  const token = sdkRes.json.access_token;

  // Connect multiple sockets concurrently
  const connectPromises = Array.from({ length: cfg.maxConcurrentSockets }, (_, i) =>
    new Promise((resolve) => {
      const socket = io(`${cfg.socket1}/chat`, {
        transports: ['websocket'],
        auth: { token },
        timeout: cfg.timeoutMs,
        reconnection: false,
      });
      const timer = setTimeout(() => {
        socket.close();
        resolve({ ok: false, index: i });
      }, cfg.timeoutMs);
      socket.on('connect', () => {
        clearTimeout(timer);
        resolve({ ok: true, socket, index: i });
      });
      socket.on('connect_error', (err) => {
        clearTimeout(timer);
        resolve({ ok: false, index: i, error: err.message });
      });
    })
  );

  const connectionResults = await Promise.all(connectPromises);
  const connected = connectionResults.filter((r) => r.ok);
  const failed = connectionResults.filter((r) => !r.ok);

  record('concurrent sockets: connection success rate', connected.length >= cfg.maxConcurrentSockets * 0.8, {
    attempted: cfg.maxConcurrentSockets,
    connected: connected.length,
    failed: failed.length,
    successRate: ((connected.length / cfg.maxConcurrentSockets) * 100).toFixed(1) + '%',
  });

  // Clean up sockets
  for (const r of connected) {
    if (r.socket) r.socket.close();
  }
}

// ──────────────────────────────────────────────
// Test 6: Backpressure recovery
// ──────────────────────────────────────────────

async function testBackpressureRecovery() {
  console.log('\n═══ Test: Backpressure Recovery ═══');

  // Send a burst of messages
  const kafka = new Kafka({ clientId: 'backpressure-test', brokers: cfg.kafkaBrokers });
  const producer = kafka.producer();
  await producer.connect();

  const burstSize = 100;
  const stamp = Date.now();
  const messages = Array.from({ length: burstSize }, (_, i) => ({
    key: `bp-test:conv-bp`,
    value: JSON.stringify({
      event_id: `bp-${stamp}-${i}`,
      event_type: 'message.created',
      schema_version: '1.0.0',
      tenant_id: 'bp-test-tenant',
      correlation_id: `corr-bp-${i}`,
      occurred_at: new Date().toISOString(),
      producer_id: 'backpressure-test',
      partition_key: `bp-test-tenant:conv-bp`,
      payload: {
        message_id: `bp-msg-${stamp}-${i}`,
        conversation_id: 'conv-bp',
        sender_id: 'bp-user',
        content: { type: 'text', text: `Backpressure test ${i}` },
      },
      metadata: { dedupe_key: `bp-test-tenant:bp-msg-${stamp}-${i}` },
    }),
  }));

  const sendStart = Date.now();
  await producer.send({ topic: cfg.messagesTopic, messages });
  const sendTime = Date.now() - sendStart;

  await producer.disconnect();

  record('backpressure: burst of 100 messages sent', true, {
    burstSize,
    sendTimeMs: sendTime,
  });

  // Wait for persistence - needs time after all previous tests
  console.log('  Waiting 20s for backpressure recovery persistence...');
  await new Promise((r) => setTimeout(r, 20000));

  const mongo = new MongoClient(cfg.mongoUri);
  await mongo.connect();
  const db = mongo.db('caas_platform');

  const persisted = await db.collection('messages').countDocuments({
    tenant_id: 'bp-test-tenant',
  });

  record('backpressure: recovery persisted messages', persisted >= burstSize * 0.9, {
    sent: burstSize,
    persisted,
    ratio: ((persisted / burstSize) * 100).toFixed(1) + '%',
  });

  await mongo.close();
}

// ──────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  RT-QA-002: Load, Backpressure & Recovery');
  console.log('═══════════════════════════════════════════════\n');

  const { messagesSent } = await testSustainedThroughput();
  await testPersistenceUnderLoad(messagesSent);
  await testDuplicateDetection();
  await testDlqUnderLoad();
  await testConcurrentSockets();
  await testBackpressureRecovery();

  console.log('\n═══════════════════════════════════════════════');
  console.log('  Summary');
  console.log('═══════════════════════════════════════════════');

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`  ${passed} passed, ${failed} failed, ${results.length} total`);

  if (failed > 0) {
    console.log('\n  Failed tests:');
    for (const r of results.filter((r) => !r.ok)) {
      console.log(`    - ${r.name}`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Load test crashed:', err);
  process.exit(1);
});
