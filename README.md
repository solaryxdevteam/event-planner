This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Supabase CLI installed (`brew install supabase/tap/supabase` or `npm install -g supabase`)
- Docker Desktop running (required for local Supabase)

### Initial Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Set up environment variables:**

   ```bash
   cp .env.example .env.local
   ```

   Then edit `.env.local` with your Supabase credentials.

3. **Start local Supabase:**

   ```bash
   supabase start
   ```

4. **Link to remote project (optional, for sync):**

   ```bash
   npm run db:link <your-project-ref>
   ```

5. **Run the development server:**
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Database Management

This project uses Supabase for database management. See [scripts/README.md](./scripts/README.md) for detailed database sync instructions.

### Quick Commands

**Schema Management:**

```bash
npm run db:pull    # Pull schema from remote
npm run db:push    # Push schema to remote
npm run db:reset   # Reset local database
```

**Data Synchronization:**

```bash
npm run db:sync:pull  # Pull data from remote to local
npm run db:sync:push  # Push data from local to remote
```

**Status:**

```bash
npm run db:status  # Check Supabase status and connection details
```

For more details, see [scripts/README.md](./scripts/README.md).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
