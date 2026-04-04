# Documentation

Start here and drill into the guide that matches what you are doing.

| Guide                                   | Contents                                                                                                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Developer Guide](./DEVELOPER_GUIDE.md) | **Start here:** prerequisites, clone → install → `.env.local`, Supabase, repo layout, database, integrations (Resend, Storage, cron), scripts, full-stack workflow |
| [Backend Guide](./BACKEND_GUIDE.md)     | App Router API routes, auth helpers, Zod, services, DAL, errors, email, storage, audit, checklist for new backend features                                         |
| [Frontend Guide](./FRONTEND_GUIDE.md)   | App Router UI, React Query + `apiClient`, client services, hooks, forms, auth on the client, end-to-end feature steps                                              |
| [architecture.md](./architecture.md)    | Invitation-based auth, server actions vs route handlers (historical notes; cross-check with current code)                                                          |
| [db/README.md](../db/README.md)         | `schema.sql`, seeds, RLS, migrations, troubleshooting                                                                                                              |

**Suggested order for new contributors:** Developer Guide → skim Backend + Frontend guides → implement a small change with tests/lint.
