const axios = require('axios');

async function testConnection() {
  console.log('Testing WhatsApp API connection...');

  // Check if API key is set
  if (!process.env.NEXT_PUBLIC_WASENDER_API_KEY) {
    console.error('❌ Error: NEXT_PUBLIC_WASENDER_API_KEY environment variable is not set');
    console.log('\nPlease set the environment variable and try again:');
    console.log('For Windows (PowerShell): $env:NEXT_PUBLIC_WASENDER_API_KEY="your-api-key"');
    console.log('For Linux/Mac: export NEXT_PUBLIC_WASENDER_API_KEY=your-api-key');
    return;
  }

  console.log('✅ NEXT_PUBLIC_WASENDER_API_KEY is set');
  
  try {
    // Test the connection using the working API format
    const apiKey = process.env.NEXT_PUBLIC_WASENDER_API_KEY;
    const baseUrl = 'https://www.wasenderapi.com';
    const phoneNumber = '918247494622';
    const message = 'API Connection Test - Go-On Rides';

    console.log('Making request to:', `${baseUrl}/api/send-message`);

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

    if (response.data.success) {
      console.log('✅ WhatsApp API connection test successful!');
      console.log('Message ID:', response.data.data.msgId);
      console.log('Status:', response.data.data.status);
    } else {
      console.error('❌ WhatsApp API connection test failed:');
      console.error('Error:', response.data);
    }
  } catch (error) {
    console.error('❌ An error occurred during connection test:');
    console.error(error);

    if (error.response) {
      console.error('\nAPI Response Data:', error.response.data);
      console.error('Status Code:', error.response.status);
      console.error('Headers:', error.response.headers);
    } else if (error.request) {
      console.error('No response received from server. Check your network connection.');
      console.error('Request:', error.request);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testConnection();
