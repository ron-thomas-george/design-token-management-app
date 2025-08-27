-- Migration script to assign existing tokens to the authenticated user
-- Run this after creating a user account and getting your user ID

-- First, get your user ID (replace with your actual user ID)
-- You can find this in Supabase Auth > Users section
-- Example: UPDATE design_tokens SET user_id = 'your-user-id-here' WHERE user_id IS NULL;

-- Option 1: If you know your user ID, uncomment and replace the UUID below:
-- UPDATE design_tokens 
-- SET user_id = 'your-user-id-here'
-- WHERE user_id IS NULL;

-- Option 2: Assign all null tokens to the first user (if you're the only user):
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
    COUNT(*) - COUNT(user_id) as tokens_without_user_id
FROM design_tokens;
