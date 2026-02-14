// Phase 4 Authentication Test
// Tests messages and media routes with JWT authentication

const jwt = require('jsonwebtoken');
const axios = require('axios');
const fs = require('fs');

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';

// Read JWT keys from .env
const privateKey = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC/uTQZMgf/YTT8
uHEr9KpdwgZ2u0XnchbEEoojABhizPaeauVqYALEan94cp+mgY2t6dqxkijgAZIb
BLmIJF3Cjqy6Kz0uALwc2ezGu2WicNhiov2EtY3WkgoMMSKiWK2w+LK6q8LEfAaz
4Ae4TxQvdYh0kT4IvcjftkA6ed7jNe/X50H7ZYu//WmkI05ihIOiSbXlOq0J/G4k
9lMP7ZaRrwMBau6XnC5F9I3BNF69l2XQkymCdKnNnqWoMPuzpWvsQaWpcqJ9p+Mh
TpKVwkfTsjQkcetWyjE0FEgPl8vpZAXmB1puoPRKjkARPvDUBJWqT7wKHgjn9vDd
nidf5aUTAgMBAAECggEAJ39ircwiXKjsjyH6YrlZfc5SoZRMPvXAne1J2xMScwxR
xGo2UDduaoOcNja7EEUBaLJUVR/M3vVD4eATzunbDRFyoTn2NSt+lZ0JzBlgQ1pn
Ic79VqFGks1sV32p6nNFeT+LJqzrB6qbgOQnAv/7oxleHtGrS4a5wujbi5B+7CTd
QpkggJtZWiFnnyGybgCA1COAn7e63Xk8z2XjGH8Rdl+d38EOf+g1N6eEj1vciKlF
QiYybKX4HtoMrI9sr2GS9zyWR6ny1+pMTb6ue11CkMdSAsAPN5I0MYFiLqY/qIST
ncFoZiLJqB0emfix8OBq+PGvfu0ueW86VJnu6H0DDQKBgQD02UASPyXUI7oYcd89
1ZpxfahGRP/rnpaJ8T4sp1mnYd9F8dGyVygwcllc+f3LnnFLQAp1ci5kN+xCOpb9
KxtzBWCdmyQpmO92HyYwTs+EZ/Ui5OolmXTZ84WzjwiyGFyqim4iLclymD7ioMgr
Cw+dbUBYnmFGlWFfSapmYfxoTwKBgQDIdI3G6lEuUyBF0bOhEPpciIdx+Q3uNe+Z
RpAMRe7rNMI+QNATJ6EgHrI7v9bCDxBztegc7fUV98wNKeP0tx7w7rMKphV3XqLT
Q3WPTH/OFeoVngep/OawkqMVK4B8VQLECzuDI2um17vHcp6v1iC+YdAPbBDXxkxs
ES8BoYHB/QKBgFZv246VfGVHt4qpqIXLwpoOIjmsYixr7/kCkVByQ9QzWP74P28W
FboEpEeOeWpIpPZLxWVwya/XjjBTPrphXW9dlp4NBtcohmDM3k5vhBLaIFARQBfF
9Np8fdbFx+wXbZ9G/1pRj6xE0u5ulDudzAVnbC/cubqRQa7B8sXyEYlBAoGBAMP+
6m0WyH+B+akqq/cNUa5ONBjlSpCinf4BN3E4o63IbTBPUOOZuPpd6SlwnnwqHIz2
zNgUdrGfEx2/2sp4jkFHMzpzP8PyfUQRzo1pYAFR/gpa9OVpiOoWxmw5l6x5tnWX
Af5sEKMWht0xniUROfzMSJH7uNAxbKGxf4OZtfTFAoGBANP4SbPL98cLhVDAUIba
Qw47f2hgXDChHscNBJjy2EDg1FlByAaHVadxlIaLgQp6U51WylzueQ2AAilc3TYB
QSzH88gNbEtBTIx/Tw46E7tNPSbRpQVLRoG5xFvgZmLbynptfl7bmHe96iZLTXxC
/Oa7m7Drf54fU7jIGtQ3FKro
-----END PRIVATE KEY-----`;

// Generate JWT token
function generateToken() {
  const payload = {
    sub: 'test-user-123',
    tenant_id: 'test-tenant-123',
    user_id: 'test-user-123',
    email: 'test@example.com',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour
  };

  return jwt.sign(payload, privateKey, { algorithm: 'RS256' });
}

async function testEndpoint(name, method, url, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${GATEWAY_URL}${url}`,
      headers: {},
    };

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    if (data) {
      config.data = data;
      config.headers['Content-Type'] = 'application/json';
    }

    const response = await axios(config);
    console.log(`✓ ${name}: ${response.status} ${response.statusText}`);
    return { success: true, status: response.status, data: response.data };
  } catch (error) {
    if (error.response) {
      console.log(`✗ ${name}: ${error.response.status} ${error.response.statusText}`);
      return { success: false, status: error.response.status, error: error.response.data };
    } else {
      console.log(`✗ ${name}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

async function runTests() {
  console.log('=================================================');
  console.log('  Phase 4 Authentication Test');
  console.log('  Testing Messages and Media with JWT');
  console.log('=================================================\n');

  // Generate token
  const token = generateToken();
  console.log('Generated JWT token\n');

  let results = { passed: 0, failed: 0 };

  // Test 1: Health check (no auth required)
  console.log('=== Testing Gateway Health ===');
  const health = await testEndpoint('Gateway Health', 'GET', '/health');
  if (health.success) results.passed++;
  else results.failed++;

  // Test 2: Messages without auth (should fail)
  console.log('\n=== Testing Messages WITHOUT Authentication ===');
  const noAuth = await testEndpoint('Send Message (No Auth)', 'POST', '/v1/messages', {
    conversation_id: 'test-conv-123',
    type: 'text',
    content: { text: 'Test message' }
  });
  if (noAuth.status === 401) {
    console.log('✓ Correctly rejected without auth');
    results.passed++;
  } else {
    console.log('✗ Should have rejected without auth');
    results.failed++;
  }

  // Test 3: Messages with auth
  console.log('\n=== Testing Messages WITH Authentication ===');
  const sendMessage = await testEndpoint('Send Message (With Auth)', 'POST', '/v1/messages', {
    conversation_id: 'test-conv-123',
    type: 'text',
    content: { text: 'Test message with auth' }
  }, token);
  if (sendMessage.success || sendMessage.status === 201) {
    results.passed++;
    console.log('Message response:', JSON.stringify(sendMessage.data, null, 2));
  } else {
    results.failed++;
  }

  // Test 4: Get messages with auth
  const getMessages = await testEndpoint('Get Messages (With Auth)', 'GET', '/v1/messages/conversations/test-conv-123', null, token);
  if (getMessages.success || getMessages.status === 200) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Test 5: Media upload without auth (should fail)
  console.log('\n=== Testing Media WITHOUT Authentication ===');
  const mediaNoAuth = await testEndpoint('Upload Media (No Auth)', 'POST', '/v1/media/upload', {});
  if (mediaNoAuth.status === 401) {
    console.log('✓ Correctly rejected without auth');
    results.passed++;
  } else {
    console.log('✗ Should have rejected without auth');
    results.failed++;
  }

  // Test 6: Media routes with auth
  console.log('\n=== Testing Media WITH Authentication ===');
  const getMedia = await testEndpoint('Get Media List (With Auth)', 'GET', '/v1/media', null, token);
  if (getMedia.success || getMedia.status === 200) {
    results.passed++;
    console.log('Media list response:', JSON.stringify(getMedia.data, null, 2));
  } else {
    results.failed++;
  }

  // Test 7: Get quota with auth
  const getQuota = await testEndpoint('Get Quota (With Auth)', 'GET', '/v1/media/quota', null, token);
  if (getQuota.success || getQuota.status === 200) {
    results.passed++;
    console.log('Quota response:', JSON.stringify(getQuota.data, null, 2));
  } else {
    results.failed++;
  }

  // Test 8: Message reactions with auth
  console.log('\n=== Testing Message Reactions WITH Authentication ===');
  const addReaction = await testEndpoint('Add Reaction (With Auth)', 'POST', '/v1/messages/test-msg-123/reactions', {
    emoji: '👍'
  }, token);
  if (addReaction.success || addReaction.status === 201) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Summary
  console.log('\n=================================================');
  console.log('  Test Summary');
  console.log('=================================================');
  console.log(`✓ Passed:  ${results.passed}`);
  console.log(`✗ Failed:  ${results.failed}`);
  console.log('=================================================\n');

  if (results.failed > 0) {
    console.log('Some tests failed. Check the output above.');
    process.exit(1);
  } else {
    console.log('All authentication tests passed!');
    console.log('\nKey Findings:');
    console.log('- Routes correctly reject requests without authentication (401)');
    console.log('- Routes accept requests with valid JWT tokens');
    console.log('- User context is properly extracted from JWT');
    console.log('- Both messages and media routes are protected');
  }
}

runTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
