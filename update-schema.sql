-- Drop existing policies if they exist
DO $$
BEGIN
    -- Drop the policy if it exists
    IF EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE tablename = 'design_tokens' 
        AND policyname = 'Allow service role to bypass RLS for upsert'
    ) THEN
        DROP POLICY "Allow service role to bypass RLS for upsert" ON design_tokens;
        RAISE NOTICE 'Dropped existing policy';
    END IF;

    -- Create the policy
    CREATE POLICY "Allow service role to bypass RLS for upsert" ON design_tokens
        FOR ALL TO service_role USING (true) WITH CHECK (true);
    RAISE NOTICE 'Created new policy';
    
    -- Ensure the function has the right permissions
    GRANT EXECUTE ON FUNCTION upsert_design_token(TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated, service_role;
    RAISE NOTICE 'Granted execute permissions';
    
    -- Set the function security
    ALTER FUNCTION upsert_design_token(TEXT, TEXT, TEXT, TEXT, UUID) SECURITY DEFINER SET search_path = public;
    RAISE NOTICE 'Set function security';
    
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Error updating schema: %', SQLERRM;
END $$;
