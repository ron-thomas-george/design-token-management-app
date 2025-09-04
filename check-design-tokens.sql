-- Check table structure
SELECT 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM 
    information_schema.columns 
WHERE 
    table_schema = 'public' 
    AND table_name = 'design_tokens';

-- Check RLS policies
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM 
    pg_policies
WHERE 
    tablename = 'design_tokens';

-- Check function permissions
SELECT 
    proname,
    proowner::regrole,
    prosecdef,
    proacl
FROM 
    pg_proc
WHERE 
    proname = 'upsert_design_token';
