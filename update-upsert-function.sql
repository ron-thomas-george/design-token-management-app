-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS upsert_design_token(TEXT, TEXT, TEXT, TEXT, UUID);

-- Create the updated function without the 'source' column reference
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
  v_timestamp TIMESTAMP WITH TIME ZONE := NOW();
  v_result JSONB;
BEGIN
  -- Log input parameters
  RAISE LOG 'upsert_design_token called with: name=%, type=%, user_id=%', p_name, p_type, p_user_id;
  
  -- Check if the token already exists
  SELECT id INTO v_token_id 
  FROM design_tokens 
  WHERE name = p_name AND user_id = p_user_id
  LIMIT 1;
  
  IF v_token_id IS NOT NULL THEN
    -- Update existing token
    UPDATE design_tokens
    SET 
      value = p_value,
      type = p_type,
      description = COALESCE(p_description, description),
      updated_at = v_timestamp
    WHERE id = v_token_id
    RETURNING id INTO v_token_id;
    
    v_was_created := FALSE;
  ELSE
    -- Insert new token
    INSERT INTO design_tokens (
      name, 
      value, 
      type, 
      description, 
      user_id,
      created_at,
      updated_at
    ) VALUES (
      p_name, 
      p_value, 
      p_type, 
      COALESCE(p_description, p_type || ' token'),
      p_user_id,
      v_timestamp,
      v_timestamp
    )
    RETURNING id INTO v_token_id;
    
    v_was_created := TRUE;
  END IF;
  
  -- Return the result as JSONB
  v_result := jsonb_build_object(
    'id', v_token_id,
    'name', p_name,
    'was_created', v_was_created,
    'timestamp', v_timestamp
  );
  
  RETURN v_result;
  
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error in upsert_design_token: %', SQLERRM
  USING HINT = 'Check the function logic and table constraints';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set the function to be executed with the security context of the definer
ALTER FUNCTION upsert_design_token(TEXT, TEXT, TEXT, TEXT, UUID) SECURITY DEFINER SET search_path = public;
