-- First, drop the function if it exists
DROP FUNCTION IF EXISTS public.upsert_design_token(
    p_name TEXT,
    p_value TEXT,
    p_type TEXT,
    p_description TEXT,
    p_user_id UUID
);

-- Create or replace the function
CREATE OR REPLACE FUNCTION public.upsert_design_token(
    p_name TEXT,
    p_value TEXT,
    p_type TEXT,
    p_description TEXT,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_token_id UUID;
    v_was_created BOOLEAN := FALSE;
    v_result JSONB;
BEGIN
    -- Check if token exists (case-insensitive comparison)
    IF EXISTS (
        SELECT 1 
        FROM design_tokens 
        WHERE LOWER(name) = LOWER(p_name) 
        AND user_id = p_user_id
        LIMIT 1
    ) THEN
        -- Update existing token
        UPDATE design_tokens
        SET 
            value = p_value,
            type = p_type,
            description = COALESCE(p_description, description),
            updated_at = NOW()
        WHERE 
            LOWER(name) = LOWER(p_name)
            AND user_id = p_user_id
        RETURNING id INTO v_token_id;
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
            p_description, 
            p_user_id, 
            NOW(), 
            NOW()
        )
        RETURNING id INTO v_token_id;
        
        v_was_created := TRUE;
    END IF;
    
    -- Return the result
    RETURN jsonb_build_object(
        'id', v_token_id,
        'name', p_name,
        'was_created', v_was_created,
        'timestamp', NOW()
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'error', TRUE,
        'message', SQLERRM,
        'detail', SQLSTATE
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.upsert_design_token(
    TEXT,  -- p_name
    TEXT,  -- p_value
    TEXT,  -- p_type
    TEXT,  -- p_description
    UUID   -- p_user_id
) TO authenticated;
