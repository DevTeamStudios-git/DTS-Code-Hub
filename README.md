# DTS Code Hub

**Build • Collaborate • Innovate**

A self-hosted GitHub clone built by Development Team Studios (DTS). A full-featured collaborative code platform supporting version control, repository management, issue tracking, pull requests, and rich file rendering.

## Project Structure

This is a monorepo with the following structure:

```
dts-code-hub/
├── apps/
│   ├── api/          # Node.js + Express + TypeScript backend
│   ├── web/          # Vite + React + TypeScript frontend
│   └── desktop/      # Electron desktop client
├── packages/
│   └── shared/       # Shared utilities and types
└── package.json      # Root workspace configuration
```

## Tech Stack

- **Frontend:** Vite + React + TypeScript + TailwindCSS
- **Desktop:** Electron wrapping the same Vite/React frontend
- **Backend:** Node.js + Express + TypeScript
- **Database:** Supabase (PostgreSQL)
- **ORM:** Prisma
- **Auth:** Supabase Auth with JWT session handling
- **Git Engine:** isomorphic-git (planned)

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Supabase account (for database and auth)

### Installation

1. Clone the repository and navigate to the root directory:
```bash
cd "DTS Code Hub"
```

2. Install dependencies for all workspaces:
```bash
npm install
```

3. Set up environment variables:
```bash
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env` with your Supabase credentials:
- `DATABASE_URL`: Your Supabase PostgreSQL connection string
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
- `JWT_SECRET`: A secure secret for JWT token signing

4. Run database migrations (when Supabase is configured):
```bash
cd apps/api
npx prisma migrate dev
```

### Development

Start both frontend and backend:
```bash
npm run dev
```

This will start:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

Start individual services:
```bash
npm run dev:web    # Frontend only
npm run dev:api    # Backend only
npm run dev:desktop # Desktop client
```

### Building

Build all workspaces:
```bash
npm run build
```

Build individual services:
```bash
npm run build:web
npm run build:api
npm run build:desktop
```

## Phase 0 Status

Phase 0 (Project scaffolding & architecture foundation) has been completed with the following:

### Completed
- ✅ Monorepo structure with apps/api, apps/web, apps/desktop, packages/shared
- ✅ Vite + React + TypeScript + TailwindCSS frontend initialization
- ✅ Node.js + Express + TypeScript backend initialization
- ✅ Prisma ORM setup with Supabase Postgres connection configuration
- ✅ Initial database schema (User, Repository, Star, Follow, Issue, PullRequest, Comment models)
- ✅ Supabase Auth skeleton with JWT session handling
- ✅ Base UI shell with dark theme and navigation
- ✅ DTS Code Hub logo (SVG) in navigation
- ✅ Bilingual (EN/FR) toggle scaffold
- ✅ Electron wrapper configuration for desktop client

### What's Stubbed/Mocked
- Auth routes are implemented but not yet connected to the database user profile
- Database migrations need to be run once Supabase is configured
- Desktop client needs React frontend code to be synced from apps/web

### Next Phase Dependencies
Phase 1 (Authentication & user profiles) will depend on:
- Supabase project being fully configured with database
- Auth routes being connected to user profile creation in the database
- 2FA, SSH/GPG key management, OAuth apps/PATs implementation

## Branding

- **Theme:** Dark theme with near-black navy background (`#0B0E14` / `#11141C`)
- **Accent:** Blue→purple gradient (`#3B5BFE → #8B3BFE`)
- **Mascot:** Bunny (circular orbit motif with code brackets `</>`)
- **Icons:** SVG-only (no emojis in UI)

## License

Proprietary - Development Team Studios
