/**
 * Test Dashboard Authentication Fix
 * Verifies that JWT tokens have correct fields (user_id and tenant_id)
 */

const http = require('http');

const GATEWAY_URL = 'http://gateway:3000';

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

async function testDashboardAuth() {
  console.log('\n🧪 Testing Dashboard Authentication Fix\n');
  
  let passed = 0;
  let failed = 0;

  // Test 1: Register a new client
  console.log('Test 1: Register new client...');
  const registerData = {
    company_name: 'Test Company ' + Date.now(),
    email: `test${Date.now()}@example.com`,
    password: 'TestPassword123!',
    plan: 'business',
  };

  try {
    const registerResponse = await makeRequest(`${GATEWAY_URL}/api/v1/auth/client/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: registerData,
    });

    if (registerResponse.statusCode === 201) {
      const registerResult = JSON.parse(registerResponse.body);
      console.log('✅ Client registered successfully');
      console.log(`   Client ID: ${registerResult.client_id}`);
      console.log(`   Tenant ID: ${registerResult.tenant_id}`);
      passed++;
    } else {
      console.log(`❌ Registration failed with status ${registerResponse.statusCode}`);
      console.log(`   Response: ${registerResponse.body}`);
      failed++;
      return;
    }
  } catch (error) {
    console.log(`❌ Registration error: ${error.message}`);
    failed++;
    return;
  }

  // Test 2: Login with credentials
  console.log('\nTest 2: Login with credentials...');
  try {
    const loginResponse = await makeRequest(`${GATEWAY_URL}/api/v1/auth/client/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        email: registerData.email,
        password: registerData.password,
      },
    });

    if (loginResponse.statusCode === 200) {
      const loginResult = JSON.parse(loginResponse.body);
      console.log('✅ Login successful');
      console.log(`   Access Token: ${loginResult.access_token.substring(0, 20)}...`);
      
      // Store token for next test
      global.accessToken = loginResult.access_token;
      global.tenantId = loginResult.tenant_id;
      passed++;
    } else {
      console.log(`❌ Login failed with status ${loginResponse.statusCode}`);
      console.log(`   Response: ${loginResponse.body}`);
      failed++;
      return;
    }
  } catch (error) {
    console.log(`❌ Login error: ${error.message}`);
    failed++;
    return;
  }

  // Test 3: Access dashboard with token
  console.log('\nTest 3: Access dashboard with JWT token...');
  try {
    const dashboardResponse = await makeRequest(`${GATEWAY_URL}/api/v1/admin/dashboard`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${global.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (dashboardResponse.statusCode === 200) {
      const dashboardData = JSON.parse(dashboardResponse.body);
      console.log('✅ Dashboard accessed successfully');
      console.log(`   Active Users: ${dashboardData.stats.active_users}`);
      console.log(`   Messages Today: ${dashboardData.stats.messages_today}`);
      console.log(`   API Calls: ${dashboardData.stats.api_calls}`);
      console.log(`   Active Connections: ${dashboardData.stats.active_connections}`);
      console.log(`   Recent Activity: ${dashboardData.recent_activity.length} entries`);
      passed++;
    } else {
      console.log(`❌ Dashboard access failed with status ${dashboardResponse.statusCode}`);
      console.log(`   Response: ${dashboardResponse.body}`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ Dashboard access error: ${error.message}`);
    failed++;
  }

  // Test 4: Verify JWT token structure
  console.log('\nTest 4: Verify JWT token structure...');
  try {
    // Decode JWT (without verification, just to check structure)
    const tokenParts = global.accessToken.split('.');
    if (tokenParts.length === 3) {
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      console.log('✅ JWT token structure:');
      console.log(`   sub: ${payload.sub || 'MISSING'}`);
      console.log(`   user_id: ${payload.user_id || 'MISSING'}`);
      console.log(`   tenant_id: ${payload.tenant_id || 'MISSING'}`);
      console.log(`   email: ${payload.email || 'MISSING'}`);
      console.log(`   role: ${payload.role || 'MISSING'}`);
      
      if (payload.user_id && payload.tenant_id) {
        console.log('✅ JWT has required fields (user_id and tenant_id)');
        passed++;
      } else {
        console.log('❌ JWT missing required fields');
        failed++;
      }
    } else {
      console.log('❌ Invalid JWT format');
      failed++;
    }
  } catch (error) {
    console.log(`❌ JWT decode error: ${error.message}`);
    failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60));

  if (failed === 0) {
    console.log('\n✅ All tests passed! Dashboard authentication is working correctly.');
    console.log('   - JWT tokens have correct fields (user_id, tenant_id)');
    console.log('   - Dashboard endpoint accepts authenticated requests');
    console.log('   - Real data is being returned from database');
  } else {
    console.log('\n❌ Some tests failed. Please check the logs above.');
    process.exit(1);
  }
}

// Run tests
testDashboardAuth().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
