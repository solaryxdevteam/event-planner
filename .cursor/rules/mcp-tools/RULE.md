---
description: Guidelines for using MCP (Model Context Protocol) tools for database operations, Next.js development, component management, and browser automation
alwaysApply: true
---

# MCP Tools Usage Guidelines

## Overview

MCP (Model Context Protocol) tools provide direct access to external services and development tools. Use these tools to interact with Supabase, Next.js dev server, shadcn/ui components, and browser automation.

## Supabase MCP Tools

### When to Use Supabase MCP Tools

✅ **Use for:**
- Database schema inspection (`list_tables`, `list_migrations`)
- Executing SQL queries for debugging (`execute_sql`)
- Applying database migrations (`apply_migration`)
- Checking security advisors (`get_advisors`)
- Viewing logs for debugging (`get_logs`)
- Generating TypeScript types (`generate_typescript_types`)
- Managing Edge Functions
- Storage bucket operations

❌ **Don't use for:**
- Production data modifications (use migrations instead)
- Bypassing the application's data access layer
- Direct queries in application code (use DAL functions)

### Database Operations

**Schema Inspection:**
```typescript
// Use MCP tools to inspect database structure
// Example: Check available tables
mcp_supabase_list_tables({ schemas: ["public"] })
```

**Executing SQL (Debugging Only):**
```typescript
// Use for one-off queries during development
// Example: Check user count
mcp_supabase_execute_sql({ 
  query: "SELECT COUNT(*) FROM users WHERE role = 'admin'" 
})
```

**Applying Migrations:**
```typescript
// Use for creating/modifying database schema
// Example: Add a new column
mcp_supabase_apply_migration({
  name: "add_user_preferences",
  query: "ALTER TABLE users ADD COLUMN preferences JSONB DEFAULT '{}'"
})
```

**Security & Performance Checks:**
```typescript
// Regularly check for security issues
mcp_supabase_get_advisors({ type: "security" })
mcp_supabase_get_advisors({ type: "performance" })
```

### Application Code vs MCP Tools

**In Application Code (DAL Layer):**
```typescript
// File: /lib/data-access/users.dal.ts
// Use Supabase client, NOT MCP tools
import { createClient } from "@/lib/supabase/server";

export async function findAll() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .select("*");
  
  if (error) throw error;
  return data;
}
```

**For Development/Debugging (MCP Tools):**
```typescript
// Use MCP tools in development to:
// - Inspect database state
// - Test queries
// - Check migrations
// - View logs
```

## Next.js DevTools MCP Tools

### When to Use Next.js DevTools

✅ **Use for:**
- Discovering running Next.js dev servers (`nextjs_index`)
- Getting compilation/runtime errors (`nextjs_call` with error tools)
- Listing available routes (`nextjs_call` with route tools)
- Checking build status
- Clearing caches
- Upgrading Next.js versions (`upgrade_nextjs_16`)
- Enabling Cache Components (`enable_cache_components`)
- Fetching Next.js documentation (`nextjs_docs`)

### Discovering Dev Server

**Always start with discovery:**
```typescript
// Discover running Next.js servers
mcp_next-devtools_nextjs_index()
// Returns: server info, available tools, port numbers
```

**If auto-discovery fails:**
```typescript
// Ask user for port, then:
mcp_next-devtools_nextjs_index({ port: "3000" })
```

### Getting Errors & Diagnostics

**Check for compilation/runtime errors:**
```typescript
// After discovering server on port 3000
mcp_next-devtools_nextjs_call({
  port: "3000",
  toolName: "get_errors"
})
```

**List all routes:**
```typescript
mcp_next-devtools_nextjs_call({
  port: "3000",
  toolName: "list_routes"
})
```

### Next.js Documentation

**Always use MCP docs tool for Next.js questions:**
```typescript
// 1. First, read the index
// Resource: nextjs-docs://llms-index

// 2. Then fetch specific documentation
mcp_next-devtools_nextjs_docs({
  path: "/docs/app/api-reference/functions/refresh"
})
```

**Rule:** For ANY Next.js-related question, use `nextjs_docs` instead of relying on training data.

### Cache Components Migration

**When migrating to Cache Components:**
```typescript
// Use the automated migration tool
mcp_next-devtools_enable_cache_components({
  project_path: "/path/to/project"
})
```

This tool:
- Updates Next.js config
- Starts dev server
- Detects errors via browser automation
- Automatically fixes issues
- Validates all routes

## Browser Automation (Playwright)

### When to Use Browser Automation

✅ **Use for:**
- Verifying pages actually render (not just HTTP status)
- Testing user interactions
- Capturing screenshots for debugging
- Checking console errors in browser
- Testing form submissions
- Verifying client-side JavaScript execution

