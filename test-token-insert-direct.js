const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vtdgfsyxolwafoygrfep.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0ZGdmc3l4b2x3YWZveWdyZmVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2ODE1NTMsImV4cCI6MjA3MTI1NzU1M30.6hSyjTWkS4Izvqx1xOn6mmnAKJ6d49rAJ8hTujtoxsI';

async function testTokenInsert() {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    
    // Test token data
    const testToken = {
      name: 'test-yellow-' + Date.now(),
      value: '#fbf700',
      type: 'color',
      description: 'Test token from direct insert',
      user_id: '8dd01790-d753-4609-9112-8bc0b40b6a58',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('1. Attempting to insert test token...');
    console.log('Token data:', JSON.stringify(testToken, null, 2));
    
    // Try to insert with RLS bypass (using service role key)
    const { data: insertedToken, error: insertError } = await supabase
      .from('design_tokens')
      .insert([testToken])
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting token:', insertError);
      
      // Try with raw SQL to get more detailed error
      console.log('\n2. Trying with raw SQL...');
      const { data: rawResult, error: rawError } = await supabase.rpc('execute_sql', {
        query: `
          INSERT INTO design_tokens (name, value, type, description, user_id, created_at, updated_at)
          VALUES (
            'test-yellow-raw-${Date.now()}', 
            '#fbf700', 
            'color', 
            'Test token from raw SQL', 
            '8dd01790-d753-4609-9112-8bc0b40b6a58', 
            NOW(), 
            NOW()
          )
          RETURNING *;
        `
      });
      
      if (rawError) {
        console.error('Error with raw SQL:', rawError);
      } else {
        console.log('Raw SQL insert result:', rawResult);
      }
      
      return;
    }
    
    console.log('Token inserted successfully:', insertedToken);
    
  } catch (error) {
    console.error('Error in testTokenInsert:', error);
  }
}

testTokenInsert();
