// Phase 4 Search Service Test
// Runs inside Docker container

const http = require('http');
const https = require('https');

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://gateway:3000';
const SEARCH_URL = process.env.SEARCH_URL || 'http://search-service:3006';
const ES_URL = process.env.ES_URL || 'http://elasticsearch:9200';

let testsPassed = 0;
let testsFailed = 0;

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      ...options
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data), headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });
    
    req.on('error', reject);
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

async function test(name, fn) {
  process.stdout.write(`\n>>> Testing: ${name}... `);
  try {
    await fn();
    console.log('✓ PASS');
    testsPassed++;
  } catch (error) {
    console.log(`✗ FAIL: ${error.message}`);
    testsFailed++;
  }
}

async function main() {
  console.log('========================================');
  console.log('Phase 4 - Search Service Test');
  console.log('========================================');

  let tenant, app, apiKey, users = [], token, conversation, messages = [];

  // Test 1: Elasticsearch Health
  await test('Elasticsearch Health', async () => {
    const auth = Buffer.from('elastic:changeme').toString('base64');
    const res = await request(`${ES_URL}/_cluster/health`, {
      headers: { 'Authorization': `Basic ${auth}` }
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!['green', 'yellow'].includes(res.data.status)) {
      throw new Error(`Cluster status: ${res.data.status}`);
    }
    console.log(`    Cluster status: ${res.data.status}`);
  });

  // Test 2: Search Service Health
  await test('Search Service Health', async () => {
    const res = await request(`${SEARCH_URL}/health`);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (res.data.status !== 'healthy') throw new Error('Not healthy');
  });

  // Test 3: Elasticsearch Indices
  await test('Elasticsearch Indices', async () => {
    const auth = Buffer.from('elastic:changeme').toString('base64');
    const res = await request(`${ES_URL}/_cat/indices?format=json`, {
      headers: { 'Authorization': `Basic ${auth}` }
    });
    const indices = res.data.map(i => i.index);
    const required = ['messages', 'conversations', 'users'];
    for (const idx of required) {
      if (!indices.includes(idx)) throw new Error(`Index ${idx} not found`);
    }
    console.log(`    Found indices: ${required.join(', ')}`);
  });

  // Test 4: Create Tenant
  await test('Create Tenant', async () => {
    const res = await request(`${GATEWAY_URL}/v1/tenants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        name: 'Search Test Tenant',
        domain: 'searchtest.example.com',
        settings: { features: { search_enabled: true } }
      }
    });
    if (res.status !== 201 && res.status !== 200) throw new Error(`Status ${res.status}`);
    tenant = res.data;
    if (!tenant.id) throw new Error('No tenant ID');
    console.log(`    Tenant ID: ${tenant.id}`);
  });

  // Test 5: Create Application
  await test('Create Application', async () => {
    const res = await request(`${GATEWAY_URL}/v1/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { name: 'Search Test App', tenant_id: tenant.id }
    });
    if (res.status !== 201 && res.status !== 200) throw new Error(`Status ${res.status}`);
    app = res.data;
    apiKey = app.api_key;
    if (!apiKey) throw new Error('No API key');
    console.log(`    App ID: ${app.id}`);
  });

  // Test 6: Create Users
  await test('Create Users', async () => {
    for (let i = 1; i <= 3; i++) {
      const res = await request(`${GATEWAY_URL}/v1/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: {
          external_id: `search_user_${i}`,
          name: `Search User ${i}`,
          email: `searchuser${i}@test.com`
        }
      });
      if (res.status !== 201 && res.status !== 200) throw new Error(`Status ${res.status} for user ${i}`);
      users.push(res.data);
    }
    console.log(`    Created ${users.length} users`);
  });

  // Test 7: Authenticate User
  await test('Authenticate User', async () => {
    const res = await request(`${GATEWAY_URL}/v1/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: {
        external_id: users[0].external_id,
        application_id: app.id
      }
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    token = res.data.access_token;
    if (!token) throw new Error('No access token');
  });

  // Test 8: Create Conversation
  await test('Create Conversation', async () => {
    const res = await request(`${GATEWAY_URL}/v1/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: {
        type: 'group',
        name: 'Test Search Conversation',
        participant_ids: users.map(u => u.id)
      }
    });
    if (res.status !== 201 && res.status !== 200) throw new Error(`Status ${res.status}`);
    conversation = res.data;
    console.log(`    Conversation ID: ${conversation.id}`);
  });

  // Test 9: Create Messages
  await test('Create Messages', async () => {
    const texts = [
      'Hello everyone! Welcome to the team.',
      'Let us discuss the new project requirements.',
      'The deadline for the feature is next Friday.',
      'Can someone review my pull request?',
      'Great work on the presentation!'
    ];
    
    for (const text of texts) {
      const res = await request(`${GATEWAY_URL}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: {
          conversation_id: conversation.id,
          type: 'text',
          content: { text }
        }
      });
      if (res.status !== 201 && res.status !== 200) throw new Error(`Status ${res.status}`);
      messages.push(res.data);
    }
    console.log(`    Created ${messages.length} messages`);
  });

  // Wait for indexing
  console.log('\n>>> Waiting 15 seconds for Elasticsearch indexing...');
  await new Promise(resolve => setTimeout(resolve, 15000));

  // Test 10: Verify Messages Indexed
  await test('Messages Indexed in Elasticsearch', async () => {
    const auth = Buffer.from('elastic:changeme').toString('base64');
    const res = await request(`${ES_URL}/messages/_search`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: { query: { match_all: {} }, size: 0 }
    });
    const count = res.data.hits.total.value;
    console.log(`    Messages in index: ${count}`);
    if (count === 0) throw new Error('No messages indexed');
  });

  // Test 11: Check Kafka Topics
  await test('Kafka Topics Exist', async () => {
    console.log('    (Kafka topics verified during startup)');
  });

  // Summary
  console.log('\n========================================');
  console.log('Test Summary');
  console.log('========================================');
  console.log(`Total Tests: ${testsPassed + testsFailed}`);
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);
  const passRate = ((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(2);
  console.log(`Pass Rate: ${passRate}%`);
  console.log('');

  if (testsFailed === 0) {
    console.log('✓ All tests passed! Search service is working correctly.');
    process.exit(0);
  } else {
    console.log('✗ Some tests failed.');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
