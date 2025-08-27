// Vercel API endpoint to provide tokens to Figma plugin
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, x-api-key, Accept, Accept-Language, Content-Language');

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

    // Debug endpoint - check all API keys in database
    if (req.query.debug === 'keys') {
      try {
        const debugResponse = await fetch(`${supabaseUrl}/rest/v1/user_api_keys?select=*`, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Debug response status:', debugResponse.status);
        const responseText = await debugResponse.text();
        console.log('Debug response text:', responseText);
        
        if (debugResponse.ok) {
          const allKeys = JSON.parse(responseText);
          return res.status(200).json({ 
            message: 'Debug info',
            total_keys: allKeys.length,
            table_exists: true,
            keys: allKeys.map(k => ({
              user_id: k.user_id,
              key_preview: k.api_key ? k.api_key.substring(0, 10) + '...' : 'null',
              is_active: k.is_active,
              created_at: k.created_at
            }))
          });
        } else {
          return res.status(200).json({
            message: 'Debug info - table query failed',
            table_exists: false,
            error_status: debugResponse.status,
            error_text: responseText,
            total_keys: 0,
            keys: []
          });
        }
      } catch (error) {
        console.error('Debug query failed:', error);
        return res.status(500).json({ 
          error: 'Debug query failed',
          message: error.message 
        });
      }
    }

    // Check for API key authentication
    const apiKey = req.headers['x-api-key'] || req.headers['X-API-Key'] || req.headers.authorization?.replace('Bearer ', '');
    
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

    // If API key provided, validate it and get user-specific tokens
    if (apiKey) {
      console.log('Validating API key:', apiKey.substring(0, 10) + '...');
      console.log('Query URL:', `${supabaseUrl}/rest/v1/user_api_keys?select=user_id&api_key=eq.${apiKey}&is_active=eq.true`);
      
      // Try to validate API key using direct table lookup instead of RPC
      const apiKeyResponse = await fetch(`${supabaseUrl}/rest/v1/user_api_keys?select=user_id&api_key=eq.${apiKey}&is_active=eq.true`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('API key validation response:', apiKeyResponse.status, apiKeyResponse.statusText);

      if (!apiKeyResponse.ok) {
        const errorText = await apiKeyResponse.text();
        console.error('API key validation failed:', apiKeyResponse.status, apiKeyResponse.statusText, errorText);
        
        // If user_api_keys table doesn't exist, fall back to fetching all tokens
        if (apiKeyResponse.status === 404 || errorText.includes('relation "public.user_api_keys" does not exist')) {
          console.log('user_api_keys table does not exist, falling back to all tokens');
          const fallbackResponse = await fetch(`${supabaseUrl}/rest/v1/design_tokens?select=*&order=created_at.desc`, {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (fallbackResponse.ok) {
            const allTokens = await fallbackResponse.json();
            console.log(`Found ${allTokens.length} tokens (fallback mode)`);
            return res.status(200).json(allTokens);
          }
        }
        
        // If API key not found but table exists, provide helpful error
        if (apiKeyResponse.status === 200) {
          console.log('API key table exists but key not found - need to generate API key first');
          return res.status(401).json({ 
            error: 'API key not found. Please generate an API key in the web app Settings page first.' 
          });
        }
        
        return res.status(401).json({ error: 'Invalid API key' });
      }

      const apiKeyData = await apiKeyResponse.json();
      console.log('API key data:', apiKeyData);
      console.log('API key data length:', apiKeyData ? apiKeyData.length : 'null');
      console.log('API key data type:', typeof apiKeyData);
      
      if (!apiKeyData || apiKeyData.length === 0) {
        console.log('No matching API key found - returning 401');
        return res.status(401).json({ error: 'Invalid API key' });
      }

      const userId = apiKeyData[0].user_id;

      // Update last_used_at timestamp
      await fetch(`${supabaseUrl}/rest/v1/user_api_keys?api_key=eq.${apiKey}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ last_used_at: new Date().toISOString() })
      });

      // First try user-specific tokens, then fall back to tokens with null user_id
      let response = await fetch(`${supabaseUrl}/rest/v1/design_tokens?select=*&user_id=eq.${userId}&order=created_at.desc`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });

      let tokens = [];
      if (response.ok) {
        tokens = await response.json();
        console.log(`Found ${tokens.length} user-specific tokens for user ${userId}`);
      }

      // If no user-specific tokens found, also fetch tokens with null user_id (legacy tokens)
      if (tokens.length === 0) {
        console.log('No user-specific tokens found, fetching tokens with null user_id');
        const nullUserResponse = await fetch(`${supabaseUrl}/rest/v1/design_tokens?select=*&user_id=is.null&order=created_at.desc`, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (nullUserResponse.ok) {
          const nullUserTokens = await nullUserResponse.json();
          console.log(`Found ${nullUserTokens.length} tokens with null user_id`);
          tokens = nullUserTokens;
        }
      }

      return res.status(200).json(tokens);
    }

    // Fallback: Return empty array if no API key provided since RLS blocks unauthenticated access
    return res.status(200).json([]);

  } catch (error) {
    console.error('Error fetching tokens:', error);
    
    // Return empty array instead of mock tokens to prevent false "connected" status
    res.status(500).json({ error: 'Failed to fetch tokens', tokens: [] });
  }
}

// Validate API key and return user ID
async function validateApiKey(supabaseUrl, supabaseKey, apiKey) {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/validate_api_key`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ api_key_input: apiKey })
    });

    if (!response.ok) {
      return null;
    }

    const userId = await response.text();
    return userId && userId !== 'null' ? userId.replace(/"/g, '') : null;
  } catch (error) {
    console.error('Error validating API key:', error);
    return null;
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

    // Check for API key authentication
    const apiKey = req.headers['x-api-key'] || req.headers['X-API-Key'] || req.headers.authorization?.replace('Bearer ', '');
    
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

    // Validate API key if provided
    let userId = null;
    if (apiKey) {
      userId = await validateApiKey(supabaseUrl, supabaseKey, apiKey);
      if (!userId) {
        return res.status(401).json({ error: 'Invalid API key' });
      }
    }

    // Insert tokens into Supabase
    const insertPromises = tokens.map(async (token) => {
      const tokenData = {
        name: token.name,
        value: token.value,
        type: token.type,
        description: token.description || `${token.type} token from Figma`
      };

      // Add user_id if authenticated
      if (userId) {
        tokenData.user_id = userId;
      }

      const response = await fetch(`${supabaseUrl}/rest/v1/design_tokens`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(tokenData)
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
