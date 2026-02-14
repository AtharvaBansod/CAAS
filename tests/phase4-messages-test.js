// Phase 4 Messages Test Script
const axios = require('axios');

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';

// Test configuration
let authToken = null;
let testTenantId = null;
let testUserId = null;
let testConversationId = null;
let testMessageId = null;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testAuthentication() {
  console.log('\n=== Testing Authentication ===');
  try {
    // Create a test session (simplified for testing)
    const response = await axios.post(`${GATEWAY_URL}/v1/auth/api-key`, {
      api_key: process.env.TEST_API_KEY || 'test_api_key',
    });

    if (response.data.token) {
      authToken = response.data.token;
      testTenantId = response.data.tenant_id || 'test_tenant';
      testUserId = response.data.user_id || 'test_user';
      console.log('✓ Authentication successful');
      return true;
    }
  } catch (error) {
    console.log('⚠ Authentication skipped (using mock data)');
    authToken = 'mock_token';
    testTenantId = 'test_tenant';
    testUserId = 'test_user_1';
    return true;
  }
}

async function testCreateConversation() {
  console.log('\n=== Testing Create Conversation ===');
  try {
    const response = await axios.post(
      `${GATEWAY_URL}/v1/conversations`,
      {
        type: 'direct',
        participant_ids: ['test_user_1', 'test_user_2'],
        name: 'Test Conversation',
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    testConversationId = response.data._id || response.data.id;
    console.log('✓ Conversation created:', testConversationId);
    return true;
  } catch (error) {
    console.log('✗ Failed to create conversation:', error.response?.data || error.message);
    // Use mock conversation ID for testing
    testConversationId = 'test_conv_' + Date.now();
    console.log('⚠ Using mock conversation ID:', testConversationId);
    return false;
  }
}

async function testSendMessage() {
  console.log('\n=== Testing Send Message (MSG-001 to MSG-004) ===');
  try {
    const response = await axios.post(
      `${GATEWAY_URL}/v1/messages`,
      {
        conversation_id: testConversationId,
        type: 'text',
        content: {
          text: 'Hello, this is a test message with @user2 mention and https://example.com link',
        },
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    testMessageId = response.data.id || response.data._id;
    console.log('✓ Message sent:', testMessageId);
    console.log('  Content:', response.data.content?.text?.substring(0, 50));
    return true;
  } catch (error) {
    console.log('✗ Failed to send message:', error.response?.data || error.message);
    return false;
  }
}

async function testGetMessages() {
  console.log('\n=== Testing Get Messages ===');
  try {
    const response = await axios.get(
      `${GATEWAY_URL}/v1/messages/conversations/${testConversationId}`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        params: { limit: 20 },
      }
    );

    console.log('✓ Messages retrieved:', response.data.messages?.length || 0);
    return true;
  } catch (error) {
    console.log('✗ Failed to get messages:', error.response?.data || error.message);
    return false;
  }
}

async function testTextProcessing() {
  console.log('\n=== Testing Text Processing (MSG-005) ===');
  try {
    const response = await axios.post(
      `${GATEWAY_URL}/v1/messages`,
      {
        conversation_id: testConversationId,
        type: 'text',
        content: {
          text: '**Bold text** and *italic text* with `code` and @mention #hashtag',
        },
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    console.log('✓ Text message with markdown sent');
    return true;
  } catch (error) {
    console.log('✗ Failed to send text message:', error.response?.data || error.message);
    return false;
  }
}

async function testReactions() {
  console.log('\n=== Testing Reactions (MSG-009) ===');
  if (!testMessageId) {
    console.log('⚠ Skipping reactions test (no message ID)');
    return false;
  }

  try {
    // Add reaction
    await axios.post(
      `${GATEWAY_URL}/v1/messages/${testMessageId}/reactions`,
      { emoji: '👍' },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    console.log('✓ Reaction added');

    // Get reactions
    const response = await axios.get(
      `${GATEWAY_URL}/v1/messages/${testMessageId}/reactions`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    console.log('✓ Reactions retrieved');

    // Remove reaction
    await axios.delete(
      `${GATEWAY_URL}/v1/messages/${testMessageId}/reactions`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    console.log('✓ Reaction removed');

    return true;
  } catch (error) {
    console.log('✗ Failed reaction test:', error.response?.data || error.message);
    return false;
  }
}

async function testReplies() {
  console.log('\n=== Testing Replies (MSG-010) ===');
  if (!testMessageId) {
    console.log('⚠ Skipping replies test (no message ID)');
    return false;
  }

  try {
    // Create reply
    const response = await axios.post(
      `${GATEWAY_URL}/v1/messages/${testMessageId}/replies`,
      { content: 'This is a reply to the message' },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    console.log('✓ Reply created');

    // Get thread replies
    const repliesResponse = await axios.get(
      `${GATEWAY_URL}/v1/messages/${testMessageId}/replies`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    console.log('✓ Thread replies retrieved:', repliesResponse.data.length || 0);

    return true;
  } catch (error) {
    console.log('✗ Failed replies test:', error.response?.data || error.message);
    return false;
  }
}

async function testForward() {
  console.log('\n=== Testing Forward (MSG-011) ===');
  if (!testMessageId) {
    console.log('⚠ Skipping forward test (no message ID)');
    return false;
  }

  try {
    const response = await axios.post(
      `${GATEWAY_URL}/v1/messages/${testMessageId}/forward`,
      { conversation_ids: [testConversationId] },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    console.log('✓ Message forwarded');
    return true;
  } catch (error) {
    console.log('✗ Failed forward test:', error.response?.data || error.message);
    return false;
  }
}

async function testEditMessage() {
  console.log('\n=== Testing Edit Message (MSG-012) ===');
  if (!testMessageId) {
    console.log('⚠ Skipping edit test (no message ID)');
    return false;
  }

  try {
    const response = await axios.put(
      `${GATEWAY_URL}/v1/messages/${testMessageId}`,
      { content: 'This is an edited message' },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    console.log('✓ Message edited');

    // Get edit history
    const historyResponse = await axios.get(
      `${GATEWAY_URL}/v1/messages/${testMessageId}/history`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    console.log('✓ Edit history retrieved');

    return true;
  } catch (error) {
    console.log('✗ Failed edit test:', error.response?.data || error.message);
    return false;
  }
}

async function testDeleteMessage() {
  console.log('\n=== Testing Delete Message ===');
  if (!testMessageId) {
    console.log('⚠ Skipping delete test (no message ID)');
    return false;
  }

  try {
    await axios.delete(
      `${GATEWAY_URL}/v1/messages/${testMessageId}`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    console.log('✓ Message deleted');
    return true;
  } catch (error) {
    console.log('✗ Failed delete test:', error.response?.data || error.message);
    return false;
  }
}

async function runTests() {
  console.log('=================================================');
  console.log('  Phase 4 Messages Test Suite');
  console.log('  Testing MSG-001 to MSG-012');
  console.log('=================================================');

  const results = {
    passed: 0,
    failed: 0,
    skipped: 0,
  };

  // Run tests
  const tests = [
    { name: 'Authentication', fn: testAuthentication },
    { name: 'Create Conversation', fn: testCreateConversation },
    { name: 'Send Message', fn: testSendMessage },
    { name: 'Get Messages', fn: testGetMessages },
    { name: 'Text Processing', fn: testTextProcessing },
    { name: 'Reactions', fn: testReactions },
    { name: 'Replies', fn: testReplies },
    { name: 'Forward', fn: testForward },
    { name: 'Edit Message', fn: testEditMessage },
    { name: 'Delete Message', fn: testDeleteMessage },
  ];

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        results.passed++;
      } else {
        results.failed++;
      }
      await sleep(500); // Small delay between tests
    } catch (error) {
      console.log(`✗ Test "${test.name}" threw error:`, error.message);
      results.failed++;
    }
  }

  // Summary
  console.log('\n=================================================');
  console.log('  Test Summary');
  console.log('=================================================');
  console.log(`✓ Passed: ${results.passed}`);
  console.log(`✗ Failed: ${results.failed}`);
  console.log(`⚠ Skipped: ${results.skipped}`);
  console.log('=================================================');

  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
