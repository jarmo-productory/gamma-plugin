# Database Setup Guide

## Phase 2: Database Integration - COMPLETED ✅

This directory contains the database schema and setup instructions for Productory Powerups for Gamma.

### Setup Instructions

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Note down your project URL and anon key

2. **Configure Environment Variables**
   - Copy `.env.local.example` to `.env.local`
   - Fill in your Supabase credentials:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

3. **Run Database Schema**
   - Open your Supabase project's SQL Editor
   - Run the contents of `schema.sql`

4. **Test Database Connection**
   - Start the dev server: `npm run dev`
   - Visit: `http://localhost:3000/api/test-db`
   - Should return success response when properly configured

### Schema Overview

- **users**: User account information
- **presentations**: Timetable data from Gamma presentations

### Files

- `schema.sql` - Complete database schema with tables, triggers, and indexes
- `README.md` - This setup guide

### Integration Status

✅ Supabase client installed and configured  
✅ TypeScript types defined  
✅ API route for testing database connection  
✅ Build process working with database integration  
✅ Ready for authentication integration (Phase 3)