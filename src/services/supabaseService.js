import { supabase, TOKENS_TABLE, isSupabaseConfigured } from '../lib/supabase.js'

export class SupabaseTokenService {
  // Get all tokens
  async getAllTokens() {
    if (!isSupabaseConfigured || !supabase) {
      // Fallback to localStorage
      try {
        const tokens = JSON.parse(localStorage.getItem('tokens') || '[]')
        return { success: true, data: tokens }
      } catch (error) {
        console.error('Error reading from localStorage:', error)
        return { success: true, data: [] }
      }
    }

    try {
      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        console.error('Authentication error:', authError?.message || 'No user found')
        return { success: false, error: 'Not authenticated' }
      }

      const { data, error } = await supabase
        .from(TOKENS_TABLE)
        .select('*')
        .eq('user_id', user.id)  // Only get tokens for the current user
        .order('created_at', { ascending: false })

      if (error) throw error
      return { success: true, data: data || [] }
    } catch (error) {
      console.error('Error fetching tokens:', error)
      return { success: false, error: error.message }
    }
  }

  // Create a new token
  async createToken(tokenData) {
    if (!isSupabaseConfigured || !supabase) {
      // Fallback to localStorage
      try {
        const tokens = JSON.parse(localStorage.getItem('tokens') || '[]')
        const newToken = { id: Date.now().toString(), ...tokenData }
        localStorage.setItem('tokens', JSON.stringify([...tokens, newToken]))
        return { success: true, data: newToken }
      } catch (error) {
        console.error('Error saving to localStorage:', error)
        return { success: false, error: error.message }
      }
    }

    try {
      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        console.error('Authentication error:', authError?.message || 'No user found')
        return { success: false, error: 'Not authenticated' }
      }

      const { data, error } = await supabase
        .from(TOKENS_TABLE)
        .insert([{ ...tokenData, user_id: user.id }])
        .select()
        .single()

      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Error creating token:', error)
      return { success: false, error: error.message }
    }
  }

  // Add other methods (update, delete) with similar authentication checks

    // Update an existing token
    async updateToken(tokenId, tokenData) {
      if (!isSupabaseConfigured || !supabase) {
        // Fallback to localStorage
        try {
          const tokens = JSON.parse(localStorage.getItem('tokens') || '[]')
          const tokenIndex = tokens.findIndex(t => t.id === tokenId)
          if (tokenIndex === -1) {
            return { success: false, error: 'Token not found' }
          }
          tokens[tokenIndex] = { ...tokens[tokenIndex], ...tokenData, updated_at: new Date().toISOString() }
          localStorage.setItem('tokens', JSON.stringify(tokens))
          return { success: true, data: tokens[tokenIndex] }
        } catch (error) {
          console.error('Error updating token in localStorage:', error)
          return { success: false, error: error.message }
        }
      }
  
      try {
        // Check if user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
          console.error('Authentication error:', authError?.message || 'No user found')
          return { success: false, error: 'Not authenticated' }
        }
  
        const { data, error } = await supabase
          .from(TOKENS_TABLE)
          .update({
            ...tokenData,
            updated_at: new Date().toISOString()
          })
          .eq('id', tokenId)
          .eq('user_id', user.id)  // Ensure user owns the token
          .select()
          .single()
  
        if (error) throw error
        return { success: true, data }
      } catch (error) {
        console.error('Error updating token:', error)
        return { success: false, error: error.message }
      }
    }
  
    // Delete a token
    async deleteToken(tokenId) {
      if (!isSupabaseConfigured || !supabase) {
        // Fallback to localStorage
        try {
          const tokens = JSON.parse(localStorage.getItem('tokens') || '[]')
          const filteredTokens = tokens.filter(t => t.id !== tokenId)
          localStorage.setItem('tokens', JSON.stringify(filteredTokens))
          return { success: true }
        } catch (error) {
          console.error('Error deleting token from localStorage:', error)
          return { success: false, error: error.message }
        }
      }
  
      try {
        // Check if user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
          console.error('Authentication error:', authError?.message || 'No user found')
          return { success: false, error: 'Not authenticated' }
        }
  
        const { error } = await supabase
          .from(TOKENS_TABLE)
          .delete()
          .eq('id', tokenId)
          .eq('user_id', user.id)  // Ensure user owns the token
  
        if (error) throw error
        return { success: true }
      } catch (error) {
        console.error('Error deleting token:', error)
        return { success: false, error: error.message }
      }
    }

  // Get tokens by type
async getTokensByType(type) {
  if (!isSupabaseConfigured || !supabase) {
    // Fallback to localStorage
    try {
      const tokens = JSON.parse(localStorage.getItem('tokens') || '[]')
      const filteredTokens = tokens.filter(t => t.type === type)
      return { success: true, data: filteredTokens }
    } catch (error) {
      console.error('Error reading from localStorage:', error)
      return { success: true, data: [] }
    }
  }

  try {
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('Authentication error:', authError?.message || 'No user found')
      return { success: false, error: 'Not authenticated' }
    }

    const { data, error } = await supabase
      .from(TOKENS_TABLE)
      .select('*')
      .eq('type', type)
      .eq('user_id', user.id)  // Only get tokens for the current user
      .order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error(`Error fetching tokens of type ${type}:`, error)
    return { success: false, error: error.message }
  }
}

  // Search tokens by name
async searchTokens(searchTerm) {
  if (!isSupabaseConfigured || !supabase) {
    // Fallback to localStorage
    try {
      const tokens = JSON.parse(localStorage.getItem('tokens') || '[]')
      const searchLower = searchTerm.toLowerCase()
      const filteredTokens = tokens.filter(t => 
        t.name.toLowerCase().includes(searchLower) ||
        (t.description && t.description.toLowerCase().includes(searchLower))
      )
      return { success: true, data: filteredTokens }
    } catch (error) {
      console.error('Error searching tokens in localStorage:', error)
      return { success: true, data: [] }
    }
  }

  try {
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('Authentication error:', authError?.message || 'No user found')
      return { success: false, error: 'Not authenticated' }
    }

    const { data, error } = await supabase
      .from(TOKENS_TABLE)
      .select('*')
      .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      .eq('user_id', user.id)  // Only search tokens for the current user
      .order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error searching tokens:', error)
    return { success: false, error: error.message }
  }
}

  // Get token statistics
  async getTokenStats() {
    try {
      const { data, error } = await supabase
        .from(TOKENS_TABLE)
        .select('type')

      if (error) throw error

      const stats = data.reduce((acc, token) => {
        acc[token.type] = (acc[token.type] || 0) + 1
        return acc
      }, {})

      return {
        success: true,
        data: {
          total: data.length,
          byType: stats
        }
      }
    } catch (error) {
      console.error('Error fetching token stats:', error)
      return { success: false, error: error.message }
    }
  }

  // Batch operations for syncing
  async batchUpdateTokens(tokens) {
    try {
      const operations = tokens.map(token => {
        if (token.id && token.id.includes('-')) {
          // Existing token (has UUID format)
          return this.updateToken(token.id, token)
        } else {
          // New token
          return this.createToken(token)
        }
      })

      const results = await Promise.all(operations)
      const successful = results.filter(r => r.success)
      const failed = results.filter(r => !r.success)

      return {
        success: failed.length === 0,
        data: {
          successful: successful.length,
          failed: failed.length,
          errors: failed.map(f => f.error)
        }
      }
    } catch (error) {
      console.error('Error in batch update:', error)
      return { success: false, error: error.message }
    }
  }
}

// Export singleton instance
export const supabaseTokenService = new SupabaseTokenService()
