-- Migration script to assign existing tokens to the authenticated user
-- Run this after creating a user account and getting your user ID

-- First, handle duplicate token names by adding a suffix to duplicates
WITH duplicate_tokens AS (
    SELECT 
        id,
        name,
        ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at) as rn
    FROM design_tokens 
    WHERE user_id IS NULL
),
tokens_to_rename AS (
    SELECT id, name || '_' || rn as new_name
    FROM duplicate_tokens 
    WHERE rn > 1
)
UPDATE design_tokens 
SET name = tokens_to_rename.new_name
FROM tokens_to_rename
WHERE design_tokens.id = tokens_to_rename.id;

-- Now safely assign all null tokens to the first user
UPDATE design_tokens 
SET user_id = (
    SELECT id 
    FROM auth.users 
    ORDER BY created_at ASC 
    LIMIT 1
)
WHERE user_id IS NULL;

-- Verify the update
SELECT 
    COUNT(*) as total_tokens,
    COUNT(user_id) as tokens_with_user_id,
    COUNT(*) - COUNT(user_id) as tokens_without_user_id,
    COUNT(DISTINCT name) as unique_names
FROM design_tokens;
