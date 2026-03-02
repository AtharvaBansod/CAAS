const { io } = require('socket.io-client');
const { MongoClient } = require('mongodb');
const { Kafka } = require('kafkajs');

const cfg = {
  gateway: process.env.GATEWAY_URL || 'http://gateway:3000',
  search: process.env.SEARCH_SERVICE_URL || 'http://search-service:3006',
  media: process.env.MEDIA_SERVICE_URL || 'http://media-service:3005',
  socket1: process.env.SOCKET1_URL || 'http://socket-service-1:3001',
  socket2: process.env.SOCKET2_URL || 'http://socket-service-2:3001',
  kafkaBrokers: (process.env.KAFKA_BROKERS || 'kafka-1:29092,kafka-2:29092,kafka-3:29092')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
  kafkaMessagesTopic: process.env.KAFKA_MESSAGES_TOPIC || 'chat.messages',
  kafkaInternalDlqTopic: process.env.KAFKA_INTERNAL_DLQ_TOPIC || 'internal.dlq',
  mongoUri:
    process.env.MONGODB_URI ||
    'mongodb://caas_admin:caas_secret_2026@mongodb-primary:27017/caas_platform?authSource=admin&replicaSet=caas-rs',
  timeoutMs: Number(process.env.E2E_TIMEOUT_MS || 15000),
};

const jsonHeaders = { 'content-type': 'application/json' };
const results = [];

function record(name, ok, details = {}) {
  results.push({ name, ok, details });
  const prefix = ok ? 'PASS' : 'FAIL';
  console.log(`[${prefix}] ${name}`);
  if (!ok) {
    console.log(JSON.stringify(details, null, 2));
  }
}

function decodeJwt(token) {
  const [, payload] = token.split('.');
  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(Buffer.from(normalized, 'base64').toString('utf-8'));
}

async function http(method, url, body, headers = {}, expect = [200]) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      headers: {
        ...headers,
        ...(body ? jsonHeaders : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {}
    return {
      ok: expect.includes(res.status),
      status: res.status,
      json,
      text,
    };
  } finally {
    clearTimeout(timer);
  }
}

function socketConnect(baseUrl, namespace, token) {
  return new Promise((resolve) => {
    const socket = io(`${baseUrl}${namespace}`, {
      transports: ['websocket'],
      auth: { token },
      timeout: cfg.timeoutMs,
      reconnection: false,
    });

    const timer = setTimeout(() => resolve({ ok: false, socket, reason: 'timeout' }), cfg.timeoutMs);
    socket.on('connect', () => {
      clearTimeout(timer);
      resolve({ ok: true, socket });
    });
    socket.on('connect_error', (error) => {
      clearTimeout(timer);
      resolve({ ok: false, socket, reason: error.message });
    });
  });
}

function socketAck(socket, event, payload) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ timeout: true }), cfg.timeoutMs);
    socket.emit(event, payload, (data) => {
      clearTimeout(timer);
      resolve({ timeout: false, data });
    });
  });
}

function assertEnvelope(name, response, { status, code } = {}) {
  const envelope = response && typeof response === 'object' ? response : null;
  const ok =
    !!envelope &&
    typeof envelope.status === 'string' &&
    typeof envelope.code === 'string' &&
    typeof envelope.message === 'string' &&
    typeof envelope.correlation_id === 'string' &&
    typeof envelope.event_id === 'string' &&
    typeof envelope.retryable === 'boolean' &&
    typeof envelope.schema_version === 'string' &&
    (!status || envelope.status === status) &&
    (!code || envelope.code === code);

  record(name, ok, { envelope });
  return ok;
}

async function seedConversation({ tenantId, projectId, conversationId, participantIds }) {
  const client = new MongoClient(cfg.mongoUri);
  try {
    await client.connect();
    const collection = client.db('caas_platform').collection('conversations');
    await collection.deleteOne({ conversation_id: conversationId, tenant_id: tenantId });
    await collection.insertOne({
      conversation_id: conversationId,
      tenant_id: tenantId,
      project_id: projectId,
      type: 'group',
      name: `Phase9 ${conversationId}`,
      participants: participantIds.map((userId) => ({
        user_id: userId,
        role: 'member',
      })),
      created_at: new Date(),
      updated_at: new Date(),
    });
  } finally {
    await client.close();
  }
}

