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

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow service role to bypass RLS for upsert" ON design_tokens;

-- Allow service role to bypass RLS for the upsert function
CREATE POLICY "Allow service role to bypass RLS for upsert" ON design_tokens
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Grant necessary permissions to the function
GRANT EXECUTE ON FUNCTION upsert_design_token(TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated, service_role;

-- Allow the function to be executed by authenticated users
ALTER FUNCTION upsert_design_token(TEXT, TEXT, TEXT, TEXT, UUID) SECURITY DEFINER SET search_path = public;

-- Remove overly permissive anon policy - causes cross-user visibility
DROP POLICY IF EXISTS "Allow anon to read tokens for API validation" ON design_tokens;

-- Function to get user tokens (bypasses RLS for API endpoints)  
CREATE OR REPLACE FUNCTION get_user_tokens_v2(target_user_id UUID)
RETURNS TABLE(
    id UUID,
    name TEXT,
    value TEXT,
    type TEXT,
    description TEXT,
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) 
SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT dt.id, dt.name, dt.value, dt.type, dt.description, dt.user_id, dt.created_at, dt.updated_at
    FROM design_tokens dt
    WHERE dt.user_id = target_user_id
    ORDER BY dt.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to validate API key and return user_id
CREATE OR REPLACE FUNCTION validate_api_key(api_key_input TEXT)
RETURNS UUID AS $$
DECLARE
    user_uuid UUID;
    key_count INTEGER;
BEGIN
    RAISE LOG 'Validating API key (first 8 chars: %)', LEFT(api_key_input, 8) || '...';
    
    -- Check if the API key exists and is active
    SELECT user_id, COUNT(*) INTO user_uuid, key_count
    FROM user_api_keys
    WHERE api_key = api_key_input AND is_active = true
    GROUP BY user_id;
    
    RAISE LOG 'API key lookup - Found % matching active keys for user: %', 
        COALESCE(key_count, 0), 
        user_uuid;
    
    -- Update last_used_at timestamp if key is valid
    IF user_uuid IS NOT NULL THEN
        UPDATE user_api_keys 
        SET last_used_at = NOW() 
        WHERE api_key = api_key_input
        RETURNING user_id INTO user_uuid;
        
        RAISE LOG 'Updated last_used_at for API key (first 8 chars: %)', 
            LEFT(api_key_input, 8) || '...';
    ELSE
        -- Log failed attempts for debugging
        RAISE LOG 'Invalid or inactive API key provided (first 8 chars: %)', 
            LEFT(api_key_input, 8) || '...';
    END IF;
    
    RETURN user_uuid;
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

-- Function to upsert design tokens with proper security context
CREATE OR REPLACE FUNCTION upsert_design_token(
    p_name TEXT,
    p_value TEXT,
    p_type TEXT,
    p_description TEXT,
    p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_token_id UUID;
    v_was_created BOOLEAN := FALSE;
    v_result JSONB;
    v_current_user_id UUID;
    v_existing_token_id UUID;
    v_is_service_role BOOLEAN;
BEGIN
    -- Log input parameters
    RAISE LOG 'upsert_design_token called with: name=%, type=%, user_id=%', p_name, p_type, p_user_id;
    
    -- Check if we're running as service role
    v_is_service_role := current_setting('role') = 'service_role';
    
    -- Get current user ID for debugging (skip if service role)
    IF NOT v_is_service_role THEN
        v_current_user_id := auth.uid();
        RAISE LOG 'Current auth.uid(): %', v_current_user_id;
        
        -- Check if the user is authorized (either the token owner or an admin)
        IF p_user_id IS NULL OR p_user_id != v_current_user_id THEN
            RAISE EXCEPTION 'Not authorized to modify tokens for this user. Requested user: %, Authenticated user: %', 
                p_user_id, v_current_user_id;
        END IF;
    ELSE
        RAISE LOG 'Running with service role, skipping user validation';
    END IF;
    
    -- Check if token exists (case-insensitive comparison)
    SELECT id INTO v_existing_token_id 
    FROM design_tokens 
    WHERE LOWER(name) = LOWER(p_name) AND user_id = p_user_id
    LIMIT 1;
    
    -- If found by case-insensitive match but not exact match, we'll update the name to match the exact case
    IF v_existing_token_id IS NOT NULL THEN
        -- Update the name to match the exact case from the input
        UPDATE design_tokens
        SET name = p_name
        WHERE id = v_existing_token_id AND name != p_name;
    END IF;
    
    -- Try to update or insert token
    IF v_existing_token_id IS NOT NULL THEN
        RAISE LOG 'Updating existing token: % (ID: %)', p_name, v_existing_token_id;
        
        UPDATE design_tokens
        SET 
            value = p_value,
            type = p_type,
            description = p_description,
            updated_at = NOW()
        WHERE 
            id = v_existing_token_id
        RETURNING id INTO v_token_id;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Failed to update token: %', p_name;
        END IF;
        
        RAISE LOG 'Successfully updated token: % (ID: %)', p_name, v_token_id;
    ELSE
        RAISE LOG 'Inserting new token: % for user: %', p_name, p_user_id;
        
        INSERT INTO design_tokens (name, value, type, description, user_id, created_at, updated_at)
        VALUES (p_name, p_value, p_type, p_description, p_user_id, NOW(), NOW())
        RETURNING id INTO v_token_id;
        
        IF v_token_id IS NULL THEN
            RAISE EXCEPTION 'Failed to insert token: %', p_name;
        END IF;
        
        v_was_created := TRUE;
        RAISE LOG 'Successfully inserted token: % (ID: %)', p_name, v_token_id;
    END IF;
    
    -- Return the result
    v_result := jsonb_build_object(
        'id', v_token_id,
        'name', p_name,
        'was_created', v_was_created,
        'timestamp', NOW()
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
