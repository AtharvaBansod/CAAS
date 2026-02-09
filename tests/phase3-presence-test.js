const io = require('socket.io-client');

console.log('🧪 Phase 3 - Presence Subscriptions Test\n');
console.log('Testing socket services in Docker network...\n');

// Test configuration
const SOCKET_SERVICE_1 = process.env.SOCKET_SERVICE_1 || 'http://socket-service-1:3001';
const SOCKET_SERVICE_2 = process.env.SOCKET_SERVICE_2 || 'http://socket-service-2:3001';
const TEST_TOKEN = process.env.TEST_TOKEN || 'invalid-token';

let testsPassed = 0;
let testsFailed = 0;

function logTest(name, passed, message) {
  if (passed) {
    console.log(`✅ ${name}`);
    if (message) console.log(`   ${message}`);
    testsPassed++;
  } else {
    console.log(`❌ ${name}`);
    if (message) console.log(`   ${message}`);
    testsFailed++;
  }
}

async function testSocketConnectivity() {
  console.log('📡 Test 1: Socket Service Connectivity\n');

  return new Promise((resolve) => {
    const socket1 = io(SOCKET_SERVICE_1, {
      transports: ['websocket'],
      reconnection: false,
      timeout: 5000
    });

    const socket2 = io(SOCKET_SERVICE_2, {
      transports: ['websocket'],
      reconnection: false,
      timeout: 5000
    });

    let socket1Done = false;
    let socket2Done = false;
    let timeout;

    socket1.on('connect', () => {
      socket1Done = true;
      logTest('Socket Service 1 is reachable', true, SOCKET_SERVICE_1);
      checkComplete();
    });

    socket1.on('connect_error', (error) => {
      socket1Done = true;
      // Auth failure means server is reachable - connectivity test passes
      if (error.message.includes('Authentication') || error.message.includes('auth') || error.message.includes('token')) {
        logTest('Socket Service 1 is reachable', true, `${SOCKET_SERVICE_1} (auth enforced)`);
      } else {
        logTest('Socket Service 1 connectivity', false, `Error: ${error.message}`);
      }
      checkComplete();
    });

    socket2.on('connect', () => {
      socket2Done = true;
      logTest('Socket Service 2 is reachable', true, SOCKET_SERVICE_2);
      checkComplete();
    });

    socket2.on('connect_error', (error) => {
      socket2Done = true;
      // Auth failure means server is reachable - connectivity test passes
      if (error.message.includes('Authentication') || error.message.includes('auth') || error.message.includes('token')) {
        logTest('Socket Service 2 is reachable', true, `${SOCKET_SERVICE_2} (auth enforced)`);
      } else {
        logTest('Socket Service 2 connectivity', false, `Error: ${error.message}`);
      }
      checkComplete();
    });

    timeout = setTimeout(() => {
      if (!socket1Done) {
        logTest('Socket Service 1 timeout', false, 'Connection timeout after 5s');
      }
      if (!socket2Done) {
        logTest('Socket Service 2 timeout', false, 'Connection timeout after 5s');
      }
      cleanup();
    }, 5000);

    function checkComplete() {
      if (socket1Done && socket2Done) {
        clearTimeout(timeout);
        cleanup();
      }
    }

    function cleanup() {
      socket1.close();
      socket2.close();
      console.log('');
      resolve();
    }
  });

}

async function testChatNamespace() {
  console.log('💬 Test 2: Chat Namespace\n');

  return new Promise((resolve) => {
    const socket = io(`${SOCKET_SERVICE_1}/chat`, {
      transports: ['websocket'],
      reconnection: false,
      timeout: 5000
    });

    socket.on('connect', () => {
      logTest('Chat namespace is accessible', true);
      socket.close();
      console.log('');
      resolve();
    });

    socket.on('connect_error', (error) => {
      // Expected - no auth token
      if (error.message.includes('Authentication') || error.message.includes('auth')) {
        logTest('Chat namespace authentication', true, 'Auth middleware is working');
      } else {
        logTest('Chat namespace', false, error.message);
      }
      socket.close();
      console.log('');
      resolve();
    });

    setTimeout(() => {
      logTest('Chat namespace timeout', false, 'No response after 5s');
      socket.close();
      console.log('');
      resolve();
    }, 5000);
  });
}

async function testPresenceNamespace() {
  console.log('👤 Test 3: Presence Namespace\n');

  return new Promise((resolve) => {
    const socket = io(`${SOCKET_SERVICE_1}/presence`, {
      transports: ['websocket'],
      reconnection: false,
      timeout: 5000
    });

    socket.on('connect', () => {
      logTest('Presence namespace is accessible', true);
      socket.close();
      console.log('');
      resolve();
    });

    socket.on('connect_error', (error) => {
      // Expected - no auth token
      if (error.message.includes('Authentication') || error.message.includes('auth')) {
        logTest('Presence namespace authentication', true, 'Auth middleware is working');
      } else {
        logTest('Presence namespace', false, error.message);
      }
      socket.close();
      console.log('');
      resolve();
    });

    setTimeout(() => {
      logTest('Presence namespace timeout', false, 'No response after 5s');
      socket.close();
      console.log('');
      resolve();
    }, 5000);
  });
}

async function testHealthEndpoints() {
  console.log('🏥 Test 4: Health Endpoints\n');

  const http = require('http');

  function checkHealth(url, serviceName) {
    return new Promise((resolve) => {
      http.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const health = JSON.parse(data);
            const isHealthy = health.status === 'healthy' || health.status === 'degraded';
            logTest(`${serviceName} health endpoint`, isHealthy, `Status: ${health.status}`);
            resolve();
          } catch (error) {
            logTest(`${serviceName} health endpoint`, false, 'Invalid JSON response');
            resolve();
          }
        });
      }).on('error', (error) => {
        logTest(`${serviceName} health endpoint`, false, error.message);
        resolve();
      });
    });
  }

  await checkHealth('http://socket-service-1:3001/health', 'Socket Service 1');
  await checkHealth('http://socket-service-2:3001/health', 'Socket Service 2');
  console.log('');
}

async function testRedisConnectivity() {
  console.log('🔴 Test 5: Redis Connectivity (via health check)\n');

  const http = require('http');

  return new Promise((resolve) => {
    http.get('http://socket-service-1:3001/health', (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const health = JSON.parse(data);
          if (health.checks && health.checks.redis) {
            const redisHealthy = health.checks.redis.status === 'healthy';
            logTest('Redis connection', redisHealthy,
              `Latency: ${health.checks.redis.latency_ms}ms`);
          } else {
            logTest('Redis connection', false, 'No Redis health check data');
          }
          console.log('');
          resolve();
        } catch (error) {
          logTest('Redis connection check', false, 'Could not parse health data');
          console.log('');
          resolve();
        }
      });
    }).on('error', (error) => {
      logTest('Redis connection check', false, error.message);
      console.log('');
      resolve();
    });
  });
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════\n');

  await testSocketConnectivity();
  await testChatNamespace();
  await testPresenceNamespace();
  await testHealthEndpoints();
  await testRedisConnectivity();

  console.log('═══════════════════════════════════════════════════════\n');
  console.log('📊 Test Summary\n');
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`📈 Total:  ${testsPassed + testsFailed}`);
  console.log('');

  if (testsFailed === 0) {
    console.log('🎉 All tests passed!\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Check the output above.\n');
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('❌ Test suite error:', error);
  process.exit(1);
});