async function waitForSearch(query, tenantId, conversationId) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 30000) {
    const response = await http(
      'GET',
      `${cfg.search}/search/messages?q=${encodeURIComponent(query)}&tenant_id=${encodeURIComponent(
        tenantId
      )}&conversation_id=${encodeURIComponent(conversationId)}&limit=10`
    );

    const hits = response.json?.results || [];
    if (response.ok && hits.some((item) => `${item.content}`.includes(query))) {
      return { ok: true, response };
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  return { ok: false };
}

async function waitForPersistence({ tenantId, conversationId, messageId }) {
  const client = new MongoClient(cfg.mongoUri);
  const startedAt = Date.now();

  try {
    await client.connect();
    const db = client.db('caas_platform');
    const messages = db.collection('messages');
    const conversations = db.collection('conversations');

    while (Date.now() - startedAt < 30000) {
      const [message, conversation] = await Promise.all([
        messages.findOne({ tenant_id: tenantId, message_id: messageId }),
        conversations.findOne({ tenant_id: tenantId, conversation_id: conversationId }),
      ]);

      if (message && conversation?.last_message_at) {
        return { ok: true, message, conversation };
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return { ok: false };
  } finally {
    await client.close();
  }
}

async function waitForDlqRecord({ topic, predicate, action }) {
  // Step 1: Fire the action first so the unsupported event enters the pipeline
  console.log('[DLQ] Firing action to produce unsupported event');
  try {
    await action();
  } catch (err) {
    console.log('[DLQ] Action failed:', err.message);
    return { ok: false, reason: `action failed: ${err.message}` };
  }

  // Step 2: Give the persistence consumer time to process and route to DLQ
  console.log('[DLQ] Waiting 5s for persistence consumer to route to DLQ');
  await new Promise((r) => setTimeout(r, 5000));

  // Step 3: Poll the DLQ topic with fromBeginning: true using a fresh consumer group
  //         The DLQ record should already exist, so we just need to scan through all records
  const kafka = new Kafka({
    clientId: `phase9-dlq-${Date.now()}`,
    brokers: cfg.kafkaBrokers,
  });
  const consumer = kafka.consumer({
    groupId: `phase9-dlq-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    sessionTimeout: 15000,
    heartbeatInterval: 3000,
  });

  try {
    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: true });

    const result = await new Promise((resolve) => {
      let settled = false;

      // 30-second timeout to scan through all existing DLQ records
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        resolve({ ok: false, reason: 'timeout scanning DLQ records' });
      }, 30000);

      // Track whether we've received any messages
      let messageCount = 0;
      // If no new messages for 8 seconds after at least one was received, give up
      let idleTimer = null;
      const resetIdleTimer = () => {
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve({ ok: false, reason: `no matching DLQ record found after scanning ${messageCount} records` });
        }, 8000);
      };

      void consumer.run({
        eachMessage: async ({ message }) => {
          if (settled) return;
          messageCount++;
          resetIdleTimer();

          const raw = message.value?.toString() || '{}';
          let parsed;
          try {
            parsed = JSON.parse(raw);
          } catch {
            return;
          }

          if (predicate(parsed)) {
            settled = true;
            clearTimeout(timer);
            if (idleTimer) clearTimeout(idleTimer);
            resolve({ ok: true, record: parsed });
          }
        },
      }).catch((error) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          if (idleTimer) clearTimeout(idleTimer);
          resolve({ ok: false, reason: error.message });
        }
      });

      // If topic is empty (no messages at all), the idle timer won't start
      // So set a separate "no messages at all" timeout
      setTimeout(() => {
        if (!settled && messageCount === 0) {
          settled = true;
          clearTimeout(timer);
          resolve({ ok: false, reason: 'DLQ topic appears empty - no messages received' });
        }
      }, 15000);
    });

    return result;
  } finally {
    await consumer.disconnect().catch(() => {});
  }
}

async function publishUnsupportedRealtimeEvent({ tenantId, projectId, conversationId, eventId }) {
  const kafka = new Kafka({
    clientId: `phase9-producer-${Date.now()}`,
    brokers: cfg.kafkaBrokers,
  });
  const producer = kafka.producer();

  try {
    await producer.connect();
    await producer.send({
      topic: cfg.kafkaMessagesTopic,
      messages: [
        {
          key: `${tenantId}:${conversationId}`,
          value: JSON.stringify({
            event_id: eventId,
            event_type: 'message.unsupported',
            schema_version: '1.0.0',
            tenant_id: tenantId,
            project_id: projectId,
            correlation_id: `corr-${eventId}`,
            occurred_at: new Date().toISOString(),
            producer_id: 'phase9-e2e',
            partition_key: `${tenantId}:${conversationId}`,
            payload: {
              message_id: eventId,
              conversation_id: conversationId,
              sender_id: 'phase9-e2e',
              content: {
                type: 'text',
                text: 'unsupported-event',
              },
            },
            metadata: {
              dedupe_key: `${tenantId}:${eventId}`,
            },
          }),
        },
      ],
    });
  } finally {
    await producer.disconnect().catch(() => {});
  }

  return eventId;
}

async function main() {
  const stamp = Date.now();
  const email = `phase9-${stamp}@example.com`;
  const password = 'Phase9Password-123!';
  const registerPayload = {
    company_name: `Phase9 Tenant ${stamp}`,
    email,
    password,
    plan: 'business',
    project: {
      name: `Project Alpha ${stamp}`,
      stack: 'react',
      environment: 'development',
    },
  };

  const register = await http('POST', `${cfg.gateway}/api/v1/auth/client/register`, registerPayload, {}, [201]);
  record('register tenant', register.ok, register);
  if (!register.ok) {
    process.exit(1);
  }

  const login = await http(
    'POST',
    `${cfg.gateway}/api/v1/auth/client/login`,
    { email, password },
    {},
    [200]
  );
  record('client login', login.ok, login);
  if (!login.ok) {
    process.exit(1);
  }

  const adminToken = login.json.access_token;
  const project1Id = register.json.project_id;
  const apiKey = register.json.api_key;

  const createProject = await http(
    'POST',
    `${cfg.gateway}/api/v1/auth/client/projects`,
    {
      name: `Project Beta ${stamp}`,
      stack: 'node',
      environment: 'staging',
    },
    { authorization: `Bearer ${adminToken}` },
    [201]
  );
  record('create secondary project', createProject.ok, createProject);
  if (!createProject.ok) {
    process.exit(1);
  }

  const project2Id = createProject.json.project.project_id;
  const session1 = await http(
    'POST',
    `${cfg.gateway}/api/v1/sdk/session`,
    {
      user_external_id: `phase9-user-a-${stamp}`,
      project_id: project1Id,
    },
    {
      'x-api-key': apiKey,
      'x-project-id': project1Id,
      'x-correlation-id': `phase9-a-${stamp}`,
      'idempotency-key': `phase9-a-${stamp}`,
      'x-timestamp': `${Math.floor(Date.now() / 1000)}`,
      'x-nonce': `phase9-a-${stamp}`,
    },
    [200, 201]
  );
  record('sdk session project alpha', session1.ok, session1);
  if (!session1.ok) {
    process.exit(1);
  }

  const session2 = await http(
    'POST',
    `${cfg.gateway}/api/v1/sdk/session`,
    {
      user_external_id: `phase9-user-b-${stamp}`,
      project_id: project2Id,
    },
    {
      'x-api-key': apiKey,
      'x-project-id': project2Id,
      'x-correlation-id': `phase9-b-${stamp}`,
      'idempotency-key': `phase9-b-${stamp}`,
      'x-timestamp': `${Math.floor(Date.now() / 1000)}`,
      'x-nonce': `phase9-b-${stamp}`,
    },
    [200, 201]
  );
  record('sdk session project beta', session2.ok, session2);
  if (!session2.ok) {
    process.exit(1);
  }

  const jwt1 = decodeJwt(session1.json.access_token);
  const jwt2 = decodeJwt(session2.json.access_token);
  const conversationId = `phase9-conv-${stamp}`;
  const searchText = `phase9-search-${stamp}`;

  await seedConversation({
    tenantId: jwt1.tenant_id,
    projectId: project1Id,
    conversationId,
    participantIds: [jwt1.user_id, jwt2.user_id],
  });
  record('seed project-scoped conversation', true, {
    tenantId: jwt1.tenant_id,
    projectId: project1Id,
    conversationId,
  });

  const chat1 = await socketConnect(cfg.socket1, '/chat', session1.json.access_token);
  record('socket connect project alpha', chat1.ok, chat1);
  if (!chat1.ok) {
    process.exit(1);
  }

  const chat2 = await socketConnect(cfg.socket2, '/chat', session2.json.access_token);
  record('socket connect project beta', chat2.ok, chat2);
  if (!chat2.ok) {
    chat1.socket.close();
    process.exit(1);
  }

  const joinAlpha = await socketAck(chat1.socket, 'joinRoom', { conversationId });
  record('joinRoom alpha ack received', !joinAlpha.timeout, joinAlpha);
  assertEnvelope('joinRoom alpha standardized envelope', joinAlpha.data, { status: 'ok', code: 'OK' });

  const joinBeta = await socketAck(chat2.socket, 'joinRoom', { conversationId });
  record('joinRoom beta ack received', !joinBeta.timeout, joinBeta);
  assertEnvelope('joinRoom beta standardized envelope', joinBeta.data, { status: 'error', code: 'FORBIDDEN' });

  const sendMessage = await socketAck(chat1.socket, 'sendMessage', {
    conversationId,
    messageContent: searchText,
  });
  record('sendMessage ack received', !sendMessage.timeout, sendMessage);
  assertEnvelope('sendMessage standardized envelope', sendMessage.data, { status: 'ok', code: 'OK' });

  const persisted = await waitForPersistence({
    tenantId: jwt1.tenant_id,
    conversationId,
    messageId: sendMessage.data?.data?.messageId,
  });
  record('socket to kafka to mongo persistence', persisted.ok, persisted);

  // Run all socket-dependent tests first (before the long-running DLQ test)
  const typingQuery = await socketAck(chat1.socket, 'typing_query', { conversationId });
  record('typing_query ack received', !typingQuery.timeout, typingQuery);
  assertEnvelope('typing_query standardized envelope', typingQuery.data, { status: 'ok', code: 'OK' });

  const searchResult = await waitForSearch(searchText, jwt1.tenant_id, conversationId);
  record('socket to kafka to search propagation', searchResult.ok, searchResult.response || {});

  const presence = await socketConnect(cfg.socket1, '/presence', session1.json.access_token);
  record('presence connect', presence.ok, presence);
  if (presence.ok) {
    const subscribe = await socketAck(presence.socket, 'presence_subscribe', { user_ids: [jwt2.user_id] });
    record('presence_subscribe ack received', !subscribe.timeout, subscribe);
    assertEnvelope('presence_subscribe standardized envelope', subscribe.data);
    presence.socket.close();
  }

  const webrtc = await socketConnect(cfg.socket1, '/webrtc', session1.json.access_token);
  record('webrtc connect', webrtc.ok, webrtc);
  if (webrtc.ok) {
    const ice = await socketAck(webrtc.socket, 'webrtc:get-ice-servers', {});
    record('webrtc:get-ice-servers ack received', !ice.timeout, ice);
    assertEnvelope('webrtc:get-ice-servers standardized envelope', ice.data, { status: 'ok', code: 'OK' });
    webrtc.socket.close();
  }

  const media = await socketConnect(cfg.socket1, '', session1.json.access_token);
  record('aux socket connect for media event', media.ok, media);
  if (media.ok) {
    const badMedia = await socketAck(media.socket, 'media:get-download-url', { file_id: '000000000000000000000000' });
    record('media:get-download-url ack received', !badMedia.timeout, badMedia);
    assertEnvelope('media:get-download-url standardized envelope', badMedia.data, { status: 'error' });
    media.socket.close();
  }

  // Close sockets before the long-running DLQ test
  chat1.socket.close();
  chat2.socket.close();

  // DLQ test runs last since it involves a 5-second wait + Kafka consumer scan
  const unsupportedEventId = `phase9-unsupported-${stamp}`;
  const dlqResult = await waitForDlqRecord({
    topic: cfg.kafkaInternalDlqTopic,
    predicate: (record) =>
      record &&
      record.reason === 'UNSUPPORTED_EVENT_TYPE' &&
      record.event_id === unsupportedEventId,
    action: async () => {
      await publishUnsupportedRealtimeEvent({
        tenantId: jwt1.tenant_id,
        projectId: project1Id,
        conversationId,
        eventId: unsupportedEventId,
      });
    },
  });
  record('unsupported realtime envelope routed to DLQ', dlqResult.ok, dlqResult);

  const failures = results.filter((item) => !item.ok);
  if (failures.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
