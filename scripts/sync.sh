#!/bin/bash

# =============================================
# Database Sync Script
# =============================================
# Syncs data between local and remote Supabase databases
# Uses pg_dump and psql for reliable data transfer
# =============================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables from .env.local if it exists
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
fi

# Database connection strings
LOCAL_DB_URL="${LOCAL_DB_URL:-postgresql://postgres:postgres@localhost:54322/postgres}"
REMOTE_DB_URL="${REMOTE_DB_URL}"

# Check if REMOTE_DB_URL is set
if [ -z "$REMOTE_DB_URL" ]; then
  echo -e "${RED}❌ Error: REMOTE_DB_URL not set${NC}"
  echo ""
  echo "Please set REMOTE_DB_URL in .env.local:"
  echo "  REMOTE_DB_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"
  echo ""
  echo "You can get this from:"
  echo "  1. Supabase Dashboard → Project Settings → Database → Connection string"
  echo "  2. Or run: supabase status (if linked)"
  exit 1
fi

# Get direction from command line argument
DIRECTION="${1:-}"

# Function to sync from remote to local
sync_from_remote() {
  echo -e "${BLUE}📥 Pulling data from remote to local...${NC}"
  echo ""
  
  # Create a temporary file for the dump
  TEMP_DUMP=$(mktemp)
  
  # Dump data only (no schema) from remote
  echo -e "${YELLOW}  → Exporting data from remote database...${NC}"
  if ! pg_dump \
    --data-only \
    --column-inserts \
    --no-owner \
    --no-privileges \
    "$REMOTE_DB_URL" > "$TEMP_DUMP" 2>/dev/null; then
    echo -e "${RED}❌ Failed to export from remote database${NC}"
    echo "   Check your REMOTE_DB_URL connection string"
    rm -f "$TEMP_DUMP"
    exit 1
  fi
  
  # Restore to local
  echo -e "${YELLOW}  → Importing data to local database...${NC}"
  if ! psql "$LOCAL_DB_URL" < "$TEMP_DUMP" > /dev/null 2>&1; then
    echo -e "${RED}❌ Failed to import to local database${NC}"
    echo "   Make sure local Supabase is running: supabase start"
    rm -f "$TEMP_DUMP"
    exit 1
  fi
  
  # Cleanup
  rm -f "$TEMP_DUMP"
  
  echo -e "${GREEN}✅ Successfully pulled data from remote to local${NC}"
}

# Function to sync from local to remote
sync_to_remote() {
  echo -e "${BLUE}📤 Pushing data from local to remote...${NC}"
  echo ""
  echo -e "${YELLOW}⚠️  Warning: This will overwrite remote data!${NC}"
  echo ""
  read -p "Are you sure you want to continue? (yes/no): " confirm
  
  if [ "$confirm" != "yes" ]; then
    echo -e "${YELLOW}Cancelled${NC}"
    exit 0
  fi
  
  # Create a temporary file for the dump
  TEMP_DUMP=$(mktemp)
  
  # Dump data only (no schema) from local
  echo -e "${YELLOW}  → Exporting data from local database...${NC}"
  if ! pg_dump \
    --data-only \
    --column-inserts \
    --no-owner \
    --no-privileges \
    "$LOCAL_DB_URL" > "$TEMP_DUMP" 2>/dev/null; then
    echo -e "${RED}❌ Failed to export from local database${NC}"
    echo "   Make sure local Supabase is running: supabase start"
    rm -f "$TEMP_DUMP"
    exit 1
  fi
  
  # Restore to remote
  echo -e "${YELLOW}  → Importing data to remote database...${NC}"
  if ! psql "$REMOTE_DB_URL" < "$TEMP_DUMP" > /dev/null 2>&1; then
    echo -e "${RED}❌ Failed to import to remote database${NC}"
    echo "   Check your REMOTE_DB_URL connection string"
    rm -f "$TEMP_DUMP"
    exit 1
  fi
  
  # Cleanup
  rm -f "$TEMP_DUMP"
  
  echo -e "${GREEN}✅ Successfully pushed data from local to remote${NC}"
}

# Main script logic
case "$DIRECTION" in
  pull|from-remote)
    sync_from_remote
    ;;
  push|to-remote)
    sync_to_remote
    ;;
  *)
    echo -e "${YELLOW}Database Sync Script${NC}"
    echo ""
    echo "Usage:"
    echo "  npm run db:sync:pull    # Pull data from remote to local"
    echo "  npm run db:sync:push    # Push data from local to remote"
    echo ""
    echo "Or directly:"
    echo "  ./scripts/sync.sh pull  # Pull data from remote to local"
    echo "  ./scripts/sync.sh push  # Push data from local to remote"
    exit 1
    ;;
esac
