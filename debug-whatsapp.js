const axios = require('axios');

async function testWhatsAppAPI() {
  const apiKey = '013749ffcc592bf230c93317fa65ee1222567f68dbb53212667e19ae1f07ee4f';
  const baseUrl = 'https://www.wasenderapi.com';
  const phoneNumber = '918247494622';
  const message = 'API Test - Go-On Rides';

  console.log('Testing WasenderAPI with correct format...');
  console.log('API Key:', apiKey.substring(0, 10) + '...');
  console.log('Phone:', phoneNumber);
  console.log('Message:', message);
  console.log('');

  try {
    console.log('Making request to:', `${baseUrl}/api/send-message`);
    console.log('Headers:', {
      'Authorization': 'Bearer token ' + apiKey.substring(0, 10) + '...',
      'Content-Type': 'application/json'
    });
    console.log('Body:', JSON.stringify({
      to: phoneNumber,
      text: message
    }, null, 2));

    const response = await axios.post(`${baseUrl}/api/send-message`, {
      to: phoneNumber,
      text: message
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    console.log('\n✅ SUCCESS!');
    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.log('\n❌ FAILED');
    console.log('Error Name:', error.name);
    console.log('Error Message:', error.message);

    if (error.response) {
      console.log('Response Status:', error.response.status);
      console.log('Response Status Text:', error.response.statusText);
      console.log('Response Headers:', error.response.headers);
      console.log('Response Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.log('No response received');
      console.log('Request:', error.request);
    } else {
      console.log('Request setup error:', error.message);
    }

    return null;
  }
}

testWhatsAppAPI().then(() => {
  console.log('\nTest completed!');
}).catch(err => {
  console.error('Test failed:', err);
});
