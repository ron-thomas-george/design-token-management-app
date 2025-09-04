-- Check the function definition in the database
SELECT 
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    pg_get_function_result(p.oid) AS return_type,
    l.lanname AS language,
    CASE 
        WHEN p.prosecdef THEN 'SECURITY DEFINER' 
        ELSE 'SECURITY INVOKER' 
    END AS security_type,
    pg_get_functiondef(p.oid) AS definition
FROM 
    pg_proc p
    LEFT JOIN pg_language l ON p.prolang = l.oid
WHERE 
    p.proname = 'upsert_design_token';

-- Check RLS policies on design_tokens
SELECT * FROM pg_policies WHERE tablename = 'design_tokens';

-- Check function permissions
SELECT 
    n.nspname AS schema_name,
    p.proname AS function_name,
    r.rolname AS role_name,
    CASE p.prokind
        WHEN 'a' THEN 'agg'
        WHEN 'w' THEN 'window'
        WHEN 'p' THEN 'proc'
        ELSE 'func'
    END AS function_type,
    array_to_string(ARRAY(
        SELECT pg_get_userbyid(proacl.grantee) || '=' || 
               array_to_string(ARRAY(
                   SELECT privilege_type
                   FROM unnest(ARRAY[
                       CASE WHEN proacl.privilege_type & 1 = 1 THEN 'EXECUTE' END,
                       CASE WHEN proacl.privilege_type & 2 = 2 THEN 'EXECUTE' END
                   ]) AS privilege_type
                   WHERE privilege_type IS NOT NULL
               ), ', ')
        FROM (SELECT unnest(proacl) AS proacl FROM pg_proc WHERE oid = p.oid) AS proacl_unnest
    ), '; ') AS grants
FROM 
    pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    JOIN pg_roles r ON p.proowner = r.oid
WHERE 
    p.proname = 'upsert_design_token';
