-- Immediate fix for RLS policy issue
-- Run this in your Supabase SQL editor to fix the current error

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Allow all operations on design_tokens" ON design_tokens;
DROP POLICY IF EXISTS "Allow anonymous access to design_tokens" ON design_tokens;

-- For immediate development: Disable RLS temporarily
-- WARNING: This allows unrestricted access - use only for development
ALTER TABLE design_tokens DISABLE ROW LEVEL SECURITY;

-- Alternative: If you want to keep RLS enabled, use these policies instead
-- Uncomment the lines below and comment out the DISABLE command above

-- CREATE POLICY "Allow anonymous read access" ON design_tokens
--     FOR SELECT USING (true);

-- CREATE POLICY "Allow anonymous insert" ON design_tokens
--     FOR INSERT WITH CHECK (true);

-- CREATE POLICY "Allow anonymous update" ON design_tokens
--     FOR UPDATE USING (true);

-- CREATE POLICY "Allow anonymous delete" ON design_tokens
--     FOR DELETE USING (true);

-- Verify the change
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'design_tokens';
