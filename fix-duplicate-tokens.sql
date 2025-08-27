-- Quick fix for duplicate key constraint violation
-- This handles the immediate issue without full migration

-- Option 1: Remove the unique constraint temporarily
ALTER TABLE design_tokens DROP CONSTRAINT IF EXISTS design_tokens_user_id_name_key;

-- Option 2: Or rename duplicates before assigning user_id
DO $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Get the first user ID
    SELECT id INTO target_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
    
    -- Handle duplicates by renaming them
    UPDATE design_tokens 
    SET name = name || '_' || id::text
    WHERE id IN (
        SELECT id FROM (
            SELECT id, name, 
                   ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at) as rn
            FROM design_tokens 
            WHERE user_id IS NULL
        ) t WHERE rn > 1
    );
    
    -- Now assign user_id safely
    UPDATE design_tokens 
    SET user_id = target_user_id
    WHERE user_id IS NULL;
    
END $$;
