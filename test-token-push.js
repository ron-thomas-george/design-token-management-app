const fetch = require('node-fetch');

async function testTokenPush() {
  const apiKey = process.argv[2];
  
  if (!apiKey) {
    console.error('Please provide an API key as an argument');
    process.exit(1);
  }

  const token = {
    name: 'test-red-' + Math.floor(Math.random() * 1000), // Ensure unique name
    value: '#ff0000',
    type: 'color',
    description: 'Test token from script'
  };

  try {
    console.log('Sending token:', JSON.stringify(token, null, 2));
    
    const response = await fetch('https://design-token-management-app.vercel.app/api/tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        'Accept': 'application/json'
      },
      body: JSON.stringify({ 
        tokens: [token],
        _debug: true // Add debug flag
      })
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
      
      if (data.errors && data.errors.length > 0) {
        console.log('\n--- Errors ---');
        console.log(JSON.stringify(data.errors, null, 2));
      }
      
    } catch (e) {
      console.log('\nResponse (raw):');
      console.log(responseText);
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

// Add unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

testTokenPush();
