/**
 * Phase 6 Integration Test
 * Tests Admin Portal → Gateway → Backend Services flow
 */

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://gateway:3000';
const ADMIN_PORTAL_URL = process.env.ADMIN_PORTAL_URL || 'http://admin-portal:3100';

let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m'
  };
  console.log(`${colors[type]}${message}\x1b[0m`);
}

function recordTest(name, passed, error = null) {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    log(`✓ ${name}`, 'success');
  } else {
    testResults.failed++;
    log(`✗ ${name}: ${error}`, 'error');
  }
  testResults.tests.push({ name, passed, error });
}

async function testClientRegistration() {
  try {
    const email = `admin-${Date.now()}@test.com`;
    const password = 'TestPassword123!';
    
    const response = await fetch(`${GATEWAY_URL}/api/v1/auth/client/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_name: `Test Company ${Date.now()}`,
        email,
        password,
        plan: 'business'
      })
    });

    const data = await response.json();
    
    if (response.status === 201 && data.client_id && data.api_key) {
      recordTest('Client Registration via Gateway', true);
      return { ...data, email, password };
    } else {
      recordTest('Client Registration via Gateway', false, `Status: ${response.status}`);
      return null;
    }
  } catch (error) {
    recordTest('Client Registration via Gateway', false, error.message);
    return null;
  }
}

async function testClientLogin(email, password) {
  try {
    const response = await fetch(`${GATEWAY_URL}/api/v1/auth/client/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    
    if (response.status === 200 && data.access_token) {
      recordTest('Client Login via Gateway', true);
      return data;
    } else {
      recordTest('Client Login via Gateway', false, `Status: ${response.status}`);
      return null;
    }
  } catch (error) {
    recordTest('Client Login via Gateway', false, error.message);
    return null;
  }
}

async function testDashboardEndpoint(accessToken) {
  try {
    const response = await fetch(`${GATEWAY_URL}/api/v1/admin/dashboard`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (response.status === 200 && data.stats) {
      recordTest('Dashboard API via Gateway', true);
      return data;
    } else {
      recordTest('Dashboard API via Gateway', false, `Status: ${response.status}, Body: ${JSON.stringify(data)}`);
      return null;
    }
  } catch (error) {
    recordTest('Dashboard API via Gateway', false, error.message);
    return null;
  }
}

async function testAdminPortalHealth() {
  try {
    const response = await fetch(`${ADMIN_PORTAL_URL}/api/health`);
    const data = await response.json();
    
    if (response.status === 200 && data.status === 'healthy') {
      recordTest('Admin Portal Health Check', true);
      return true;
    } else {
      recordTest('Admin Portal Health Check', false, `Status: ${response.status}`);
      return false;
    }
  } catch (error) {
    recordTest('Admin Portal Health Check', false, error.message);
    return false;
  }
}

async function testGatewayHealth() {
  try {
    const response = await fetch(`${GATEWAY_URL}/health`);
    const data = await response.json();
    
    if (response.status === 200 && data.status === 'ok') {
      recordTest('Gateway Health Check', true);
      return true;
    } else {
      recordTest('Gateway Health Check', false, `Status: ${response.status}`);
      return false;
    }
  } catch (error) {
    recordTest('Gateway Health Check', false, error.message);
    return false;
  }
}

async function testTokenRefresh(refreshToken) {
  try {
    const response = await fetch(`${GATEWAY_URL}/api/v1/auth/client/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken })
    });

    const data = await response.json();
    
    if (response.status === 200 && data.access_token) {
      recordTest('Token Refresh via Gateway', true);
      return data;
    } else {
      recordTest('Token Refresh via Gateway', false, `Status: ${response.status}`);
      return null;
    }
  } catch (error) {
    recordTest('Token Refresh via Gateway', false, error.message);
    return null;
  }
}

async function runTests() {
  log('\n========================================', 'info');
  log('Phase 6 Integration Test', 'info');
  log('Testing: Admin Portal → Gateway → Services', 'info');
  log('========================================\n', 'info');

  // Test 1: Health Checks
  log('[1] Health Checks...', 'info');
  await testAdminPortalHealth();
  await testGatewayHealth();

  // Test 2: Client Registration
  log('\n[2] Client Registration...', 'info');
  const registrationData = await testClientRegistration();
  
  if (!registrationData) {
    log('\nTests aborted: Registration failed', 'error');
    printSummary();
    process.exit(1);
  }

  const { email, password } = registrationData;

  // Test 3: Client Login
  log('\n[3] Client Login...', 'info');
  const loginData = await testClientLogin(email, password);
  
  if (!loginData) {
    log('\nTests aborted: Login failed', 'error');
    printSummary();
    process.exit(1);
  }

  // Test 4: Dashboard API
  log('\n[4] Dashboard API...', 'info');
  await testDashboardEndpoint(loginData.access_token);

  // Test 5: Token Refresh
  log('\n[5] Token Refresh...', 'info');
  if (loginData.refresh_token) {
    await testTokenRefresh(loginData.refresh_token);
  } else {
    recordTest('Token Refresh via Gateway', false, 'No refresh token provided');
  }

  printSummary();
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

function printSummary() {
  log('\n========================================', 'info');
  log('Test Summary', 'info');
  log('========================================', 'info');
  log(`Total: ${testResults.total}`, 'info');
  log(`Passed: ${testResults.passed}`, 'success');
  log(`Failed: ${testResults.failed}`, testResults.failed > 0 ? 'error' : 'success');
  log('========================================\n', 'info');
}

// Run tests
runTests().catch(error => {
  log(`\nFatal error: ${error.message}`, 'error');
  process.exit(1);
});
