// Vercel API endpoint to serve tokens to Figma plugin
export default async function handler(req, res) {
  // Only allow GET requests
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
