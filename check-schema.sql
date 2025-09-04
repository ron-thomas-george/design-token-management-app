-- Check if design_tokens table exists
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'design_tokens';

-- Check if upsert_design_token function exists
SELECT 
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    pg_get_function_result(p.oid) AS return_type,
    l.lanname AS language,
    CASE 
        WHEN p.prosecdef THEN 'SECURITY DEFINER' 
        ELSE 'SECURITY INVOKER' 
    END AS security_type
FROM 
    pg_proc p
    LEFT JOIN pg_language l ON p.prolang = l.oid
WHERE 
    p.proname = 'upsert_design_token';

-- List all tables in the public schema
SELECT 
    table_name,
    table_type
FROM 
    information_schema.tables
WHERE 
    table_schema = 'public';

-- List all functions in the public schema
SELECT 
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    pg_get_function_result(p.oid) AS return_type
FROM 
    pg_proc p
    LEFT JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE 
    n.nspname = 'public'
ORDER BY 
    p.proname;
