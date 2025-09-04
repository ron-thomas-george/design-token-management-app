-- List all functions in the public schema
SELECT 
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as function_arguments,
    pg_get_functiondef(p.oid) as function_definition
FROM 
    pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE 
    n.nspname = 'public'
ORDER BY 
    p.proname;

-- Check for any triggers on design_tokens
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM 
    information_schema.triggers 
WHERE 
    event_object_table = 'design_tokens';

-- Check for any RLS policies on design_tokens
SELECT 
    * 
FROM 
    pg_policies 
WHERE 
    tablename = 'design_tokens';

-- Check for any views that reference design_tokens
SELECT 
    table_name,
    view_definition
FROM 
    information_schema.views 
WHERE 
    table_schema = 'public'
    AND view_definition LIKE '%design_tokens%';
