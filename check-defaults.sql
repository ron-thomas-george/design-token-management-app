-- Check for any default values or triggers that might be setting the source column
SELECT 
    column_name, 
    column_default,
    is_nullable,
    data_type
FROM 
    information_schema.columns 
WHERE 
    table_name = 'design_tokens' 
    AND table_schema = 'public';

-- Check for any triggers that might be setting the source column
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM 
    information_schema.triggers 
WHERE 
    event_object_table = 'design_tokens';

-- Check for any row level security policies that might be referencing the source column
SELECT 
    * 
FROM 
    pg_policies 
WHERE 
    tablename = 'design_tokens' 
    AND (qual::text LIKE '%source%' OR with_check::text LIKE '%source%');
