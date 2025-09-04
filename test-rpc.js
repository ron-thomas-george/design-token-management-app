// Test script to verify RPC function
const { createClient } = require('@supabase/supabase-js');

async function testUpsertToken() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or service role key');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Test data
  const testToken = {
    name: 'test-color-' + Date.now(),
    value: '#ff0000',
    type: 'color',
    description: 'Test token from RPC test',
    user_id: '00000000-0000-0000-0000-000000000000' // Replace with actual user ID
  };

  try {
    console.log('Calling RPC with data:', testToken);
    
    const { data, error } = await supabase.rpc('upsert_design_token', {
      p_name: testToken.name,
      p_value: testToken.value,
      p_type: testToken.type,
      p_description: testToken.description,
      p_user_id: testToken.user_id
    });

    if (error) {
      console.error('RPC error:', error);
      return;
    }

    console.log('RPC success:', data);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testUpsertToken();
