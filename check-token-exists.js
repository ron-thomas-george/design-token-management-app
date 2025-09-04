const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vtdgfsyxolwafoygrfep.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0ZGdmc3l4b2x3YWZveWdyZmVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2ODE1NTMsImV4cCI6MjA3MTI1NzU1M30.6hSyjTWkS4Izvqx1xOn6mmnAKJ6d49rAJ8hTujtoxsI';

async function checkTokenExists() {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    
    const tokenName = 'yellow';
    const userId = '8dd01790-d753-4609-9112-8bc0b40b6a58';
    
    console.log(`Checking if token "${tokenName}" exists for user ${userId}...`);
    
    // First, try with the service role key
    console.log('\n1. Checking with service role key...');
    const { data: tokenData, error: tokenError } = await supabase
      .from('design_tokens')
      .select('*')
      .eq('name', tokenName)
      .eq('user_id', userId)
      .single();
    
    if (tokenError) {
      console.error('Error fetching token:', tokenError);
    } else {
      console.log('Token found:', tokenData);
      return;
    }
    
    // Try with a direct SQL query
    console.log('\n2. Trying direct SQL query...');
    const { data: sqlResult, error: sqlError } = await supabase.rpc('query', {
      query: `
        SELECT * FROM design_tokens 
        WHERE name = '${tokenName}' 
        AND user_id = '${userId}';
      `
    });
    
    if (sqlError) {
      console.error('Error with direct SQL query:', sqlError);
    } else {
      console.log('SQL query result:', sqlResult);
    }
    
    // Check all tokens for this user
    console.log('\n3. Listing all tokens for this user...');
    const { data: allTokens, error: allTokensError } = await supabase
      .from('design_tokens')
      .select('*')
      .eq('user_id', userId);
    
    if (allTokensError) {
      console.error('Error fetching all tokens:', allTokensError);
    } else {
      console.log(`Found ${allTokens.length} tokens for user:`);
      allTokens.forEach((token, index) => {
        console.log(`  ${index + 1}. ${token.name} (${token.type}): ${token.value}`);
      });
    }
    
  } catch (error) {
    console.error('Error in checkTokenExists:', error);
  }
}

checkTokenExists();
