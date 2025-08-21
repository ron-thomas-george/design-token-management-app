-- Fix RLS policy to allow anonymous access to design_tokens table
-- Run this in your Supabase SQL editor

-- First, drop any existing policies
DROP POLICY IF EXISTS "Allow all operations on design_tokens" ON design_tokens;
DROP POLICY IF EXISTS "Allow anonymous access to design_tokens" ON design_tokens;

-- Disable Row Level Security completely for anonymous access
ALTER TABLE design_tokens DISABLE ROW LEVEL SECURITY;

-- Verify the change
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'design_tokens';
