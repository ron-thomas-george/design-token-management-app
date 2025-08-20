# Supabase Setup Guide

## Quick Setup Steps

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose your organization and enter project details
4. Wait for project to be created

### 2. Get Your Credentials
1. In your Supabase dashboard, go to **Settings** > **API**
2. Copy your **Project URL** and **anon public key**

### 3. Set Up Database
1. In Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy and paste the contents of `supabase-schema.sql`
4. Click "Run" to create the table and sample data

### 4. Configure Environment Variables
1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### 5. Test the Connection
1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Open the app and try creating a token
3. Check your Supabase dashboard > **Table Editor** > `design_tokens` to see the data

## Database Schema

The `design_tokens` table includes:
- `id` (UUID, Primary Key)
- `name` (VARCHAR, Unique)
- `value` (TEXT)
- `type` (VARCHAR with constraints)
- `description` (TEXT, Optional)
- `created_at` (Timestamp)
- `updated_at` (Timestamp, Auto-updated)

## Features Enabled

✅ **Real-time data persistence**
✅ **Automatic backups**
✅ **Multi-user support ready**
✅ **Search and filtering**
✅ **Token statistics**
✅ **Batch operations**

## Troubleshooting

### Connection Issues
- Verify your `.env.local` file has correct credentials
- Check Supabase project is active (not paused)
- Ensure RLS policies allow access

### Database Issues
- Run the SQL schema if tables don't exist
- Check table permissions in Supabase dashboard
- Verify data types match the schema

### Development vs Production
- Use different Supabase projects for dev/prod
- Set environment variables in Netlify for production
- Enable Row Level Security for production use
