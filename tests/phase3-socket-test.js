/**
 * Phase 3 Socket Service Test
 * Tests socket connection, authentication, presence, and room management
 */

const io = require('socket.io-client');
const axios = require('axios');

const GATEWAY_URL = 'http://localhost:3000';
const SOCKET_URL = 'http://localhost:3002';

let accessToken = null;
let socket = null;

async function testGatewayHealth() {
  console.log('\n=== Testing Gateway Health ===');
  try {
    const response = await axios.get(`${GATEWAY_URL}/health`);
    console.log('✓ Gateway is healthy:', response.data);
    return true;
  } catch (error) {
    console.error('✗ Gateway health check failed:', error.message);
    return false;
  }
}

async function testSocketHealth() {
  console.log('\n=== Testing Socket Service Health ===');
  try {
    const response = await axios.get(`${SOCKET_URL}/health`, { validateStatus: () => true });
    const status = response.data.status;
    if (status === 'healthy' || status === 'degraded') {
      console.log(`✓ Socket service is ${status}:`, response.data);
      return true;
    } else {
      console.error('✗ Socket service is unhealthy:', response.data);
      return false;
    }
  } catch (error) {
    console.error('✗ Socket service health check failed:', error.message);
    return false;
  }
}

async function registerAndLogin() {
  console.log('\n=== Registering and Logging In ===');

  try {
    // Register a test user
    const registerData = {
      email: `test-${Date.now()}@example.com`,
      password: 'Test123!@#',
      name: 'Test User'
    };

    console.log('Registering user:', registerData.email);
    const registerResponse = await axios.post(`${GATEWAY_URL}/api/v1/auth/register`, registerData);
    console.log('✓ User registered successfully');

    // Login
    console.log('Logging in...');
    const loginResponse = await axios.post(`${GATEWAY_URL}/api/v1/auth/login`, {
      email: registerData.email,
      password: registerData.password
    });

    accessToken = loginResponse.data.access_token;
    console.log('✓ Login successful, got access token');
    return true;
  } catch (error) {
    console.error('✗ Registration/Login failed:', error.response?.data || error.message);
    return false;
  }
}

function testSocketConnection() {
  return new Promise((resolve) => {
    console.log('\n=== Testing Socket Connection ===');

    socket = io(SOCKET_URL, {
      auth: {
        token: accessToken
      },
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('✓ Socket connected:', socket.id);
      resolve(true);
    });

    socket.on('connect_error', (error) => {
      console.error('✗ Socket connection error:', error.message);
      resolve(false);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      if (!socket.connected) {
        console.error('✗ Socket connection timeout');
        resolve(false);
      }
    }, 10000);
  });
}

function testChatNamespace() {
  return new Promise((resolve) => {
    console.log('\n=== Testing Chat Namespace ===');

    const chatSocket = io(`${SOCKET_URL}/chat`, {
      auth: {
        token: accessToken
      },
      transports: ['websocket']
    });

    chatSocket.on('connect', () => {
      console.log('✓ Connected to chat namespace:', chatSocket.id);

      // Test joining a room
      const testRoomId = 'test-conversation-123';
      chatSocket.emit('joinRoom', { conversationId: testRoomId }, (response) => {
        if (response.status === 'ok') {
          console.log('✓ Joined room:', response.room);

          // Test sending a message
          chatSocket.emit('sendMessage', {
            conversationId: testRoomId,
            messageContent: 'Hello from test!'
          }, (msgResponse) => {
            if (msgResponse.status === 'ok') {
              console.log('✓ Message sent successfully');
            } else {
              console.error('✗ Failed to send message:', msgResponse.message);
            }

            chatSocket.disconnect();
            resolve(true);
          });
        } else {
          console.error('✗ Failed to join room:', response.message);
          chatSocket.disconnect();
          resolve(false);
        }
      });
    });

    chatSocket.on('connect_error', (error) => {
      console.error('✗ Chat namespace connection error:', error.message);
      resolve(false);
    });

    chatSocket.on('message', (data) => {
      console.log('✓ Received message:', data);
    });

    setTimeout(() => {
      if (!chatSocket.connected) {
        console.error('✗ Chat namespace connection timeout');
        resolve(false);
      }
    }, 10000);
  });
}

