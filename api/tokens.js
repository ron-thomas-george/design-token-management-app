// Vercel API endpoint to provide tokens to Figma plugin
export default async function handler(req, res) {
  // Force deployment update - timestamp: 2025-08-27T18:44:58
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
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    
    console.log('Supabase URL configured:', !!supabaseUrl, supabaseUrl ? supabaseUrl.substring(0, 20) + '...' : 'undefined');
    console.log('Supabase Key configured:', !!supabaseKey, supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'undefined');

    // Debug endpoint - check all API keys in database
    if (req.query.debug === 'keys') {
      // First check if environment variables are properly loaded
      if (!supabaseUrl || !supabaseKey || 
          supabaseUrl === 'your_supabase_project_url_here' ||
          supabaseKey === 'your_supabase_anon_key_here') {
        return res.status(200).json({
          message: 'Debug info - Environment variables not configured',
          supabase_url_configured: !!supabaseUrl,
          supabase_key_configured: !!supabaseKey,
          url_value: supabaseUrl || 'undefined',
          key_value: supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'undefined',
          total_keys: 0,
          keys: []
        });
      }
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

      // Use RPC function to get user tokens with proper authentication context
      let response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_user_tokens_v2`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ target_user_id: userId })
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
    console.log('Validating API key...');
    
    // Check if Supabase URL and key are valid
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase URL or key is missing');
      return null;
    }

    console.log(`Calling validate_api_key for key: ${apiKey.substring(0, 8)}...`);
    
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/validate_api_key`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ api_key_input: apiKey })
    });

    const responseText = await response.text();
    console.log(`API Key validation response: ${response.status} ${response.statusText}`, responseText);

    if (!response.ok) {
      console.error(`API Key validation failed: ${response.status} ${response.statusText}`, responseText);
      return null;
    }

    try {
      // Try to parse as JSON first
      const data = JSON.parse(responseText);
      const userId = data?.user_id || data;
      
      if (!userId) {
        console.error('No user ID returned from validate_api_key');
        return null;
      }
      
      console.log(`API Key validated for user: ${userId}`);
      return String(userId).replace(/"/g, '');
    } catch (parseError) {
      // If JSON parse fails, try to get user ID from text response
      console.log('Parsing as text response');
      const userId = responseText.replace(/"/g, '').trim();
      
      if (!userId || userId === 'null' || userId === 'undefined') {
        console.error('Invalid user ID in response:', responseText);
        return null;
      }
      
      console.log(`API Key validated (text response) for user: ${userId}`);
      return userId;
    }
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

    console.log(`Processing ${tokens.length} tokens for user:`, userId || 'unauthenticated');
    
    // Insert tokens into Supabase
    const insertPromises = tokens.map(async (token) => {
      try {
        console.log('Processing token:', token.name);
        
        const tokenData = {
          name: token.name,
          value: token.value,
          type: token.type,
          description: token.description || `${token.type} token from Figma`,
          source: 'figma',
          updated_at: new Date().toISOString()
        };

        // Add user_id if authenticated
        if (userId) {
          tokenData.user_id = userId;
        }

        console.log('Token data prepared:', JSON.stringify(tokenData, null, 2));
        
        // First, try to update if exists
        const updateResponse = await fetch(
          `${supabaseUrl}/rest/v1/design_tokens?name=eq.${encodeURIComponent(token.name)}${userId ? `&user_id=eq.${userId}` : ''}`, 
          {
            method: 'PATCH',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify(tokenData)
          }
        );

        let response;
        let responseData;
        
        if (updateResponse.status === 200 || updateResponse.status === 201) {
          // Update successful
          response = updateResponse;
          responseData = await updateResponse.json();
          console.log(`Token ${token.name} updated successfully`);
        } else {
          // If update failed, try insert
          console.log(`Update failed (${updateResponse.status}), trying insert for token:`, token.name);
          
          const insertResponse = await fetch(`${supabaseUrl}/rest/v1/design_tokens`, {
            method: 'POST',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify(tokenData)
          });
          
          response = insertResponse;
          if (!insertResponse.ok) {
            const errorText = await insertResponse.text();
            throw new Error(`Failed to insert token ${token.name}: ${insertResponse.status} ${insertResponse.statusText} - ${errorText}`);
          }
          responseData = await insertResponse.json();
          console.log(`Token ${token.name} inserted successfully`);
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to process token ${token.name}: ${response.status} ${response.statusText} - ${errorText}`);
        }

        return Array.isArray(responseData) ? responseData[0] : responseData;
      } catch (error) {
        console.error(`Error processing token ${token?.name || 'unknown'}:`, error);
        throw error; // Re-throw to be caught by Promise.all
      }
    });

    const results = await Promise.allSettled(insertPromises);
    
    // Process results
    const insertedTokens = [];
    const errors = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        insertedTokens.push(result.value);
      } else {
        console.error(`Error processing token at index ${index}:`, result.reason);
        errors.push({
          index,
          name: tokens[index]?.name || 'unknown',
          error: result.reason.message || 'Unknown error'
        });
      }
    });

    if (errors.length > 0) {
      console.error(`Failed to process ${errors.length} tokens:`, errors);
      return res.status(207).json({ 
        message: `Processed with ${errors.length} errors`,
        successCount: insertedTokens.length,
        errorCount: errors.length,
        errors: errors,
        tokens: insertedTokens
      });
    }

    res.status(200).json({ 
      message: `Successfully processed ${insertedTokens.length} tokens`,
      count: insertedTokens.length,
      tokens: insertedTokens
    });

  } catch (error) {
    console.error('Error pushing tokens:', error);
    res.status(500).json({ 
      error: 'Failed to push tokens',
      message: error.message
    });
  }
}
