# MCP Server Setup Guide

This guide will help you set up the recommended MCP (Model Context Protocol) servers for your Event Planner App development.

## Overview

MCP servers enable AI tools (like Cursor) to interact with external services and databases directly. We recommend setting up:

1. **Supabase MCP Server** - For database and authentication operations
2. **PostgreSQL MCP Server** - For complex query development
3. **Linear MCP Server** - For project management and issue tracking

---

## Prerequisites

- Cursor IDE installed
- Supabase project created (or access to one)
- PostgreSQL database access (via Supabase or standalone)
- Linear account (optional, for project management)

---

## Configuration Location

In Cursor, MCP servers are configured in your Cursor settings. The configuration file is typically located at:

**macOS/Linux:** `~/.cursor/mcp.json`  
**Windows:** `%APPDATA%\Cursor\mcp.json`

You can also access MCP settings through:
- Cursor Settings → Features → MCP Servers

### Quick Setup Script

We've provided a setup script to help you get started:

```bash
# Run the setup script
./scripts/setup-mcp.sh
```

This script will:
1. Detect your operating system
2. Create the MCP configuration file in the correct location
3. Copy the example configuration template
4. Provide next steps for filling in your credentials

---

## 1. Supabase MCP Server Setup

### Step 1: Get Supabase Credentials

1. Navigate to your Supabase project dashboard
2. Go to **Project Settings** → **API**
3. Copy the following:
   - Project URL
   - Anon/Public Key
   - Service Role Key (keep this secret!)

### Step 2: Configure in Cursor

Add the following to your MCP configuration:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server"
      ],
      "env": {
        "SUPABASE_URL": "your-project-url",
        "SUPABASE_ANON_KEY": "your-anon-key",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key"
      }
    }
  }
}
```

**Alternative (Remote Server):**

If using Supabase's hosted MCP server:

```json
{
  "mcpServers": {
    "supabase": {
      "url": "https://mcp.supabase.com/mcp"
    }
  }
}
```

### Step 3: Authentication

1. Restart Cursor
2. When prompted, log in to your Supabase account
3. Grant access to the MCP client
4. Select the organization containing your project

### Security Notes

⚠️ **Important Security Considerations:**

- Never commit your service role key to version control
- Use environment variables for sensitive keys
- Review Supabase's security guidelines: https://supabase.com/mcp
- Consider using the remote server option for better security

---

## 2. PostgreSQL MCP Server Setup

### Step 1: Install PostgreSQL MCP Server

The PostgreSQL MCP server allows direct database queries and schema operations.

### Step 2: Configure Connection

Add to your MCP configuration:

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres"
      ],
      "env": {
        "POSTGRES_CONNECTION_STRING": "postgresql://user:password@host:port/database"
      }
    }
  }
}
```

**For Supabase PostgreSQL:**

If using Supabase's PostgreSQL database, you can get the connection string from:
- Supabase Dashboard → Project Settings → Database → Connection String

Use the connection pooling string for better performance:
```
postgresql://postgres:[YOUR-PASSWORD]@[PROJECT-REF].supabase.co:6543/postgres?pgbouncer=true
```

### Step 3: Test Connection

1. Restart Cursor
2. The MCP server should automatically connect
3. Test by asking Cursor to query your database schema

---

## 3. Linear MCP Server Setup

### Step 1: Get Linear API Key

1. Go to Linear → Settings → API
2. Create a new Personal API Key
3. Copy the API key (you won't see it again!)

### Step 2: Configure in Cursor

Add to your MCP configuration:

```json
{
  "mcpServers": {
    "linear": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-linear"
      ],
      "env": {
        "LINEAR_API_KEY": "your-linear-api-key"
      }
    }
  }
}
```

### Step 3: Verify Setup

1. Restart Cursor
2. Test by asking Cursor to list your Linear issues or create a new issue

---

## Complete Configuration Example

Here's a complete `mcp.json` configuration file with all three servers:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server"
      ],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_ANON_KEY": "your-anon-key",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key"
      }
    },
    "postgres": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres"
      ],
      "env": {
        "POSTGRES_CONNECTION_STRING": "postgresql://postgres:password@db.your-project.supabase.co:5432/postgres"
      }
    },
    "linear": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-linear"
      ],
      "env": {
        "LINEAR_API_KEY": "your-linear-api-key"
      }
    }
  }
}
```

---

## Using Environment Variables (Recommended)

For better security, use environment variables instead of hardcoding values:

1. Create a `.env.mcp` file in your project root (add to `.gitignore`):

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# PostgreSQL
POSTGRES_CONNECTION_STRING=postgresql://user:password@host:port/database

# Linear
LINEAR_API_KEY=your-linear-api-key
```

2. Update your MCP configuration to reference environment variables:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server"],
      "env": {
        "SUPABASE_URL": "${SUPABASE_URL}",
        "SUPABASE_ANON_KEY": "${SUPABASE_ANON_KEY}",
        "SUPABASE_SERVICE_ROLE_KEY": "${SUPABASE_SERVICE_ROLE_KEY}"
      }
    }
  }
}
```

---

## Verification Steps

After setting up, verify each MCP server:

### Test Supabase MCP:
- Ask Cursor: "List all tables in my Supabase database"
- Ask Cursor: "Show me the schema for the events table"

### Test PostgreSQL MCP:
- Ask Cursor: "Query the users table and show me the first 5 rows"
- Ask Cursor: "What indexes exist on the events table?"

### Test Linear MCP:
- Ask Cursor: "List my open Linear issues"
- Ask Cursor: "Create a new Linear issue for testing database setup"

---

## Troubleshooting

### MCP Server Not Connecting

1. **Check Cursor Version**: Ensure you're using a recent version of Cursor that supports MCP
2. **Restart Cursor**: After configuration changes, always restart Cursor
3. **Check Logs**: View Cursor's MCP logs for error messages
4. **Verify Credentials**: Double-check all API keys and connection strings

### Supabase Connection Issues

- Verify your Supabase project is active
- Check that your API keys are correct
- Ensure your Supabase project allows MCP connections
- Try using the remote server option instead

### PostgreSQL Connection Issues

- Verify the connection string format
- Check that your database is accessible from your network
- For Supabase, ensure you're using the correct connection pooling string
- Verify database credentials are correct

### Linear Connection Issues

- Verify your API key is valid and not expired
- Check that your Linear workspace allows API access
- Ensure the API key has the necessary permissions

---

## Additional Resources

- [Supabase MCP Documentation](https://supabase.com/mcp)
- [Next.js MCP Guide](https://nextjs.org/docs/app/guides/mcp)
- [shadcn/ui MCP Documentation](https://ui.shadcn.com/docs/mcp)
- [Model Context Protocol Specification](https://modelcontextprotocol.io)

---

## Security Best Practices

1. **Never commit secrets**: Add `mcp.json` and `.env.mcp` to `.gitignore`
2. **Use environment variables**: Store sensitive values in environment variables
3. **Rotate keys regularly**: Periodically regenerate API keys
4. **Limit permissions**: Only grant necessary permissions to MCP servers
5. **Review access logs**: Regularly check Supabase and Linear access logs

---

**Last Updated:** January 8, 2026  
**Project:** Event Planner App