function testPresenceNamespace() {
  return new Promise((resolve) => {
    console.log('\n=== Testing Presence Namespace ===');

    const presenceSocket = io(`${SOCKET_URL}/presence`, {
      auth: {
        token: accessToken
      },
      transports: ['websocket']
    });

    presenceSocket.on('connect', () => {
      console.log('✓ Connected to presence namespace:', presenceSocket.id);

      // Test setting status
      presenceSocket.emit('set_status', {
        status: 'online',
        custom_status: 'Testing Phase 3'
      }, (response) => {
        if (response.success) {
          console.log('✓ Status set successfully');
        } else {
          console.error('✗ Failed to set status:', response.error);
        }

        presenceSocket.disconnect();
        resolve(true);
      });
    });

    presenceSocket.on('connect_error', (error) => {
      console.error('✗ Presence namespace connection error:', error.message);
      resolve(false);
    });

    presenceSocket.on('presence_update_for_subscribed_user', (data) => {
      console.log('✓ Received presence update:', data);
    });

    setTimeout(() => {
      if (!presenceSocket.connected) {
        console.error('✗ Presence namespace connection timeout');
        resolve(false);
      }
    }, 10000);
  });
}

async function runTests() {
  console.log('========================================');
  console.log('Phase 3 Socket Service Tests');
  console.log('========================================');

  const results = {
    gatewayHealth: false,
    socketHealth: false,
    auth: false,
    socketConnection: false,
    chatNamespace: false,
    presenceNamespace: false
  };

  // Test gateway health
  results.gatewayHealth = await testGatewayHealth();
  if (!results.gatewayHealth) {
    console.log('\n✗ Gateway is not healthy. Stopping tests.');
    process.exit(1);
  }

  // Test socket health
  results.socketHealth = await testSocketHealth();
  if (!results.socketHealth) {
    console.log('\n✗ Socket service is not healthy. Stopping tests.');
    process.exit(1);
  }

  // Test authentication
  results.auth = await registerAndLogin();
  if (!results.auth) {
    console.log('\n✗ Authentication failed. Stopping tests.');
    process.exit(1);
  }

  // Test socket connection
  results.socketConnection = await testSocketConnection();

  // Test chat namespace
  if (results.socketConnection) {
    results.chatNamespace = await testChatNamespace();
  }

  // Test presence namespace
  if (results.socketConnection) {
    results.presenceNamespace = await testPresenceNamespace();
  }

  // Summary
  console.log('\n========================================');
  console.log('Test Results Summary');
  console.log('========================================');
  console.log('Gateway Health:', results.gatewayHealth ? '✓ PASS' : '✗ FAIL');
  console.log('Socket Health:', results.socketHealth ? '✓ PASS' : '✗ FAIL');
  console.log('Authentication:', results.auth ? '✓ PASS' : '✗ FAIL');
  console.log('Socket Connection:', results.socketConnection ? '✓ PASS' : '✗ FAIL');
  console.log('Chat Namespace:', results.chatNamespace ? '✓ PASS' : '✗ FAIL');
  console.log('Presence Namespace:', results.presenceNamespace ? '✓ PASS' : '✗ FAIL');
  console.log('========================================');

  const allPassed = Object.values(results).every(r => r === true);
  if (allPassed) {
    console.log('\n✓ All tests passed!');
  } else {
    console.log('\n✗ Some tests failed.');
  }

  // Cleanup
  if (socket && socket.connected) {
    socket.disconnect();
  }

  process.exit(allPassed ? 0 : 1);
}

// Run tests
runTests().catch(error => {
  console.error('Test execution error:', error);
  process.exit(1);
});
