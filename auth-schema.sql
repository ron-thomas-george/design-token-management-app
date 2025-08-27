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

-- RLS policies for user_api_keys
CREATE POLICY "Users can view their own API keys" ON user_api_keys
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own API keys" ON user_api_keys
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys" ON user_api_keys
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API keys" ON user_api_keys
    FOR DELETE USING (auth.uid() = user_id);

-- Update design_tokens RLS policies to be user-specific
DROP POLICY IF EXISTS "Allow all operations on design_tokens" ON design_tokens;

-- Create user-specific policies for design_tokens
CREATE POLICY "Users can view their own tokens" ON design_tokens
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tokens" ON design_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tokens" ON design_tokens
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tokens" ON design_tokens
    FOR DELETE USING (auth.uid() = user_id);

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

-- Function to generate API key for user
CREATE OR REPLACE FUNCTION generate_user_api_key(key_name TEXT DEFAULT 'Figma Plugin Key')
RETURNS TEXT AS $$
DECLARE
    new_api_key TEXT;
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Generate a secure random API key
    new_api_key := 'frag_' || encode(gen_random_bytes(32), 'base64');
    new_api_key := replace(new_api_key, '/', '_');
    new_api_key := replace(new_api_key, '+', '-');
    
    -- Insert the new API key
    INSERT INTO user_api_keys (user_id, api_key, name)
    VALUES (current_user_id, new_api_key, key_name);
    
    RETURN new_api_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
