-- Create user profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies for user_profiles if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Trigger to automatically create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- User API Keys table for Figma plugin authentication
CREATE TABLE IF NOT EXISTS user_api_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    api_key TEXT UNIQUE NOT NULL,
    name TEXT DEFAULT 'Figma Plugin Key',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);

-- Enable RLS on user_api_keys
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

-- Drop existing policies for user_api_keys if they exist
DROP POLICY IF EXISTS "Users can view their own API keys" ON user_api_keys;
DROP POLICY IF EXISTS "Users can insert their own API keys" ON user_api_keys;
DROP POLICY IF EXISTS "Users can update their own API keys" ON user_api_keys;
DROP POLICY IF EXISTS "Users can delete their own API keys" ON user_api_keys;

-- RLS policies for user_api_keys
CREATE POLICY "Users can view their own API keys" ON user_api_keys
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own API keys" ON user_api_keys
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys" ON user_api_keys
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API keys" ON user_api_keys
    FOR DELETE USING (auth.uid() = user_id);

-- Allow anon access for API key validation (needed for external API endpoints)
DROP POLICY IF EXISTS "Allow anon to validate API keys" ON user_api_keys;
CREATE POLICY "Allow anon to validate API keys" ON user_api_keys
    FOR SELECT USING (true);

-- Update design_tokens RLS policies to be user-specific
DROP POLICY IF EXISTS "Allow all operations on design_tokens" ON design_tokens;
DROP POLICY IF EXISTS "Users can view their own tokens" ON design_tokens;
DROP POLICY IF EXISTS "Users can insert their own tokens" ON design_tokens;
DROP POLICY IF EXISTS "Users can update their own tokens" ON design_tokens;
DROP POLICY IF EXISTS "Users can delete their own tokens" ON design_tokens;

-- Create user-specific policies for design_tokens
CREATE POLICY "Users can view their own tokens" ON design_tokens
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tokens" ON design_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tokens" ON design_tokens
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tokens" ON design_tokens
    FOR DELETE USING (auth.uid() = user_id);

-- Allow anon access to design_tokens for API key validation
DROP POLICY IF EXISTS "Allow anon to read tokens for API validation" ON design_tokens;
CREATE POLICY "Allow anon to read tokens for API validation" ON design_tokens
    FOR SELECT USING (true);

-- Function to validate API key and return user_id
CREATE OR REPLACE FUNCTION validate_api_key(api_key_input TEXT)
RETURNS UUID AS $$
DECLARE
    user_uuid UUID;
BEGIN
    SELECT user_id INTO user_uuid
    FROM user_api_keys
    WHERE api_key = api_key_input AND is_active = true;
    
    -- Update last_used_at timestamp
    IF user_uuid IS NOT NULL THEN
        UPDATE user_api_keys 
        SET last_used_at = NOW() 
        WHERE api_key = api_key_input;
    END IF;
    
    RETURN user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create token via API (bypasses RLS)
CREATE OR REPLACE FUNCTION create_token_via_api(
    p_user_id UUID,
    p_name TEXT,
    p_value TEXT,
    p_type TEXT,
    p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_token_id UUID;
BEGIN
    INSERT INTO design_tokens (user_id, name, value, type, description)
    VALUES (p_user_id, p_name, p_value, p_type, p_description)
    RETURNING id INTO new_token_id;
    
    RETURN new_token_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function removed - using the version that accepts client-generated API key

-- Function to get user tokens (for API access)
CREATE OR REPLACE FUNCTION get_user_tokens(user_uuid UUID)
RETURNS TABLE(
    id UUID,
    name TEXT,
    value TEXT,
    type TEXT,
    description TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT dt.id, dt.name, dt.value, dt.type, dt.description, dt.created_at, dt.updated_at
    FROM design_tokens dt
    WHERE dt.user_id = user_uuid
    ORDER BY dt.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create API key (bypasses RLS issues)
CREATE OR REPLACE FUNCTION create_api_key(p_api_key TEXT, p_name TEXT)
RETURNS TEXT AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Get the current authenticated user
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Insert the new API key
    INSERT INTO user_api_keys (user_id, api_key, name)
    VALUES (current_user_id, p_api_key, p_name);
    
    RETURN p_api_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
