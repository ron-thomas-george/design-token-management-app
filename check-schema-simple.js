const fetch = require('node-fetch');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://vtdgfsyxolwafoygrfep.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0ZGdmc3l4b2x3YWZveWdyZmVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2ODE1NTMsImV4cCI6MjA3MTI1NzU1M30.6hSyjTWkS4Izvqx1xOn6mmnAKJ6d49rAJ8hTujtoxsI';

async function checkTableSchema() {
  try {
    console.log('Checking schema for design_tokens table...');
    
    // Get table columns from information_schema
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/information_schema.columns?table_name=eq.design_tokens&select=column_name,data_type,character_maximum_length,is_nullable`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }
    
    const columns = await response.json();
    
    if (!columns || columns.length === 0) {
      console.log('No columns found for design_tokens table');
      return;
    }
    
    console.log('Columns in design_tokens table:');
    columns.forEach(col => {
      console.log(`- ${col.column_name} (${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
  } catch (error) {
    console.error('Error checking schema:', error.message);
  }
}

checkTableSchema();
