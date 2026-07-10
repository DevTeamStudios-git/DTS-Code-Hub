# Complete Supabase Guide

## Table of Contents
1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Project Setup](#project-setup)
4. [Database Management](#database-management)
5. [Authentication](#authentication)
6. [Real-time Subscriptions](#real-time-subscriptions)
7. [Storage](#storage)
8. [Edge Functions](#edge-functions)
9. [Security & Row Level Security](#security--row-level-security)
10. [Integration with DTS Code Hub](#integration-with-dts-code-hub)
11. [Best Practices](#best-practices)
12. [Troubleshooting](#troubleshooting)

---

## Introduction

### What is Supabase?
Supabase is an open-source Firebase alternative that provides:
- **PostgreSQL Database**: Full PostgreSQL database with automatic backups
- **Authentication**: Easy-to-use auth system with multiple providers
- **Real-time Subscriptions**: Listen to database changes in real-time
- **Storage**: File storage with CDN support
- **Edge Functions**: Serverless functions at the edge
- **Auto-generated APIs**: REST and GraphQL APIs generated from your schema

### Why Supabase?
- Open source and self-hostable
- Built on PostgreSQL (industry standard)
- Powerful SQL capabilities
- Excellent TypeScript support
- Generous free tier
- Active community and documentation

---

## Getting Started

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0
- A Supabase account (free at [supabase.com](https://supabase.com))

### Create a Supabase Project

1. **Sign up/Login** at [supabase.com](https://supabase.com)
2. **Create a new project**:
   - Click "New Project"
   - Choose organization (or create one)
   - Set project name: `dts-code-hub`
   - Set database password (save this securely!)
   - Choose region closest to your users
   - Click "Create new project"

3. **Wait for provisioning** (usually 2-3 minutes)

### Get Your Credentials

Once your project is ready, navigate to:
- **Project Settings** → **API**
- Copy the following:
  - Project URL
  - anon/public key
  - service_role key (keep secret!)

---

## Project Setup

### Install Supabase Client

```bash
npm install @supabase/supabase-js
```

### Initialize Supabase Client

Create `apps/api/src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// For admin operations (use server-side only)
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

### Environment Variables

Add to `.env` file:

```env
SUPABASE_URL=your-project-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### TypeScript Types Generation

Generate TypeScript types from your database schema:

```bash
npx supabase gen types typescript --project-id your-project-id > src/types/supabase.ts
```

---

## Database Management

### SQL Editor

Access the SQL Editor from your Supabase dashboard:
- Navigate to **SQL Editor**
- Write and execute SQL queries
- Save favorite queries
- View query history

### Creating Tables

#### Example: Users Table

```sql
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
```

#### Example: Repositories Table

```sql
CREATE TABLE repositories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for owner lookups
CREATE INDEX idx_repositories_owner ON repositories(owner_id);
```

### Database Migrations

Using Supabase CLI:

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Create a new migration
supabase migration new add_users_table

# Apply migrations
supabase db push
```

### Basic CRUD Operations

#### Create (Insert)

```typescript
const { data, error } = await supabase
  .from('users')
  .insert([
    { 
      email: 'user@example.com',
      username: 'johndoe'
    }
  ])
  .select()
```

#### Read (Select)

```typescript
// Single record
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single()

// Multiple records
const { data, error } = await supabase
  .from('repositories')
  .select('*')
  .eq('owner_id', userId)

// With joins
const { data, error } = await supabase
  .from('repositories')
  .select(`
    *,
    users (
      id,
      username,
      avatar_url
    )
  `)
```

#### Update

```typescript
const { data, error } = await supabase
  .from('users')
  .update({ 
    avatar_url: 'https://example.com/avatar.png',
    updated_at: new Date().toISOString()
  })
  .eq('id', userId)
  .select()
```

#### Delete

```typescript
const { error } = await supabase
  .from('repositories')
  .delete()
  .eq('id', repositoryId)
```

### Advanced Queries

#### Filtering

```typescript
const { data, error } = await supabase
  .from('repositories')
  .select('*')
  .eq('is_public', true)
  .ilike('name', '%test%')
  .gte('created_at', '2024-01-01')
```

#### Ordering & Pagination

```typescript
const { data, error } = await supabase
  .from('repositories')
  .select('*')
  .order('created_at', { ascending: false })
  .range(0, 9) // First 10 records
```

#### Full Text Search

```sql
-- Add full text search index
CREATE INDEX idx_repositories_name_fts ON repositories 
USING gin(to_tsvector('english', name));

-- Search query
const { data, error } = await supabase
  .from('repositories')
  .select('*')
  .textSearch('name', `'test'`)
```

---

## Authentication

### Setup Authentication

Supabase Auth is pre-configured. Configure in your dashboard:
- Navigate to **Authentication** → **Providers**
- Enable providers (Email, GitHub, Google, etc.)

### Email/Password Auth

#### Sign Up

```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'secure-password',
  options: {
    data: {
      username: 'johndoe'
    }
  }
})
```

#### Sign In

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'secure-password'
})
```

#### Sign Out

```typescript
const { error } = await supabase.auth.signOut()
```

### OAuth Providers

#### GitHub OAuth

1. **Configure in Supabase Dashboard**:
   - Authentication → Providers → GitHub
   - Add GitHub OAuth app credentials

2. **Sign In with GitHub**:

```typescript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'github',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`
  }
})
```

### Session Management

#### Get Current Session

```typescript
const { data: { session } } = await supabase.auth.getSession()
```

#### Listen to Auth Changes

```typescript
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    console.log('User signed in:', session.user)
  } else if (event === 'SIGNED_OUT') {
    console.log('User signed out')
  }
})
```

### User Management

#### Get Current User

```typescript
const { data: { user } } = await supabase.auth.getUser()
```

#### Update User Metadata

```typescript
const { data, error } = await supabase.auth.updateUser({
  data: {
    username: 'newusername',
    avatar_url: 'https://example.com/new-avatar.png'
  }
})
```

---

## Real-time Subscriptions

### Enable Real-time

1. Go to **Database** → **Replication**
2. Enable real-time for your tables

### Subscribe to Changes

```typescript
// Subscribe to all changes on a table
const subscription = supabase
  .channel('repositories')
  .on(
    'postgres_changes',
    {
      event: '*', // INSERT, UPDATE, DELETE, or *
      schema: 'public',
      table: 'repositories'
    },
    (payload) => {
      console.log('Change received:', payload)
    }
  )
  .subscribe()
```

### Filtered Subscriptions

```typescript
// Subscribe to specific user's repositories
const subscription = supabase
  .channel('user_repositories')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'repositories',
      filter: 'owner_id=eq.user-id-here'
    },
    (payload) => {
      console.log('User repository change:', payload)
    }
  )
  .subscribe()
```

### Unsubscribe

```typescript
supabase.removeChannel(subscription)
```

---

## Storage

### Create Storage Buckets

1. Navigate to **Storage** in dashboard
2. Create a new bucket (e.g., `avatars`, `repositories`)
3. Configure bucket settings (public/private)

### Upload Files

```typescript
const { data, error } = await supabase
  .storage
  .from('avatars')
  .upload('user-123/avatar.png', file, {
    cacheControl: '3600',
    upsert: false
  })
```

### Download Files

```typescript
const { data, error } = await supabase
  .storage
  .from('avatars')
  .download('user-123/avatar.png')
```

### Get Public URL

```typescript
const { data } = supabase
  .storage
  .from('avatars')
  .getPublicUrl('user-123/avatar.png')

console.log(data.publicUrl)
```

### Delete Files

```typescript
const { error } = await supabase
  .storage
  .from('avatars')
  .remove(['user-123/avatar.png'])
```

### List Files

```typescript
const { data, error } = await supabase
  .storage
  .from('avatars')
  .list('user-123', {
    limit: 100,
    offset: 0
  })
```

---

## Edge Functions

### Create Edge Function

```bash
# Install Supabase CLI
npm install -g supabase

# Create new function
supabase functions new hello-world
```

### Example Edge Function

```typescript
// supabase/functions/hello-world/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { name } = await req.json()
  
  const data = {
    message: `Hello ${name}!`
  }
  
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json'
    }
  })
})
```

### Deploy Edge Function

```bash
supabase functions deploy hello-world
```

### Call Edge Function

```typescript
const { data, error } = await supabase.functions.invoke('hello-world', {
  body: { name: 'John' }
})
```

---

## Security & Row Level Security

### What is RLS?

Row Level Security (RLS) allows you to restrict which rows users can access based on their authentication state and custom policies.

### Enable RLS

```sql
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;
```

### Create Policies

#### Read Policy

```sql
-- Allow anyone to read public repositories
CREATE POLICY "Public repositories are readable by everyone"
ON repositories FOR SELECT
USING (is_public = true);

