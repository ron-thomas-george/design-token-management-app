// Simple test script to call the upsert_design_token RPC function
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testRpcCall() {
  try {
    // Get Supabase credentials from command line arguments
    const args = process.argv.slice(2);
    
    if (args.length < 3) {
      console.error('Usage: node test-rpc-simple.js <supabase-url> <anon-key> <user-id> [token-name]');
      console.error('Example: node test-rpc-simple.js https://your-project.supabase.co your-anon-key 123e4567-e89b-12d3-a456-426614174000 test-token');
      process.exit(1);
    }
    
    const supabaseUrl = args[0].replace(/\/$/, ''); // Remove trailing slash if present
    const supabaseKey = args[1];
    const userId = args[2];
    const tokenName = args[3] || 'test-token-' + Date.now();

    console.log('Testing RPC call with:');
    console.log('- Supabase URL:', supabaseUrl);
    console.log('- User ID:', userId);
    console.log('- Token name:', tokenName);

    // Prepare the RPC call
    const rpcUrl = `${supabaseUrl}/rest/v1/rpc/upsert_design_token`;
    
    const tokenData = {
      p_name: tokenName,
      p_value: '#ff0000',
      p_type: 'color',
      p_description: 'Test token from direct RPC call',
      p_user_id: userId
    };
    
    console.log('\n1. Making RPC call to:', rpcUrl);
    console.log('Request body:', JSON.stringify(tokenData, null, 2));
    
    // Make the RPC call
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(tokenData)
    });
    
    const responseText = await response.text();
    
    console.log('\n2. Response status:', response.status, response.statusText);
    
    // Try to parse the response
    try {
      const data = responseText ? JSON.parse(responseText) : {};
      console.log('Response data:', JSON.stringify(data, null, 2));
      
      if (response.ok) {
        if (data.was_created) {
          console.log('✅ Token was created successfully!');
        } else {
          console.log('✅ Token was updated successfully!');
        }
      } else {
        console.error('❌ RPC call failed with status:', response.status);
        if (data.message) {
          console.error('Error message:', data.message);
        }
      }
    } catch (parseError) {
      console.error('Failed to parse response as JSON:', parseError);
      console.log('Raw response:', responseText);
    }
  } catch (error) {
    console.error('\n❌ Unexpected error:');
    console.error('Message:', error.message);
    console.error('Type:', error.name);
    
    if (error.code) {
      console.error('Error code:', error.code);
    }
    
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    
    if (error.cause) {
      console.error('\nError cause:', error.cause);
    }
    
    process.exit(1);
  }
}

testRpcCall();
