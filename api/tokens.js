import { createClient } from '@supabase/supabase-js';

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
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase URL or key');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Check for API key authentication
    const apiKey = req.headers['x-api-key'] || req.headers['X-API-Key'] || req.headers.authorization?.replace('Bearer ', '');
    
    if (!apiKey) {
      return res.status(401).json({ error: 'API key is required' });
    }

    // Validate API key and get user ID
    const userId = await validateApiKey(supabaseUrl, supabaseKey, apiKey);
    if (!userId) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Fetch tokens for the authenticated user
    const { data: tokens, error } = await createClient(supabaseUrl, supabaseKey)
      .from('design_tokens')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching tokens:', error);
      return res.status(500).json({ error: 'Failed to fetch tokens' });
    }

    return res.status(200).json({ tokens });

  } catch (error) {
    console.error('Error in GET /api/tokens:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Validate API key and return user ID
async function validateApiKey(supabaseUrl, supabaseKey, apiKey) {
  try {
    const { data, error } = await createClient(supabaseUrl, supabaseKey)
      .from('user_api_keys')
      .select('user_id')
      .eq('api_key', apiKey)
      .single();

    if (error || !data) {
      console.error('Invalid API key:', error);
      return null;
    }

    return data.user_id;
  } catch (error) {
    console.error('Error validating API key:', error);
    return null;
  }
}

// Handle POST requests for pushing tokens from Figma
async function handlePostTokens(req, res) {
  try {
    // Log the raw request body for debugging
    console.log('Raw request body:', JSON.stringify(req.body, null, 2));
    
    const { tokens } = req.body;
    
    if (!tokens || !Array.isArray(tokens)) {
      return res.status(400).json({ error: 'Invalid tokens data' });
    }

    // Get Supabase configuration from environment variables
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    // Use service role key for admin operations
    const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseKey) {
      console.error('Missing Supabase service role key');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Check for API key authentication
    const apiKey = req.headers['x-api-key'] || req.headers['X-API-Key'] || req.headers.authorization?.replace('Bearer ', '');
    
    // Validate API key and get user ID
    let userId = null;
    if (apiKey) {
      userId = await validateApiKey(supabaseUrl, supabaseKey, apiKey);
      if (!userId) {
        return res.status(401).json({ error: 'Invalid API key' });
      }
    } else {
      return res.status(401).json({ error: 'API key is required' });
    }

    // Process tokens with upsert logic
    const processPromises = tokens.map(async (token) => {
      try {
        console.log(`Processing token: ${token.name} for user: ${userId}`);
        
        // Prepare RPC parameters
        const rpcParams = {
          p_name: token.name,
          p_value: token.value,
          p_type: token.type,
          p_description: token.description || `${token.type} token from Figma`,
          p_user_id: userId
        };
        
        console.log('RPC params:', JSON.stringify(rpcParams, null, 2));
        
        const rpcUrl = `${supabaseUrl}/rest/v1/rpc/upsert_design_token`;
        console.log('RPC Endpoint:', rpcUrl);
        
        // Make direct fetch call to RPC endpoint for better error visibility
        const response = await fetch(rpcUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(rpcParams)
        });
        
        const responseText = await response.text();
        console.log('RPC Response Status:', response.status);
        
        if (!response.ok) {
          // Try to parse the error response as JSON
          let errorDetails = responseText;
          try {
            const errorJson = JSON.parse(responseText);
            errorDetails = JSON.stringify(errorJson, null, 2);
          } catch (e) {
            // If not JSON, keep the raw text
          }
          
          throw new Error(`RPC call failed with status ${response.status}: ${errorDetails}`);
        }
        
        const data = responseText ? JSON.parse(responseText) : {};
        console.log('RPC Response Data:', JSON.stringify(data, null, 2));
        
        // Return the result from the direct RPC call
        if (!data.id) {
          console.error('No token ID in RPC response:', data);
          throw new Error('Failed to get token ID from RPC response');
        }
        
        return {
          name: data.name || token.name,
          action: data.was_created ? 'created' : 'updated',
          id: data.id,
          was_created: data.was_created || false,
          timestamp: data.timestamp || new Date().toISOString()
        };
        
      } catch (error) {
        console.error('Error processing token:', {
          tokenName: token.name,
          error: error.message,
          stack: error.stack
        });
        
        // Re-throw with more context
        error.tokenName = token.name;
        throw error;
      }
    });

    // Wait for all token operations to complete
    const results = await Promise.allSettled(processPromises);
    
    // Process results
    const success = [];
    const errors = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        success.push(result.value);
      } else {
        const tokenName = tokens[index]?.name || `Token at index ${index}`;
        errors.push({
          name: tokenName,
          error: result.reason?.message || 'Unknown error'
        });
      }
    });
    
    // Return appropriate response
    if (errors.length > 0) {
      if (success.length === 0) {
        // All operations failed
        return res.status(500).json({
          error: 'Failed to process tokens',
          details: errors
        });
      } else {
        // Some operations succeeded, some failed
        return res.status(207).json({
          message: `${success.length} tokens processed successfully, ${errors.length} failed`,
          success,
          errors
        });
      }
    }
    
    // All operations succeeded
    return res.status(200).json({
      message: `Successfully processed ${success.length} tokens`,
      tokens: success
    });
    
  } catch (error) {
    console.error('Error in handlePostTokens:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}
