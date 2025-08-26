// Vercel API endpoint to provide tokens to Figma plugin
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle POST requests for pushing tokens
  if (req.method === 'POST') {
    return handlePostTokens(req, res);
  }

  // Only allow GET requests for fetching
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get Supabase configuration from environment variables
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

    // Check if Supabase is configured
    if (!supabaseUrl || !supabaseKey || 
        supabaseUrl === 'your_supabase_project_url_here' ||
        supabaseKey === 'your_supabase_anon_key_here') {
      
      // Return mock tokens if Supabase not configured
      const mockTokens = [
        {
          id: '1',
          name: 'primary-color',
          type: 'color',
          value: '#3B82F6',
          category: 'colors',
          description: 'Primary brand color',
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          name: 'heading-font',
          type: 'typography',
          value: 'Inter, sans-serif',
          category: 'fonts',
          description: 'Main heading font',
          created_at: new Date().toISOString()
        },
        {
          id: '3',
          name: 'base-spacing',
          type: 'spacing',
          value: '16px',
          category: 'spacing',
          description: 'Base spacing unit',
          created_at: new Date().toISOString()
        }
      ];
      
      return res.status(200).json(mockTokens);
    }

    // Fetch from Supabase if configured
    const response = await fetch(`${supabaseUrl}/rest/v1/design_tokens?select=*&order=created_at.desc`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Supabase error: ${response.status} ${response.statusText}`);
    }

    const tokens = await response.json();
    res.status(200).json(tokens);

  } catch (error) {
    console.error('Error fetching tokens:', error);
    
    // Return mock tokens as fallback
    const mockTokens = [
      {
        id: '1',
        name: 'primary-color',
        type: 'color',
        value: '#3B82F6',
        category: 'colors',
        description: 'Primary brand color',
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        name: 'secondary-color',
        type: 'color',
        value: '#10B981',
        category: 'colors',
        description: 'Secondary brand color',
        created_at: new Date().toISOString()
      }
    ];
    
    res.status(200).json(mockTokens);
  }
}

// Handle POST requests for pushing tokens from Figma
async function handlePostTokens(req, res) {
  try {
    const { tokens } = req.body;
    
    if (!tokens || !Array.isArray(tokens)) {
      return res.status(400).json({ error: 'Invalid tokens data' });
    }

    // Get Supabase configuration from environment variables
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

    // Check if Supabase is configured
    if (!supabaseUrl || !supabaseKey || 
        supabaseUrl === 'your_supabase_project_url_here' ||
        supabaseKey === 'your_supabase_anon_key_here') {
      
      // Return success response even without Supabase (for development)
      return res.status(200).json({ 
        message: `Successfully received ${tokens.length} tokens (Supabase not configured)`,
        tokens: tokens
      });
    }

    // Insert tokens into Supabase
    const insertPromises = tokens.map(async (token) => {
      const response = await fetch(`${supabaseUrl}/rest/v1/design_tokens`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          name: token.name,
          value: token.value,
          type: token.type,
          description: token.description || `${token.type} token from Figma`
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to insert token ${token.name}: ${response.status} ${response.statusText}`);
      }

      return response;
    });

    await Promise.all(insertPromises);

    res.status(200).json({ 
      message: `Successfully pushed ${tokens.length} tokens to database`,
      count: tokens.length
    });

  } catch (error) {
    console.error('Error pushing tokens:', error);
    res.status(500).json({ 
      error: 'Failed to push tokens',
      message: error.message
    });
  }
}
