const axios = require('axios');

async function testWhatsAppAPI() {
  const apiKey = '013749ffcc592bf230c93317fa65ee1222567f68dbb53212667e19ae1f07ee4f';
  const baseUrl = 'https://www.wasenderapi.com';
  const phoneNumber = '918247494622';
  const message = '🧪 API Test - Go-On Rides';

  console.log('Testing WasenderAPI...');
  console.log('Phone:', phoneNumber);
  console.log('Message:', message);
  console.log('API Key:', apiKey.substring(0, 10) + '...');
  console.log('');

  // Try the correct WasenderAPI format
  try {
    console.log('1. Trying correct WasenderAPI format...');
    console.log('URL:', `${baseUrl}/api/send-message`);
    console.log('Method: POST');
    console.log('Headers: Authorization: Bearer [API_KEY]');
    console.log('Body:', JSON.stringify({
      to: phoneNumber,
      text: message
    }, null, 2));

    const response = await axios.post(`${baseUrl}/api/send-message`, {
      to: phoneNumber,
      text: message
    }, {
      headers: {
        'Authorization': `Bearer token ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log('\n✅ SUCCESS!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.log('\n❌ Failed with correct format');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Error:', error.message);
    }

    // Try alternative formats
    const formats = [
      { name: 'API Key in Header', headers: { 'X-API-Key': apiKey } },
      { name: 'API Key in Body', body: { api_key: apiKey } },
      { name: 'Legacy Endpoint', url: `${baseUrl}/send-message` }
    ];

    for (const format of formats) {
      try {
        console.log(`\n2. Trying ${format.name}...`);
        const payload = {
          to: phoneNumber,
          text: message,
          ...(format.body || {})
        };

        console.log('URL:', format.url || `${baseUrl}/api/send-message`);
        console.log('Body:', JSON.stringify(payload, null, 2));

        const response = await axios.post(
          format.url || `${baseUrl}/api/send-message`,
          payload,
          {
            headers: {
              'Content-Type': 'application/json',
              ...(format.headers || {})
            },
            timeout: 10000
          }
        );

        console.log('\n✅ SUCCESS with', format.name);
        console.log('Response:', JSON.stringify(response.data, null, 2));
        return response.data;
      } catch (formatError) {
        console.log('\n❌ Failed with', format.name);
        if (formatError.response) {
          console.log('Status:', formatError.response.status);
          console.log('Response:', JSON.stringify(formatError.response.data, null, 2));
        } else {
          console.log('Error:', formatError.message);
        }
      }
    }

    console.log('\n❌ All methods failed');
    return null;
  }
}

console.log('='.repeat(50));
testWhatsAppAPI().then(() => {
  console.log('='.repeat(50));
  console.log('Test completed!');
}).catch(err => {
  console.error('Test failed:', err);
});