❌ **Don't use for:**
- Simple HTTP status checks (use curl/HTTP tools)
- API endpoint testing (use direct HTTP calls)

### Browser Automation Workflow

**Start browser:**
```typescript
mcp_next-devtools_browser_eval({
  action: "start",
  browser: "chrome",
  headless: true
})
```

**Navigate and verify:**
```typescript
mcp_next-devtools_browser_eval({
  action: "navigate",
  url: "http://localhost:3000/events"
})

mcp_next-devtools_browser_eval({
  action: "screenshot",
  fullPage: true
})

mcp_next-devtools_browser_eval({
  action: "console_messages",
  errorsOnly: true
})
```

**For Next.js projects:** Prefer `nextjs_index` and `nextjs_call` for error detection over browser console messages when available.

## shadcn/ui MCP Tools

### When to Use shadcn MCP Tools

✅ **Use for:**
- Searching for components (`search_items_in_registries`)
- Viewing component details (`view_items_in_registries`)
- Getting usage examples (`get_item_examples_from_registries`)
- Getting add commands (`get_add_command_for_items`)
- Listing available components

### Component Discovery

**Search for components:**
```typescript
mcp_shadcn_search_items_in_registries({
  registries: ["@shadcn"],
  query: "dialog form"
})
```

**View component details:**
```typescript
mcp_shadcn_view_items_in_registries({
  items: ["@shadcn/dialog", "@shadcn/form"]
})
```

**Get usage examples:**
```typescript
mcp_shadcn_get_item_examples_from_registries({
  registries: ["@shadcn"],
  query: "dialog-demo"
})
```

**Get add command:**
```typescript
mcp_shadcn_get_add_command_for_items({
  items: ["@shadcn/dialog", "@shadcn/form"]
})
// Returns: npx shadcn@latest add dialog form
```

## Best Practices

### General MCP Tool Usage

✅ **Do:**
- Use MCP tools for development, debugging, and inspection
- Use MCP tools to understand current state before making changes
- Use Supabase MCP for database operations during development
- Use Next.js DevTools to check errors before and after changes
- Use browser automation to verify pages actually work
- Use shadcn MCP to discover and add components

❌ **Don't:**
- Use MCP tools in production application code
- Bypass the application's architecture layers with MCP tools
- Use MCP tools for regular application operations (use DAL/Service layers)
- Skip error checking with Next.js DevTools after making changes

### Workflow Patterns

**Before Making Changes:**
1. Use `nextjs_index` to discover dev server
2. Use `nextjs_call` to check current errors
3. Use `mcp_supabase_list_tables` to understand schema
4. Use `mcp_supabase_get_advisors` to check for issues

**After Making Changes:**
1. Use `nextjs_call` to verify no new errors
2. Use browser automation to test affected pages
3. Use `mcp_supabase_get_logs` if database issues occur
4. Use `mcp_supabase_get_advisors` to ensure no security regressions

**When Adding Components:**
1. Use `mcp_shadcn_search_items_in_registries` to find components
2. Use `mcp_shadcn_get_item_examples_from_registries` for examples
3. Use `mcp_shadcn_get_add_command_for_items` to get install command
4. Run the command to add component

**When Working with Database:**
1. Use `mcp_supabase_list_migrations` to see migration history
2. Use `mcp_supabase_apply_migration` for schema changes
3. Use `mcp_supabase_generate_typescript_types` to update types
4. Use `mcp_supabase_get_advisors` to verify security

## Error Handling

**MCP tools may fail if:**
- Services are not running (Next.js dev server, Supabase)
- Authentication is required but not configured
- Network connectivity issues
- Invalid parameters provided

**Always:**
- Check if services are running before using MCP tools
- Provide clear error messages if MCP tools fail
- Fall back to manual methods if MCP tools are unavailable
- Verify MCP tool results match expected behavior

## Security Considerations

**Supabase MCP:**
- Never expose service role keys
- Use MCP tools only in development environment
- Review `get_advisors` security warnings immediately
- Don't execute untrusted SQL queries

**Next.js DevTools:**
- Only works with local dev servers
- No security concerns for local development

**Browser Automation:**
- Only automates local browsers
- No security concerns for local development

## Integration with Architecture

**MCP tools complement, not replace, the 3-layer architecture:**

```
Development/Debugging (MCP Tools)
    ↓ (inspecting, testing, verifying)
Application Code (3-Layer Architecture)
    ↓ (DAL → Service → Entry Points)
Database/External Services
```

**Remember:**
- MCP tools = Development and debugging
- Application code = Production operations
- Never mix: Don't call MCP tools from application code
