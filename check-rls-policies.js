const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vtdgfsyxolwafoygrfep.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0ZGdmc3l4b2x3YWZveWdyZmVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2ODE1NTMsImV4cCI6MjA3MTI1NzU1M30.6hSyjTWkS4Izvqx1xOn6mmnAKJ6d49rAJ8hTujtoxsI';

async function checkRLSPolicies() {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    
    // Check if RLS is enabled on the table
    const { data: rlsEnabled, error: rlsError } = await supabase
      .rpc('table_has_rls', { table_name: 'design_tokens' });
    
    if (rlsError) {
      console.error('Error checking RLS status:', rlsError);
    } else {
      console.log('RLS enabled on design_tokens table:', rlsEnabled);
    }
    
    // Get all policies on the design_tokens table
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policy')
      .select('*')
      .eq('schemaname', 'public')
      .eq('tablename', 'design_tokens');
    
    if (policiesError) {
      console.error('Error fetching policies:', policiesError);
      
      // Try alternative method using raw SQL
      console.log('\nTrying alternative method to get policies...');
      const { data: rawPolicies, error: rawError } = await supabase.rpc('query', {
        query: `
          SELECT n.nspname as schema, c.relname as table, c.relrowsecurity as row_security, 
                 c.relforcerowsecurity as force_row_security, 
                 array_agg(pol.polname) as policies
          FROM pg_class c
          LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
          LEFT JOIN pg_policy pol ON pol.polrelid = c.oid
          WHERE c.relname = 'design_tokens' AND n.nspname = 'public'
          GROUP BY n.nspname, c.relname, c.relrowsecurity, c.relforcerowsecurity;
        `
      });
      
      if (rawError) {
        console.error('Error with raw query:', rawError);
      } else {
        console.log('Raw policies:', JSON.stringify(rawPolicies, null, 2));
      }
    } else {
      console.log('Policies on design_tokens table:', JSON.stringify(policies, null, 2));
    }
    
  } catch (error) {
    console.error('Error in checkRLSPolicies:', error);
  }
}

checkRLSPolicies();
