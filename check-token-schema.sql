-- Check the current structure of design_tokens table
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

-- Check RLS policies on design_tokens
SELECT 
    * 
FROM 
    pg_policies 
WHERE 
    tablename = 'design_tokens';

-- Check the function definition if it exists
SELECT 
    proname,
    pg_get_functiondef(oid) as function_definition
FROM 
    pg_proc 
WHERE 
    proname = 'upsert_design_token';
