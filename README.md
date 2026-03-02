# TaskFlow – Realtime Project Manager

A full-featured SaaS task & project management app built with **Next.js 15**, **TailwindCSS**, **Shadcn/ui**, and **Supabase**.

## Features

- **Authentication** – Supabase Auth (email/password), auto profile & workspace creation on sign-up
- **Kanban Board** – Drag-and-drop columns (Todo / In Progress / In Review / Done) powered by `@dnd-kit`
- **List View** – Collapsible sections by status for a compact task overview
- **Calendar View** – Monthly calendar showing tasks by due date
- **Real-time Updates** – Live task changes via Supabase Realtime channels
- **Team Workspaces** – Invite team members by email, role-based access (Owner / Admin / Member)
- **Dark / Light Mode** – System-aware theme toggle with `next-themes`
- **Priorities** – Low / Medium / High / Urgent with color indicators
- **Due Dates & Assignees** – Per-task assignment with overdue highlighting

## Tech Stack

| Layer              | Technology                              |
| ------------------ | --------------------------------------- |
| Framework          | Next.js 15 (App Router)                 |
| Styling            | TailwindCSS                             |
| Components         | Shadcn/ui + Radix UI primitives         |
| Drag & Drop        | @dnd-kit/core + @dnd-kit/sortable       |
| Backend / Auth     | Supabase (PostgreSQL + Auth + Realtime) |
| Forms & Validation | React Hook Form + Zod                   |
| Theme              | next-themes                             |
| Notifications      | Sonner                                  |

## Getting Started

### 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run `supabase/schema.sql` – this creates all tables, RLS policies, triggers and enables Realtime
3. In **Authentication → URL Configuration**, add `http://localhost:3000/auth/callback` as a redirect URL

### 2. Configure environment variables

Copy `.env.local` and fill in your credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Both values are found in your Supabase project under **Settings → API**.

### 3. Install & run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
src/
├── app/
│   ├── (auth)/               # Login & Register pages
│   ├── (dashboard)/          # Protected app pages
│   │   ├── dashboard/        # Overview & stats
│   │   ├── projects/         # Project list & detail
│   │   │   └── [id]/         # Kanban / List / Calendar views
│   │   ├── team/             # Team member management
│   │   └── settings/         # Profile & workspace settings
│   └── auth/callback/        # Supabase OAuth callback
├── components/
│   ├── ui/                   # Shadcn UI primitives
│   ├── layout/               # Sidebar & TopBar
│   ├── project/              # Board, Kanban, List, Calendar, TaskDialog
│   ├── team/                 # InviteMemberForm
│   └── settings/             # SettingsForm
├── lib/
│   ├── supabase/             # Browser & server Supabase clients
│   ├── types.ts              # Shared TypeScript types
│   └── utils.ts              # cn(), formatDate(), etc.
└── middleware.ts             # Auth route protection
supabase/
└── schema.sql                # Full database schema (run in Supabase SQL Editor)
```

## Database Schema

The schema (`supabase/schema.sql`) creates:

- `profiles` – mirrors `auth.users`, auto-populated by a trigger
- `workspaces` – auto-created on sign-up with the user as owner
- `workspace_members` – team roles (owner / admin / member)
- `workspace_invites` – pending email invitations
- `projects` – project records tied to a workspace
- `project_members` – project-level roles
- `tasks` – full task records with status, priority, due date, assignee
- `comments` – task comments
- `tags` / `task_tags` – tagging system

All tables have Row Level Security (RLS) enabled.

## Deployment

Deploy to Vercel:

```bash
vercel --prod
```

Set the same environment variables in your Vercel project settings.
