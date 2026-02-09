const io = require('socket.io-client');

console.log('🧪 Phase 3 - WebRTC and Advanced Features Test\n');
console.log('Testing new features in Docker network...\n');

// Test configuration
const SOCKET_SERVICE_1 = process.env.SOCKET_SERVICE_1 || 'http://socket-service-1:3001';
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

async function testWebRTCNamespace() {
    console.log('📞 Test: WebRTC Namespace\n');

    return new Promise((resolve) => {
        const socket = io(`${SOCKET_SERVICE_1}/webrtc`, {
            transports: ['websocket'],
            reconnection: false,
            timeout: 5000
        });

        socket.on('connect', () => {
            logTest('WebRTC namespace is accessible', true);
            socket.close();
            console.log('');
            resolve();
        });

        socket.on('connect_error', (error) => {
            // Expected - no auth token
            if (error.message.includes('Authentication') || error.message.includes('auth')) {
                logTest('WebRTC namespace authentication', true, 'Auth middleware is working');
            } else {
                logTest('WebRTC namespace', false, error.message);
            }
            socket.close();
            console.log('');
            resolve();
        });

        setTimeout(() => {
            logTest('WebRTC namespace timeout', false, 'No response after 5s');
            socket.close();
            console.log('');
            resolve();
        }, 5000);
    });
}

async function runTests() {
    console.log('═══════════════════════════════════════════════════════\n');

    await testWebRTCNamespace();

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
