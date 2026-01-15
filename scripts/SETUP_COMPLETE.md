# Database Sync Setup - Completion Guide

## ✅ What's Already Done

Your project has been configured with:

- ✅ Project URL: `https://kspxkutlzffluzcvchpf.supabase.co`
- ✅ Project Ref: `kspxkutlzffluzcvchpf`
- ✅ Anon Key: Configured in `.env.local`
- ✅ Sync scripts: Created and ready to use
- ✅ Package.json scripts: Added database sync commands

## 🔧 What You Need to Complete

### 1. Install Supabase CLI

Choose one method:

**Option A: Homebrew (Recommended, but requires updated Command Line Tools)**

```bash
# First update Command Line Tools if needed:
sudo rm -rf /Library/Developer/CommandLineTools
sudo xcode-select --install

# Then install Supabase CLI:
brew install supabase/tap/supabase
```

**Option B: Direct Download**

```bash
# Download from: https://github.com/supabase/cli/releases
# Or use the install script:
curl -fsSL https://supabase.com/install.sh | sh
```

**Option C: Using npx (for one-time use)**

```bash
# You can use npx for commands without installing:
npx supabase@latest <command>
```

### 2. Get Database Connection String

1. Go to: https://supabase.com/dashboard/project/kspxkutlzffluzcvchpf/settings/database
2. Scroll to "Connection string" section
3. Copy the "URI" connection string
4. It should look like:
   ```
   postgresql://postgres.kspxkutlzffluzcvchpf:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```
5. Add it to `.env.local`:
   ```env
   REMOTE_DB_URL=postgresql://postgres.kspxkutlzffluzcvchpf:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```

**Note:** Replace `[YOUR-PASSWORD]` with your database password (found in the same settings page).

### 3. Get Service Role Key

1. Go to: https://supabase.com/dashboard/project/kspxkutlzffluzcvchpf/settings/api
2. Find the "service_role" key (⚠️ Keep this secret!)
3. Copy it
4. Add it to `.env.local`:
   ```env
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

### 4. Link Your Project (Optional but Recommended)

Once Supabase CLI is installed:

```bash
cd /Users/arash/Desktop/event-planner/event-planner-app
supabase link --project-ref kspxkutlzffluzcvchpf
```

This will:

- Link your local project to the remote project
- Enable `supabase db push/pull` commands
- Store connection details locally

### 5. Start Local Supabase (For Local Development)

```bash
supabase start
```

This will:

- Start a local PostgreSQL database
- Start Supabase services locally
- Show you connection details (save these to `.env.local` if needed)

After running `supabase start`, you'll see output like:

```
API URL: http://localhost:54321
DB URL: postgresql://postgres:postgres@localhost:54322/postgres
Studio URL: http://localhost:54323
anon key: ...
service_role key: ...
```

Add the local keys to `.env.local`:

```env
LOCAL_SUPABASE_ANON_KEY=...
LOCAL_SUPABASE_SERVICE_ROLE_KEY=...
```

## 🚀 Quick Test

Once everything is set up, test the sync:

```bash
# 1. Make sure local Supabase is running
supabase start

# 2. Pull data from remote (this will ask for confirmation if REMOTE_DB_URL is set)
npm run db:sync:pull
```

## 📋 Complete .env.local Template

Your `.env.local` should look like this:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://kspxkutlzffluzcvchpf.supabase.co
NEXT_PUBLIC_SUPABASE_PROJECT_REF=kspxkutlzffluzcvchpf
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzcHhrdXRsemZmbHV6Y3ZjaHBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNjU0NjYsImV4cCI6MjA4MjY0MTQ2Nn0.J8DXOp_20PdXVlPbaIVXN4TdZ0DLZlHHtSZZw1cMg9U

# Database Sync Configuration
REMOTE_DB_URL=postgresql://postgres.kspxkutlzffluzcvchpf:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
SUPABASE_SERVICE_ROLE_KEY=[YOUR-SERVICE-ROLE-KEY]

# Local Supabase (populated after running: supabase start)
LOCAL_SUPABASE_URL=http://localhost:54321
LOCAL_DB_URL=postgresql://postgres:postgres@localhost:54322/postgres
LOCAL_SUPABASE_ANON_KEY=[FROM: supabase start]
LOCAL_SUPABASE_SERVICE_ROLE_KEY=[FROM: supabase start]
```

## 🎯 Next Steps After Setup

1. **Start local development:**

   ```bash
   supabase start
   npm run dev
   ```

2. **Pull latest data:**

   ```bash
   npm run db:sync:pull
   ```

3. **Work locally, then push changes:**
   ```bash
   npm run db:sync:push
   ```

## 📚 Useful Commands

| Command                                            | Description             |
| -------------------------------------------------- | ----------------------- |
| `supabase start`                                   | Start local Supabase    |
| `supabase stop`                                    | Stop local Supabase     |
| `supabase status`                                  | Show connection details |
| `supabase link --project-ref kspxkutlzffluzcvchpf` | Link to remote project  |
| `npm run db:pull`                                  | Pull schema from remote |
| `npm run db:push`                                  | Push schema to remote   |
| `npm run db:sync:pull`                             | Pull data from remote   |
| `npm run db:sync:push`                             | Push data to remote     |
| `npm run db:reset`                                 | Reset local database    |

## 🔗 Quick Links

- **Dashboard:** https://supabase.com/dashboard/project/kspxkutlzffluzcvchpf
- **Database Settings:** https://supabase.com/dashboard/project/kspxkutlzffluzcvchpf/settings/database
- **API Settings:** https://supabase.com/dashboard/project/kspxkutlzffluzcvchpf/settings/api
- **Studio (Local):** http://localhost:54323 (after `supabase start`)

## ❓ Troubleshooting

**"REMOTE_DB_URL not set"**
→ Make sure you've added the connection string from Database Settings

**"Failed to connect to remote database"**
→ Check your database password is correct
→ Verify your IP is whitelisted (or use connection pooling)

**"Supabase CLI not found"**
→ Install using one of the methods above
→ Or use `npx supabase@latest` instead of `supabase`

**"Command Line Tools too outdated"**
→ Run: `sudo xcode-select --install`
→ Or download from: https://developer.apple.com/download/all/
