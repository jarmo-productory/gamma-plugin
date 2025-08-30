// Debug script to check extension authentication state
console.log('=== Extension Auth Debug ===');

// Check chrome storage for device tokens
chrome.storage.local.get(null, (result) => {
  console.log('All Chrome Storage Data:', result);
  
  const deviceToken = result.device_token_v1;
  const deviceInfo = result.device_info_v1;
  
  if (deviceToken) {
    console.log('Device Token Found:', deviceToken);
    
    // Test the token with the API
    fetch('http://localhost:3000/api/user/profile', {
      headers: {
        'Authorization': `Bearer ${deviceToken.token}`,
        'Content-Type': 'application/json'
      }
    })
    .then(response => response.json())
    .then(data => {
      console.log('API Response:', data);
    })
    .catch(error => {
      console.error('API Error:', error);
    });
  } else {
    console.log('No device token found');
  }
  
  if (deviceInfo) {
    console.log('Device Info Found:', deviceInfo);
  } else {
    console.log('No device info found');
  }
});