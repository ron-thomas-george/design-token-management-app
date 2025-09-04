const fetch = require('node-fetch');

async function testApi() {
  const apiKey = process.argv[2];
  
  if (!apiKey) {
    console.error('Please provide an API key as an argument');
    process.exit(1);
  }

  const token = {
    name: `test-red-${Date.now()}`,
    value: '#ff0000',
    type: 'color',
    description: 'Test token from script'
  };

  const payload = {
    tokens: [token],
    _debug: true
  };

  try {
    console.log('Sending request with payload:', JSON.stringify(payload, null, 2));
    
    const response = await fetch('https://design-token-management-app.vercel.app/api/tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    
    console.log('\n--- Response ---');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('Headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
    
    try {
      const data = JSON.parse(responseText);
      console.log('\nResponse Body:');
      console.log(JSON.stringify(data, null, 2));
    } catch (e) {
      console.log('\nResponse (raw):', responseText);
    }
    
  } catch (error) {
    console.error('\n--- Error ---');
    console.error('Message:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', error.response.data);
    }
    console.error('Stack:', error.stack);
  }
}

testApi();
