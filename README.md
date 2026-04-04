# Shiraz House — Event Planner

Internal platform for planning, approving, and reporting on events (Next.js App Router, Supabase, TypeScript).

## Documentation

| Doc                                                      | What it covers                                                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **[docs/DEVELOPER_GUIDE.md](./docs/DEVELOPER_GUIDE.md)** | Setup from zero, environment variables, project structure, database, integrations, development workflow |
| **[docs/BACKEND_GUIDE.md](./docs/BACKEND_GUIDE.md)**     | API routes, services, DAL, validation, building backend features                                        |
| **[docs/FRONTEND_GUIDE.md](./docs/FRONTEND_GUIDE.md)**   | UI patterns, React Query, client services, frontend ↔ API integration                                   |
| **[docs/README.md](./docs/README.md)**                   | Index of all docs                                                                                       |

## Quick start

### Prerequisites

- Node.js 20+
- npm 10+
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for local DB or schema sync)
- Docker Desktop (only if you run Supabase locally with `supabase start`)

### Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment**

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` with your Supabase URL, anon key, service role key, and other values described in [docs/DEVELOPER_GUIDE.md](./docs/DEVELOPER_GUIDE.md#5-environment-variables).

3. **Database**

   Apply `db/schema.sql` to your Supabase project (SQL Editor) or use local Supabase — see the Developer Guide.

4. **Run the app**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

### Database scripts

| Command                                 | Purpose                                                                                          |
| --------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `npm run db:push` / `db:pull`           | Push or pull schema via Supabase CLI (after linking the project)                                 |
| `npm run db:reset`                      | Reset local Supabase database                                                                    |
| `npm run db:sync:pull` / `db:sync:push` | Sync **data** between remote and local (`REMOTE_DB_URL` in `.env.local`) — see `scripts/sync.sh` |

Details: [docs/DEVELOPER_GUIDE.md § Database](./docs/DEVELOPER_GUIDE.md#7-database) and [db/README.md](./db/README.md).

### Other scripts

```bash
npm run lint          # ESLint
npm run format        # Prettier
npm run test          # Vitest
```

## Tech stack

Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, TanStack Query, Supabase (Postgres + Auth + Storage), Resend (email). See [docs/DEVELOPER_GUIDE.md § Tech stack](./docs/DEVELOPER_GUIDE.md#2-tech-stack).

## Deploy

Production deployment is typically on [Vercel](https://vercel.com) with environment variables set in the project dashboard. Configure `CRON_SECRET` and your host’s cron or Vercel Cron for `/api/cron/transition-events` as described in the Developer Guide.
