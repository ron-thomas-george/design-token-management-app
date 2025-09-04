const fetch = require('node-fetch');

const SUPABASE_URL = 'https://vtdgfsyxolwafoygrfep.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0ZGdmc3l4b2x3YWZveWdyZmVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2ODE1NTMsImV4cCI6MjA3MTI1NzU1M30.6hSyjTWkS4Izvqx1xOn6mmnAKJ6d49rAJ8hTujtoxsI';

async function checkTableSchema() {
  try {
    console.log('Checking schema for design_tokens table...');
    
    // Query the table directly to see its structure
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/design_tokens?limit=1&select=*`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Error: ${response.status} ${response.statusText} - ${error}`);
    }
    
    const data = await response.json();
    console.log('Table data sample:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Error checking table:', error.message);
  }
}

checkTableSchema();
