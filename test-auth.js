const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testAuth() {
  console.log('🧪 Testing Authentication System...\n');

  try {
    // Test 1: Login
    console.log('1. Testing Login...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'superadmin',
      password: 'admin123'
    });
    
    console.log('✅ Login successful');
    console.log('User:', loginResponse.data.user.username);
    console.log('Role:', loginResponse.data.user.role);
    console.log('Privileges:', loginResponse.data.user.privileges);
    
    const accessToken = loginResponse.data.accessToken;
    const refreshToken = loginResponse.data.refreshToken;

    // Test 2: Access protected endpoint
    console.log('\n2. Testing Protected Endpoint...');
    const protectedResponse = await axios.get(`${BASE_URL}/superadmin/hello`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    console.log('✅ Protected endpoint accessible');
    console.log('Response:', protectedResponse.data);

    // Test 3: Get user profile
    console.log('\n3. Testing Profile Endpoint...');
    const profileResponse = await axios.get(`${BASE_URL}/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    console.log('✅ Profile retrieved');
    console.log('Profile:', profileResponse.data);

    // Test 4: Validate token
    console.log('\n4. Testing Token Validation...');
    const validateResponse = await axios.get(`${BASE_URL}/auth/validate`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    console.log('✅ Token validated');
    console.log('Validation:', validateResponse.data);

    // Test 5: Refresh token
    console.log('\n5. Testing Token Refresh...');
    const refreshResponse = await axios.post(`${BASE_URL}/auth/refresh`, {
      refreshToken: refreshToken
    });
    
    console.log('✅ Token refreshed');
    console.log('New access token received');

    // Test 6: Logout
    console.log('\n6. Testing Logout...');
    await axios.post(`${BASE_URL}/auth/logout`, {}, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    console.log('✅ Logout successful');

    // Test 7: Try to access protected endpoint after logout
    console.log('\n7. Testing Access After Logout...');
    try {
      await axios.get(`${BASE_URL}/superadmin/hello`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      console.log('❌ Should not be accessible after logout');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Correctly denied access after logout');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testAuth(); 