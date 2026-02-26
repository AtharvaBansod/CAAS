const axios = require('axios');

async function testRegister() {
    try {
        console.log('Attempting to register client via gateway...');
        const response = await axios.post('http://localhost:3000/api/v1/auth/client/register', {
            company_name: 'Test Corp ' + Date.now(),
            email: 'admin' + Date.now() + '@test.com',
            password: 'password123',
            plan: 'free'
        });
        console.log('Registration success:', response.data);
    } catch (error) {
        console.error('Registration failed:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
}

testRegister();
