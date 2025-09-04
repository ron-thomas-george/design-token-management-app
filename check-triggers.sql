-- Check for any triggers on design_tokens
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM 
    information_schema.triggers 
WHERE 
    event_object_table = 'design_tokens';

-- Check for any other functions that might reference design_tokens
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM 
    pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE 
    p.prokind = 'f' 
    AND n.nspname = 'public'
    AND pg_get_functiondef(p.oid) LIKE '%design_tokens%';

-- Check for any views that might reference design_tokens
SELECT 
    table_name,
    view_definition
FROM 
    information_schema.views 
WHERE 
    table_schema = 'public'
    AND view_definition LIKE '%design_tokens%';
