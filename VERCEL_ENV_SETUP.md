# Vercel Environment Variables Setup

## How to Add Environment Variables to Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable below:

## Required Environment Variables

Copy and paste these into Vercel:

```
VITE_SUPABASE_URL=https://zudvpuzwhhnqqpnnxdgm.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1ZHZwdXp3aGhucXFwbm54ZGdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMzk0NjQsImV4cCI6MjA4MDYxNTQ2NH0.HJ1krr3l10GbnWlknAEVmg8_twQwKBIVcKDG_rb7tpg
```

## Quick Copy Format (for Vercel UI)

### Variable 1:
- **Name:** `VITE_SUPABASE_URL`
- **Value:** `https://zudvpuzwhhnqqpnnxdgm.supabase.co`
- **Environment:** Production, Preview, Development

### Variable 2:
- **Name:** `VITE_SUPABASE_PUBLISHABLE_KEY`
- **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1ZHZwdXp3aGhucXFwbm54ZGdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMzk0NjQsImV4cCI6MjA4MDYxNTQ2NH0.HJ1krr3l10GbnWlknAEVmg8_twQwKBIVcKDG_rb7tpg`
- **Environment:** Production, Preview, Development

## Notes

- These are **public** environment variables (VITE_ prefix means they're exposed to the browser)
- Make sure to enable them for all environments (Production, Preview, Development)
- After adding, you'll need to redeploy your application for changes to take effect

