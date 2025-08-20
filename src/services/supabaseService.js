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
      const { data, error } = await supabase
        .from(TOKENS_TABLE)
        .select('*')
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
        const newToken = {
          ...tokenData,
          id: Date.now().toString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        tokens.push(newToken)
        localStorage.setItem('tokens', JSON.stringify(tokens))
        return { success: true, data: newToken }
      } catch (error) {
        console.error('Error saving to localStorage:', error)
        return { success: false, error: error.message }
      }
    }

    try {
      const { data, error } = await supabase
        .from(TOKENS_TABLE)
        .insert([{
          name: tokenData.name,
          value: tokenData.value,
          type: tokenData.type,
          description: tokenData.description || null
        }])
        .select()
        .single()

      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Error creating token:', error)
      return { success: false, error: error.message }
    }
  }

  // Update an existing token
  async updateToken(tokenId, tokenData) {
    if (!isSupabaseConfigured || !supabase) {
      // Fallback to localStorage
      try {
        const tokens = JSON.parse(localStorage.getItem('tokens') || '[]')
        const tokenIndex = tokens.findIndex(t => t.id === tokenId)
        if (tokenIndex === -1) {
          throw new Error('Token not found')
        }
        const updatedToken = {
          ...tokens[tokenIndex],
          ...tokenData,
          updated_at: new Date().toISOString()
        }
        tokens[tokenIndex] = updatedToken
        localStorage.setItem('tokens', JSON.stringify(tokens))
        return { success: true, data: updatedToken }
      } catch (error) {
        console.error('Error updating localStorage:', error)
        return { success: false, error: error.message }
      }
    }

    try {
      const { data, error } = await supabase
        .from(TOKENS_TABLE)
        .update({
          name: tokenData.name,
          value: tokenData.value,
          type: tokenData.type,
          description: tokenData.description || null
        })
        .eq('id', tokenId)
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
        console.error('Error deleting from localStorage:', error)
        return { success: false, error: error.message }
      }
    }

    try {
      const { error } = await supabase
        .from(TOKENS_TABLE)
        .delete()
        .eq('id', tokenId)

      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Error deleting token:', error)
      return { success: false, error: error.message }
    }
  }

  // Get tokens by type
  async getTokensByType(type) {
    try {
      const { data, error } = await supabase
        .from(TOKENS_TABLE)
        .select('*')
        .eq('type', type)
        .order('created_at', { ascending: false })

      if (error) throw error
      return { success: true, data: data || [] }
    } catch (error) {
      console.error('Error fetching tokens by type:', error)
      return { success: false, error: error.message }
    }
  }

  // Search tokens by name
  async searchTokens(searchTerm) {
    try {
      const { data, error } = await supabase
        .from(TOKENS_TABLE)
        .select('*')
        .ilike('name', `%${searchTerm}%`)
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
