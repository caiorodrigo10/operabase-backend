// Test API endpoints to verify data

async function testEndpoints() {
  try {
    // Test users endpoint
    console.log('Testing /api/clinic/1/users/management...');
    const usersResponse = await fetch('http://localhost:5000/api/clinic/1/users/management', {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    if (usersResponse.ok) {
      const users = await usersResponse.json();
      console.log('Users Response:', JSON.stringify(users, null, 2));
      console.log('Professional users:', users.filter(u => u.is_professional));
    } else {
      console.log('Users Response Status:', usersResponse.status);
      console.log('Users Response Text:', await usersResponse.text());
    }

    // Test config endpoint
    console.log('\nTesting /api/clinic/1/config...');
    const configResponse = await fetch('http://localhost:5000/api/clinic/1/config', {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    if (configResponse.ok) {
      const config = await configResponse.json();
      console.log('Config Response:', JSON.stringify(config, null, 2));
      console.log('Working days:', config.working_days);
      console.log('Work hours:', config.work_start, '-', config.work_end);
    } else {
      console.log('Config Response Status:', configResponse.status);
      console.log('Config Response Text:', await configResponse.text());
    }

  } catch (error) {
    console.error('Error testing endpoints:', error);
  }
}

// Run in browser console
console.log('Copy and paste this in the browser console while logged in:');
console.log(testEndpoints.toString());
console.log('testEndpoints()');