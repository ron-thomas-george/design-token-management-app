import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase URL or key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkTableSchema() {
  try {
    console.log('Checking schema for design_tokens table...');
    
    // Get table schema using raw SQL
    const { data, error } = await supabase.rpc('get_table_schema', {
      table_name: 'design_tokens'
    });
    
    if (error) {
      console.error('Error getting table schema:', error);
      
      // Fallback to information_schema query
      console.log('Trying alternative method using information_schema...');
      const { data: columns, error: colsError } = await supabase
        .from('information_schema.columns')
        .select('*')
        .eq('table_name', 'design_tokens');
        
      if (colsError) {
        console.error('Error querying information_schema:', colsError);
        return;
      }
      
      console.log('Columns in design_tokens table:');
      columns.forEach(col => {
        console.log(`- ${col.column_name} (${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''})`);
      });
      return;
    }
    
    console.log('Table schema:', JSON.stringify(data, null, 2));
    
  } catch (err) {
    console.error('Error:', err);
  }
}

checkTableSchema();
