import { TenantProducer } from './producers/tenant-producer';
import { BaseConsumer } from './consumers/base-consumer';
import { KafkaMessage } from './types/message-envelope';
import { v7 as uuidv7 } from 'uuid';

// Mock Config
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'kafka-1:29092,kafka-2:29092,kafka-3:29092').split(',');
const CLIENT_ID = 'test-client';
const TOPIC_PREFIX = 'test.topic';
const TENANT_ID = 'test-tenant';

async function runTest() {
  console.log('Starting Kafka Service Test...');

  // 1. Setup Producer
  const producer = new TenantProducer(
    { clientId: CLIENT_ID, brokers: KAFKA_BROKERS, connectionTimeout: 5000, requestTimeout: 10000 },
    { clientId: CLIENT_ID, brokers: KAFKA_BROKERS }
  );

  await producer.connect();
  console.log('Producer connected');

  // 2. Setup Consumer
  let messageReceived = false;
  const consumer = new class extends BaseConsumer<any> {
    constructor() {
      super(
        { 
          clientId: CLIENT_ID + '-consumer', 
          brokers: KAFKA_BROKERS, 
          groupId: 'test-group-' + Date.now(),
          topic: new RegExp(`${TOPIC_PREFIX}.*`),
          fromBeginning: true
        },
        {
          handle: async (msg: KafkaMessage<any>) => {
            console.log('Received message:', msg.id);
            console.log('Payload:', msg.payload);
            if (msg.payload.text === 'Hello Kafka') {
              messageReceived = true;
            }
          }
        }
      );
    }
  }();

  await consumer.start();
  console.log('Consumer started');

  // 3. Send Message
  const message: KafkaMessage<any> = {
    id: uuidv7(),
    type: 'test.event',
    version: '1.0',
    timestamp: Date.now(),
    tenant_id: TENANT_ID,
    source: 'test-script',
    payload: { text: 'Hello Kafka' },
    metadata: {}
  };

  await producer.sendToTenantTopic(TENANT_ID, TOPIC_PREFIX, message);
  console.log('Message sent');

  // 4. Wait for consumption
  let attempts = 0;
  while (!messageReceived && attempts < 20) {
    await new Promise(r => setTimeout(r, 1000));
    attempts++;
    process.stdout.write('.');
  }
  console.log('');

  if (messageReceived) {
    console.log('SUCCESS: Message received and verified!');
  } else {
    console.error('FAILURE: Message not received within timeout.');
  }

  // 5. Cleanup
  await producer.disconnect();
  await consumer.stop();
  console.log('Test finished');
  process.exit(messageReceived ? 0 : 1);
}

runTest().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
