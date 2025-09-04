const fetch = require('node-fetch');

const SUPABASE_URL = 'https://vtdgfsyxolwafoygrfep.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0ZGdmc3l4b2x3YWZveWdyZmVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2ODE1NTMsImV4cCI6MjA3MTI1NzU1M30.6hSyjTWkS4Izvqx1xOn6mmnAKJ6d49rAJ8hTujtoxsI';

async function testUpsert() {
  try {
    const tokenData = {
      p_name: 'test-blue',
      p_value: '#002ccb',
      p_type: 'color',
      p_description: 'Test token from direct RPC call',
      p_user_id: '8dd01790-d753-4609-9112-8bc0b40b6a58'
    };

    console.log('Testing upsert_design_token with:', tokenData);
    
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/upsert_design_token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(tokenData)
      }
    );
    
    const responseText = await response.text();
    console.log('Response status:', response.status);
    console.log('Response body:', responseText);
    
    // Verify the token was actually saved
    if (response.ok) {
      const result = JSON.parse(responseText);
      console.log('\nVerifying token in database...');
      
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
      console.log('Database verification result:', JSON.stringify(verifyData, null, 2));
    }
    
  } catch (error) {
    console.error('Error testing upsert function:', error);
  }
}

testUpsert();
