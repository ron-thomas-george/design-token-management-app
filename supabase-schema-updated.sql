-- Updated Supabase Schema for Fragmento
-- This schema supports user authentication and proper RLS policies

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user profiles table (extends Supabase auth.users)
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  avatar_url TEXT,
  organization VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'editor', 'viewer', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create design_tokens table with proper user association
CREATE TABLE design_tokens (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  value TEXT NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('color', 'typography', 'spacing', 'border-radius', 'shadow')),
  description TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization VARCHAR(255), -- Optional: for multi-tenant support
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, user_id) -- Ensure unique token names per user
);

-- Create integration_configs table for GitHub and Slack configurations
CREATE TABLE integration_configs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  integration_type VARCHAR(50) NOT NULL CHECK (integration_type IN ('github', 'slack')),
  config JSONB NOT NULL, -- Store configuration as JSON
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, integration_type) -- One config per integration type per user
);

-- Create token_sync_history table to track push operations
CREATE TABLE token_sync_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sync_type VARCHAR(50) NOT NULL CHECK (sync_type IN ('github', 'figma')),
  token_ids UUID[] NOT NULL, -- Array of token IDs that were synced
  status VARCHAR(50) NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
  details JSONB, -- Store sync details (PR number, error messages, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_design_tokens_user_id ON design_tokens(user_id);
CREATE INDEX idx_design_tokens_type ON design_tokens(type);
CREATE INDEX idx_design_tokens_name ON design_tokens(name);
CREATE INDEX idx_design_tokens_created_at ON design_tokens(created_at DESC);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_integration_configs_user_id ON integration_configs(user_id);
CREATE INDEX idx_token_sync_history_user_id ON token_sync_history(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_design_tokens_updated_at 
    BEFORE UPDATE ON design_tokens 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integration_configs_updated_at 
    BEFORE UPDATE ON integration_configs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_sync_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for design_tokens
CREATE POLICY "Users can view own tokens" ON design_tokens
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tokens" ON design_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens" ON design_tokens
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens" ON design_tokens
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for integration_configs
CREATE POLICY "Users can manage own integrations" ON integration_configs
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for token_sync_history
CREATE POLICY "Users can view own sync history" ON token_sync_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sync history" ON token_sync_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Sample data for development (optional - remove in production)
-- Note: These will only work if you have actual authenticated users
-- INSERT INTO design_tokens (name, value, type, description, user_id) VALUES
-- ('primary-blue', '#3B82F6', 'color', 'Primary brand color', auth.uid()),
-- ('secondary-gray', '#6B7280', 'color', 'Secondary text color', auth.uid()),
-- ('spacing-sm', '8px', 'spacing', 'Small spacing value', auth.uid()),
-- ('spacing-md', '16px', 'spacing', 'Medium spacing value', auth.uid()),
-- ('spacing-lg', '24px', 'spacing', 'Large spacing value', auth.uid()),
-- ('border-radius-sm', '4px', 'border-radius', 'Small border radius', auth.uid()),
-- ('heading-large', '24px/1.2 "Inter", sans-serif', 'typography', 'Large heading style', auth.uid()),
-- ('shadow-soft', '0 4px 6px -1px rgba(0, 0, 0, 0.1)', 'shadow', 'Soft drop shadow', auth.uid());

-- Views for easier querying
CREATE VIEW token_stats_by_user AS
SELECT 
  user_id,
  type,
  COUNT(*) as count,
  MAX(updated_at) as last_updated
FROM design_tokens
GROUP BY user_id, type;

CREATE VIEW recent_token_activity AS
SELECT 
  dt.id,
  dt.name,
  dt.type,
  dt.user_id,
  up.full_name as user_name,
  dt.created_at,
  dt.updated_at
FROM design_tokens dt
JOIN user_profiles up ON dt.user_id = up.id
ORDER BY dt.updated_at DESC
LIMIT 50;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- For development: Allow anonymous access (REMOVE IN PRODUCTION)
-- Uncomment these lines only for development/testing
-- ALTER TABLE design_tokens DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE integration_configs DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE token_sync_history DISABLE ROW LEVEL SECURITY;
