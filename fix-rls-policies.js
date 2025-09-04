const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vtdgfsyxolwafoygrfep.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0ZGdmc3l4b2x3YWZveWdyZmVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2ODE1NTMsImV4cCI6MjA3MTI1NzU1M30.6hSyjTWkS4Izvqx1xOn6mmnAKJ6d49rAJ8hTujtoxsI';

async function fixRLSPolicies() {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    
    console.log('1. Checking current RLS policies on design_tokens table...');
    
    // First, let's check if we can query the table structure
    const { data: tableInfo, error: tableError } = await supabase
      .from('design_tokens')
      .select('*')
      .limit(1);
      
    if (tableError) {
      console.error('Error querying design_tokens table:', tableError);
    } else {
      console.log('Successfully queried design_tokens table. Columns:', Object.keys(tableInfo[0] || {}));
    }
    
    // Try to get RLS policies using the information_schema
    console.log('\n2. Attempting to get RLS policies...');
    
    // First, let's see if we can get the table owner
    const { data: tableOwner, error: ownerError } = await supabase.rpc('get_table_owner', {
      table_name: 'design_tokens'
    });
    
    if (ownerError) {
      console.error('Error getting table owner:', ownerError);
    } else {
      console.log('Table owner:', tableOwner);
    }
    
    // Now let's try to fix the RLS policies
    console.log('\n3. Attempting to fix RLS policies...');
    
    // First, let's try to disable RLS
    console.log('Disabling RLS on design_tokens table...');
    const { error: disableRlsError } = await supabase.rpc('disable_rls_on_table', {
      table_name: 'design_tokens'
    });
    
    if (disableRlsError) {
      console.error('Error disabling RLS:', disableRlsError);
    } else {
      console.log('Successfully disabled RLS on design_tokens table');
    }
    
    // Now try to insert a test token
    console.log('\n4. Testing token insertion with RLS disabled...');
    const testToken = {
      name: 'test-token-' + Date.now(),
      value: '#ff0000',
      type: 'color',
      description: 'Test token with RLS disabled',
      user_id: '8dd01790-d753-4609-9112-8bc0b40b6a58',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: insertedToken, error: insertError } = await supabase
      .from('design_tokens')
      .insert([testToken])
      .select()
      .single();
      
    if (insertError) {
      console.error('Error inserting token with RLS disabled:', insertError);
    } else {
      console.log('Successfully inserted test token with RLS disabled:', insertedToken);
      
      // Now let's re-enable RLS with proper policies
      console.log('\n5. Re-enabling RLS with proper policies...');
      
      // First, drop any existing policies
      const { error: dropPoliciesError } = await supabase.rpc('drop_all_policies_on_table', {
        table_name: 'design_tokens'
      });
      
      if (dropPoliciesError) {
        console.error('Error dropping existing policies:', dropPoliciesError);
      } else {
        console.log('Dropped existing policies on design_tokens table');
      }
      
      // Now create proper RLS policies
      const { error: enableRlsError } = await supabase.rpc('enable_rls_on_table', {
        table_name: 'design_tokens'
      });
      
      if (enableRlsError) {
        console.error('Error enabling RLS:', enableRlsError);
      } else {
        console.log('Successfully re-enabled RLS on design_tokens table');
        
        // Create proper RLS policies
        const policies = [
          {
            name: 'Enable read access for owner',
            command: 'SELECT',
            using: 'auth.uid() = user_id'
          },
          {
            name: 'Enable insert for authenticated users',
            command: 'INSERT',
            with_check: 'auth.role() = \'authenticated\''
          },
          {
            name: 'Enable update for owner',
            command: 'UPDATE',
            using: 'auth.uid() = user_id',
            with_check: 'auth.uid() = user_id'
          },
          {
            name: 'Enable delete for owner',
            command: 'DELETE',
            using: 'auth.uid() = user_id'
          }
        ];
        
        for (const policy of policies) {
          const { error: policyError } = await supabase.rpc('create_policy', {
            table_name: 'design_tokens',
            policy_name: policy.name,
            command: policy.command,
            using_expr: policy.using || null,
            with_check_expr: policy.with_check || null
          });
          
          if (policyError) {
            console.error(`Error creating policy ${policy.name}:`, policyError);
          } else {
            console.log(`Successfully created policy: ${policy.name}`);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('Error in fixRLSPolicies:', error);
  }
}

fixRLSPolicies();
