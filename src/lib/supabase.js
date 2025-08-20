import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Check if environment variables are properly set
let supabase = null
let isSupabaseConfigured = false

if (!supabaseUrl || !supabaseAnonKey || 
    supabaseUrl === 'your_supabase_project_url_here' || 
    supabaseAnonKey === 'your_supabase_anon_key_here' ||
    supabaseUrl === 'undefined' || supabaseAnonKey === 'undefined' ||
    supabaseUrl.length < 10 || supabaseAnonKey.length < 10) {
  console.warn('Supabase environment variables not configured. Using localStorage fallback.')
  console.log('Current values:', { 
    url: supabaseUrl || 'undefined', 
    key: supabaseAnonKey ? '[SET]' : 'undefined' 
  })
  console.log('Please configure your .env.local file with proper Supabase credentials.')
  
  supabase = null
  isSupabaseConfigured = false
} else {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey)
    isSupabaseConfigured = true
    console.log('Supabase client initialized successfully')
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error)
    supabase = null
    isSupabaseConfigured = false
  }
}

export { supabase, isSupabaseConfigured }
export const TOKENS_TABLE = 'design_tokens'
