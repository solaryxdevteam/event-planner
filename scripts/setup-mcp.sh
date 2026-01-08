#!/bin/bash

# MCP Server Setup Script for Event Planner App
# This script helps you set up MCP servers in Cursor

set -e

echo "🚀 MCP Server Setup for Event Planner App"
echo "=========================================="
echo ""

# Detect OS and set MCP config path
if [[ "$OSTYPE" == "darwin"* ]]; then
    MCP_CONFIG_PATH="$HOME/.cursor/mcp.json"
    echo "📍 Detected macOS"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    MCP_CONFIG_PATH="$HOME/.cursor/mcp.json"
    echo "📍 Detected Linux"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    MCP_CONFIG_PATH="$APPDATA/Cursor/mcp.json"
    echo "📍 Detected Windows"
else
    echo "❌ Unsupported OS: $OSTYPE"
    exit 1
fi

echo "📁 MCP Config Path: $MCP_CONFIG_PATH"
echo ""

# Check if config already exists
if [ -f "$MCP_CONFIG_PATH" ]; then
    echo "⚠️  MCP configuration already exists at: $MCP_CONFIG_PATH"
    read -p "Do you want to backup and overwrite? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        BACKUP_PATH="${MCP_CONFIG_PATH}.backup.$(date +%Y%m%d_%H%M%S)"
        cp "$MCP_CONFIG_PATH" "$BACKUP_PATH"
        echo "✅ Backup created: $BACKUP_PATH"
    else
        echo "❌ Setup cancelled. Please manually configure MCP servers."
        exit 0
    fi
fi

# Get project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXAMPLE_CONFIG="$PROJECT_ROOT/.mcp.json.example"

if [ ! -f "$EXAMPLE_CONFIG" ]; then
    echo "❌ Example config not found: $EXAMPLE_CONFIG"
    exit 1
fi

echo "📋 Copying example configuration..."
cp "$EXAMPLE_CONFIG" "$MCP_CONFIG_PATH"
echo "✅ Configuration file created at: $MCP_CONFIG_PATH"
echo ""

echo "🔧 Next Steps:"
echo "1. Open $MCP_CONFIG_PATH in your editor"
echo "2. Fill in your credentials:"
echo "   - Supabase URL and keys (from Supabase Dashboard → Settings → API)"
echo "   - PostgreSQL connection string (from Supabase Dashboard → Settings → Database)"
echo "   - Linear API key (from Linear → Settings → API)"
echo "3. Restart Cursor to activate MCP servers"
echo ""
echo "📖 For detailed instructions, see: docs/mcp-setup.md"
echo ""
echo "✅ Setup complete! Remember to restart Cursor after configuring credentials."
