const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vtdgfsyxolwafoygrfep.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0ZGdmc3l4b2x3YWZveWdyZmVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2ODE1NTMsImV4cCI6MjA3MTI1NzU1M30.6hSyjTWkS4Izvqx1xOn6mmnAKJ6d49rAJ8hTujtoxsI';

async function verifyTokenUpdate() {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    
    // Test token data
    const testToken = {
      name: 'blue',
      value: '#002ccb',
      type: 'color',
      description: 'color token from Figma',
      user_id: '8dd01790-d753-4609-9112-8bc0b40b6a58'
    };

    console.log('Checking if token exists in database...');
    
    // Check if token exists
    const { data: existingToken, error: fetchError } = await supabase
      .from('design_tokens')
      .select('*')
      .eq('name', testToken.name)
      .eq('user_id', testToken.user_id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = No rows returned
      console.error('Error checking for token:', fetchError);
      return;
    }

    if (existingToken) {
      console.log('Token exists in database:', existingToken);
    } else {
      console.log('Token does not exist in database');
    }

    // Try to insert the token directly
    console.log('\nAttempting to insert token directly...');
    const { data: insertedToken, error: insertError } = await supabase
      .from('design_tokens')
      .insert([{
        name: testToken.name,
        value: testToken.value,
        type: testToken.type,
        description: testToken.description,
        user_id: testToken.user_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting token:', insertError);
    } else {
      console.log('Token inserted successfully:', insertedToken);
    }

    // Check RLS policies
    console.log('\nChecking RLS policies...');
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_policies_for_table', { table_name: 'design_tokens' });
    
    if (policiesError) {
      console.error('Error fetching RLS policies:', policiesError);
      console.log('\nTrying alternative way to check RLS...');
      
      const { data: rawPolicies, error: rawError } = await supabase
        .from('pg_policies')
        .select('*')
        .eq('schemaname', 'public')
        .eq('tablename', 'design_tokens');
      
      if (rawError) {
        console.error('Error fetching raw policies:', rawError);
      } else {
        console.log('RLS policies for design_tokens:', rawPolicies);
      }
    } else {
      console.log('RLS policies for design_tokens:', policies);
    }

  } catch (error) {
    console.error('Error in verifyTokenUpdate:', error);
  }
}

verifyTokenUpdate();
