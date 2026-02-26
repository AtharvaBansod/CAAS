/**
 * Admin Portal Dashboard Integration Test
 * Tests that the admin portal frontend can successfully call the gateway dashboard endpoint
 */

const http = require('http');

const GATEWAY_URL = 'http://gateway:3000';
const ADMIN_PORTAL_URL = 'http://admin-portal:3100';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function testDashboardEndpoint() {
  console.log('\n🧪 Testing Admin Portal Dashboard Integration\n');
  
  let passed = 0;
  let failed = 0;

  // Test 1: Gateway dashboard endpoint is accessible
  try {
    console.log('Test 1: Gateway dashboard endpoint...');
    const response = await makeRequest(`${GATEWAY_URL}/api/v1/admin/dashboard`);
    
    if (response.statusCode === 200) {
      const data = JSON.parse(response.body);
      if (data.stats && data.recent_activity) {
        console.log('✅ Gateway dashboard endpoint returns correct data');
        console.log(`   Stats: ${data.stats.active_users} users, ${data.stats.messages_today} messages`);
        passed++;
      } else {
        console.log('❌ Gateway dashboard endpoint returns invalid data structure');
        failed++;
      }
    } else {
      console.log(`❌ Gateway dashboard endpoint returned status ${response.statusCode}`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ Gateway dashboard endpoint failed: ${error.message}`);
    failed++;
  }

  // Test 2: Admin portal is accessible
  try {
    console.log('\nTest 2: Admin portal accessibility...');
    const response = await makeRequest(`${ADMIN_PORTAL_URL}/api/health`);
    
    if (response.statusCode === 200) {
      console.log('✅ Admin portal is accessible');
      passed++;
    } else {
      console.log(`❌ Admin portal returned status ${response.statusCode}`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ Admin portal accessibility failed: ${error.message}`);
    failed++;
  }

  // Test 3: CORS headers are properly configured
  try {
    console.log('\nTest 3: CORS configuration...');
    const response = await makeRequest(`${GATEWAY_URL}/api/v1/admin/dashboard`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:4000',
        'Access-Control-Request-Method': 'GET',
      },
    });
    
    const allowOrigin = response.headers['access-control-allow-origin'];
    const allowCredentials = response.headers['access-control-allow-credentials'];
    
    if (allowOrigin && allowCredentials === 'true') {
      console.log('✅ CORS headers properly configured');
      console.log(`   Allow-Origin: ${allowOrigin}`);
      console.log(`   Allow-Credentials: ${allowCredentials}`);
      passed++;
    } else {
      console.log('❌ CORS headers not properly configured');
      console.log(`   Allow-Origin: ${allowOrigin || 'missing'}`);
      console.log(`   Allow-Credentials: ${allowCredentials || 'missing'}`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ CORS configuration test failed: ${error.message}`);
    failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60));

  if (failed === 0) {
    console.log('\n✅ All tests passed! Admin portal dashboard integration is working.');
    console.log('\n🌐 Access the admin portal at: http://localhost:4000');
    console.log('   The dashboard should now load without 404 errors.');
  } else {
    console.log('\n❌ Some tests failed. Please check the logs above.');
    process.exit(1);
  }
}

// Run tests
testDashboardEndpoint().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