-- Allow owners to read their own repositories
CREATE POLICY "Owners can read their repositories"
ON repositories FOR SELECT
USING (auth.uid() = owner_id);
```

#### Insert Policy

```sql
-- Allow authenticated users to create repositories
CREATE POLICY "Authenticated users can create repositories"
ON repositories FOR INSERT
WITH CHECK (auth.uid() = owner_id);
```

#### Update Policy

```sql
-- Allow owners to update their repositories
CREATE POLICY "Owners can update their repositories"
ON repositories FOR UPDATE
USING (auth.uid() = owner_id);
```

#### Delete Policy

```sql
-- Allow owners to delete their repositories
CREATE POLICY "Owners can delete their repositories"
ON repositories FOR DELETE
USING (auth.uid() = owner_id);
```

### Helper Functions

Create helper functions for complex policies:

```sql
-- Function to check if user is repository collaborator
CREATE OR REPLACE FUNCTION is_collaborator(repo_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM collaborators
    WHERE repository_id = repo_id AND user_id = user_id
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Use in policy
CREATE POLICY "Collaborators can read repositories"
ON repositories FOR SELECT
USING (
  is_public = true OR 
  auth.uid() = owner_id OR 
  is_collaborator(id, auth.uid())
);
```

---

## Integration with DTS Code Hub

### Database Schema for DTS Code Hub

```sql
-- Users table (extends auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Repositories table
CREATE TABLE public.repositories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT true,
  stars_count INTEGER DEFAULT 0,
  forks_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Issues table
CREATE TABLE public.issues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  repository_id UUID REFERENCES public.repositories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  author_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  state TEXT DEFAULT 'open', -- 'open' or 'closed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pull requests table
CREATE TABLE public.pull_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  repository_id UUID REFERENCES public.repositories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  author_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  source_branch TEXT NOT NULL,
  target_branch TEXT NOT NULL,
  state TEXT DEFAULT 'open', -- 'open', 'merged', 'closed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Collaborators table
CREATE TABLE public.collaborators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  repository_id UUID REFERENCES public.repositories(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'read', -- 'read', 'write', 'admin'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(repository_id, user_id)
);

-- Stars table
CREATE TABLE public.stars (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  repository_id UUID REFERENCES public.repositories(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(repository_id, user_id)
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pull_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stars ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view all profiles"
ON public.users FOR SELECT
USING (true);

CREATE POLICY "Users can update own profile"
ON public.users FOR UPDATE
USING (auth.uid() = id);

-- Additional policies for other tables...
```

### API Integration Example

```typescript
// apps/api/src/repositories/index.ts
import { supabase } from '../lib/supabase'

export async function getRepository(id: string) {
  const { data, error } = await supabase
    .from('repositories')
    .select(`
      *,
      users (
        id,
        username,
        avatar_url
      ),
      issues (
        id,
        title,
        state,
        created_at
      )
    )
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createRepository(
  name: string,
  description: string,
  isPublic: boolean,
  userId: string
) {
  const { data, error } = await supabase
    .from('repositories')
    .insert({
      name,
      description,
      is_public: isPublic,
      owner_id: userId
    })
    .select()
    .single()

  if (error) throw error
  return data
}
```

### Real-time Integration

```typescript
// apps/web/src/hooks/useRealtimeRepositories.ts
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useRealtimeRepositories(userId: string) {
  const [repositories, setRepositories] = useState([])

  useEffect(() => {
    // Initial fetch
    fetchRepositories()

    // Subscribe to changes
    const subscription = supabase
      .channel('user-repositories')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'repositories',
          filter: `owner_id=eq.${userId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setRepositories(prev => [...prev, payload.new])
          } else if (payload.eventType === 'UPDATE') {
            setRepositories(prev =>
              prev.map(repo => 
                repo.id === payload.new.id ? payload.new : repo
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setRepositories(prev =>
              prev.filter(repo => repo.id !== payload.old.id)
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [userId])

  async function fetchRepositories() {
    const { data } = await supabase
      .from('repositories')
      .select('*')
      .eq('owner_id', userId)
    setRepositories(data || [])
  }

  return repositories
}
```

---

## Best Practices

### 1. Environment Variables
- Never commit secrets to version control
- Use different keys for development and production
- Rotate keys regularly

### 2. Database Design
- Use UUIDs for primary keys
- Add appropriate indexes for frequently queried columns
- Use foreign keys for relationships
- Enable RLS on all user-facing tables

### 3. Security
- Always use RLS policies
- Validate data on the client and server
- Use the anon key for client-side operations
- Use service_role key only on the server
- Never expose service_role key to the client

### 4. Performance
- Use select() to specify only needed columns
- Implement pagination for large datasets
- Use database indexes for filter columns
- Cache frequently accessed data

### 5. Error Handling
```typescript
async function safeSupabaseCall() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Supabase error:', error)
    // Handle specific error types
    if (error.code === 'PGRST116') {
      // Not found
    }
    return null
  }

  return data
}
```

### 6. TypeScript Integration
```typescript
// Define types based on your database
type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: UUID
          username: string
          email: string
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id?: UUID
          username: string
          email: string
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: UUID
          username?: string
          email?: string
          avatar_url?: string | null
          created_at?: string
        }
      }
    }
  }
}

type User = Database['public']['Tables']['users']['Row']
```

---

## Troubleshooting

### Common Issues

#### Connection Issues
```typescript
// Check connection
const { data, error } = await supabase
  .from('users')
  .select('count')
  .single()

if (error) {
  console.error('Connection error:', error.message)
}
```

#### RLS Policy Issues
```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- View existing policies
SELECT * FROM pg_policies;
```

#### Real-time Not Working
- Ensure replication is enabled for the table
- Check that the table has a primary key
- Verify the channel subscription is active

#### Storage Upload Issues
- Check bucket permissions
- Verify file size limits
- Ensure proper MIME types

### Debug Mode

Enable debug logging:

```typescript
const supabase = createClient(url, key, {
  db: { schema: 'public' },
  global: {
    headers: { 'x-client-info': 'your-app-name' }
  },
  auth: {
    debug: true
  }
})
```

### Getting Help

- **Documentation**: [supabase.com/docs](https://supabase.com/docs)
- **GitHub Discussions**: [github.com/supabase/supabase/discussions](https://github.com/supabase/supabase/discussions)
- **Discord**: [discord.supabase.com](https://discord.supabase.com)
- **Twitter**: [@supabase](https://twitter.com/supabase)

---

## Additional Resources

### Official Documentation
- [Supabase Docs](https://supabase.com/docs)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Auth Guide](https://supabase.com/docs/guides/auth)
- [Storage Guide](https://supabase.com/docs/guides/storage)
- [Realtime Guide](https://supabase.com/docs/guides/realtime)

### Community
- [GitHub Repository](https://github.com/supabase/supabase)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/supabase)
- [YouTube Channel](https://www.youtube.com/c/Supabase)

### Tools
- [Supabase Studio](https://supabase.com/dashboard) - Web interface
- [Supabase CLI](https://supabase.com/docs/guides/cli) - Command-line tools
- [pgAdmin](https://www.pgadmin.org/) - PostgreSQL management
- [TablePlus](https://tableplus.com/) - Database GUI client

---

## Quick Reference

### Common Commands

```bash
# Supabase CLI
supabase login
supabase link
supabase db push
supabase db diff
supabase functions deploy
supabase gen types typescript
```

### Essential Code Snippets

```typescript
// Initialize
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(url, key)

// Auth
await supabase.auth.signUp({ email, password })
await supabase.auth.signInWithPassword({ email, password })
await supabase.auth.signOut()

// Database
await supabase.from('table').select('*')
await supabase.from('table').insert({ data })
await supabase.from('table').update({ data }).eq('id', id)
await supabase.from('table').delete().eq('id', id)

// Real-time
supabase.channel('name').on('postgres_changes', config, handler).subscribe()

// Storage
await supabase.storage.from('bucket').upload('path', file)
await supabase.storage.from('bucket').getPublicUrl('path')
```

---

**Last Updated**: July 2026
**Version**: 1.0.0
