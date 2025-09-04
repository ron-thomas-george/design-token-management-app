-- Check table constraints and defaults
SELECT 
    tc.table_schema, 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_type,
    pg_get_constraintdef(con.oid) as constraint_definition
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    LEFT JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    LEFT JOIN pg_constraint con
      ON con.conname = tc.constraint_name
WHERE 
    tc.table_name = 'design_tokens';

-- Check column defaults
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
