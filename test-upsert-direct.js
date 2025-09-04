const fetch = require('node-fetch');

const SUPABASE_URL = 'https://vtdgfsyxolwafoygrfep.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0ZGdmc3l4b2x3YWZveWdyZmVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2ODE1NTMsImV4cCI6MjA3MTI1NzU1M30.6hSyjTWkS4Izvqx1xOn6mmnAKJ6d49rAJ8hTujtoxsI';

async function testUpsert() {
  try {
    const tokenData = {
      p_name: 'test-blue-' + Date.now(),
      p_value: '#002ccb',
      p_type: 'color',
      p_description: 'Test token from direct RPC call',
      p_user_id: '8dd01790-d753-4609-9112-8bc0b40b6a58'
    };

    console.log('Testing upsert_design_token with:', tokenData);
    
    // First, check if the token already exists
    console.log('\n1. Checking if token exists...');
    const checkResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/design_tokens?name=eq.${encodeURIComponent(tokenData.p_name)}&user_id=eq.${tokenData.p_user_id}`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
    );
    
    const checkData = await checkResponse.json();
    console.log('Check token response:', {
      status: checkResponse.status,
      data: checkData
    });
    
    // Now try to upsert the token
    console.log('\n2. Calling upsert_design_token RPC...');
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/upsert_design_token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'params=single-object'
        },
        body: JSON.stringify(tokenData)
      }
    );
    
    const responseText = await response.text();
    console.log('RPC Response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseText
    });
    
    // Try to parse the response as JSON
    try {
      const jsonResponse = JSON.parse(responseText);
      console.log('Parsed JSON response:', jsonResponse);
    } catch (e) {
      console.log('Could not parse response as JSON');
    }
    
    // Verify the token was actually inserted/updated
    if (response.ok) {
      console.log('\n3. Verifying token in database...');
      const verifyResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/design_tokens?name=eq.${encodeURIComponent(tokenData.p_name)}&user_id=eq.${tokenData.p_user_id}`,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        }
      );
      
      const verifyData = await verifyResponse.json();
      console.log('Verification result:', {
        status: verifyResponse.status,
        data: verifyData
      });
    }
    
  } catch (error) {
    console.error('Error in testUpsert:', error);
  }
}

testUpsert();
