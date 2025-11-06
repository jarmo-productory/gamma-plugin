// Direct test of presentation save with existing device token
const API_URL = 'https://productory-powerups.netlify.app';

async function testSave(token) {
  const payload = {
    gamma_url: "https://gamma.app/docs/test-presentation-123",
    title: "Test Presentation from Simulator",
    timetable_data: {
      items: [
        { id: "slide1", title: "Slide 1", duration: 60 },
        { id: "slide2", title: "Slide 2", duration: 120 }
      ]
    },
    start_time: "09:00",
    total_duration: 180
  };

  console.log('\n📤 Testing Presentation Save');
  console.log('API URL:', `${API_URL}/api/presentations/save`);
  console.log('Token:', token.substring(0, 20) + '...');
  console.log('Payload:', JSON.stringify(payload, null, 2));

  const response = await fetch(`${API_URL}/api/presentations/save`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  console.log('\n📥 Response Status:', response.status);
  const text = await response.text();
  
  try {
    const json = JSON.parse(text);
    console.log('Response JSON:', JSON.stringify(json, null, 2));
  } catch {
    console.log('Response (not JSON):', text.substring(0, 500));
  }
}

// Get token from command line
const token = process.argv[2];
if (!token) {
  console.error('Usage: node test-save-direct.js <DEVICE_TOKEN>');
  process.exit(1);
}

testSave(token).catch(console.error);
