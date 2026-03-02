# Copilot Instructions – TaskFlow

## Project Overview

This is a **Next.js 15 App Router** SaaS project management app using:

- **Supabase** for auth, PostgreSQL database, and real-time subscriptions
- **TailwindCSS + Shadcn/ui + Radix UI** for components
- **@dnd-kit** for drag-and-drop Kanban boards
- **next-themes** for dark/light mode

## Key Conventions

- All Supabase server client calls use `await createClient()` (async)
- Client components import from `@/lib/supabase/client`
- Server components import from `@/lib/supabase/server`
- All shared types are in `src/lib/types.ts`
- Use `cn()` from `@/lib/utils` for conditional class merging
- Route groups: `(auth)` for login/register, `(dashboard)` for protected pages

## Database

- Run `supabase/schema.sql` in Supabase SQL Editor to set up all tables and RLS
- Real-time is enabled on `tasks`, `projects`, `comments`, `workspace_members`
- A trigger auto-creates profile + workspace on user sign-up

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```
