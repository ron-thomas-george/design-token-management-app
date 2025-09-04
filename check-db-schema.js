const { createClient } = require('@supabase/supabase-js');

async function checkDatabaseSchema() {
  // Get Supabase credentials from command line arguments
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: node check-db-schema.js <supabase-url> <anon-key>');
    console.error('Example: node check-db-schema.js https://your-project.supabase.co your-anon-key');
    process.exit(1);
  }
  
  const supabaseUrl = args[0];
  const supabaseKey = args[1];
  
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });
  
  console.log('Connected to Supabase');
  
  try {
    // Run SQL query to check tables and functions
    const { data, error } = await supabase.rpc('check_db_schema');
    
    if (error) {
      console.error('Error running schema check:', error);
      return;
    }
    
    console.log('Database schema check results:');
    console.log(JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Error checking database schema:', {
      message: error.message,
      stack: error.stack
    });
    
    // Try a simpler query if the RPC function doesn't exist
    try {
      console.log('\nTrying direct SQL query...');
      const { data: tables, error: tablesError } = await supabase
        .from('pg_tables')
        .select('tablename')
        .eq('schemaname', 'public');
        
      console.log('Tables in public schema:', tables);
      
      // Check if design_tokens table exists
      const hasDesignTokens = tables.some(t => t.tablename === 'design_tokens');
      console.log('design_tokens table exists:', hasDesignTokens);
      
      if (hasDesignTokens) {
        // Try to get a row count
        const { count, error: countError } = await supabase
          .from('design_tokens')
          .select('*', { count: 'exact', head: true });
          
        console.log('Number of tokens in design_tokens:', count);
      }
      
    } catch (simpleError) {
      console.error('Error with simple query:', simpleError);
    }
  }
}

checkDatabaseSchema();
