const http = require('http');

const data = JSON.stringify({
  company_name: 'Test Company',
  email: `test${Date.now()}@example.com`,
  password: 'TestPassword123!',
  plan: 'business'
});

const options = {
  hostname: 'auth-service',
  port: 3001,
  path: '/api/v1/auth/client/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('Testing direct auth service registration...');
console.log('Data:', data);

const startTime = Date.now();

const req = http.request(options, (res) => {
  let body = '';
  
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    const duration = Date.now() - startTime;
    console.log(`\nStatus: ${res.statusCode}`);
    console.log(`Duration: ${duration}ms`);
    console.log(`Response: ${body}`);
    
    if (res.statusCode === 201) {
      console.log('\n✅ Registration successful!');
    } else {
      console.log('\n❌ Registration failed');
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
  process.exit(1);
});

req.write(data);
req.end();
