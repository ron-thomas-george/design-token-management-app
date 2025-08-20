// Vercel API endpoint to provide Supabase configuration to Figma plugin
export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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
      return res.status(200).json({
        configured: false,
        message: 'Supabase not configured'
      });
    }

    // Return configuration (safe to expose anon key)
    res.status(200).json({
      configured: true,
      supabaseUrl,
      supabaseKey,
      message: 'Supabase configuration available'
    });

  } catch (error) {
    console.error('Error getting Supabase config:', error);
    res.status(500).json({
      configured: false,
      error: 'Failed to get Supabase configuration'
    });
  }
}
