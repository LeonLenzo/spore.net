#!/bin/bash

# Schema deployment script using Supabase CLI
# Usage: ./scripts/deploy.sh [--dry-run]

set -e

DRY_RUN=false
if [[ "$1" == "--dry-run" ]]; then
    DRY_RUN=true
    echo "🏃‍♂️ DRY RUN MODE - No changes will be applied"
fi

echo "🚀 Starting schema deployment..."

# Load environment variables from .env.local if it exists
if [[ -f ".env.local" ]]; then
    echo "📋 Loading environment variables from .env.local"
    set -a  # automatically export all variables
    source .env.local
    set +a  # stop auto-exporting
fi

# Check if we have the necessary environment variables
if [[ -z "$NEXT_PUBLIC_SUPABASE_URL" ]] || [[ -z "$SUPABASE_SERVICE_ROLE_KEY" ]]; then
    echo "❌ Missing environment variables"
    echo "Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local"
    exit 1
fi

# Extract project ref from URL
PROJECT_REF=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed 's/https:\/\/\([^.]*\).*/\1/')
echo "📍 Project: $PROJECT_REF"

# Apply migrations
MIGRATIONS_DIR="supabase/migrations"

if [[ ! -d "$MIGRATIONS_DIR" ]]; then
    echo "📁 No migrations directory found"
    exit 0
fi

# Get list of migration files
MIGRATIONS=($(ls $MIGRATIONS_DIR/*.sql 2>/dev/null | sort))

if [[ ${#MIGRATIONS[@]} -eq 0 ]]; then
    echo "📝 No migrations found"
    exit 0
fi

echo "📋 Found ${#MIGRATIONS[@]} migration(s)"

# Apply each migration
for migration in "${MIGRATIONS[@]}"; do
    filename=$(basename "$migration")
    echo "📄 Processing: $filename"

    if [[ "$DRY_RUN" == "true" ]]; then
        echo "🏃‍♂️ DRY RUN - Would apply migration: $filename"
        echo "Preview (first 5 lines):"
        head -5 "$migration" | sed 's/^/  /'
        echo "  ..."
    else
        echo "⚡ Applying migration: $filename"

        # Use psql to apply the migration directly
        # Extract connection details from Supabase URL
        DB_URL="postgresql://postgres:$SUPABASE_SERVICE_ROLE_KEY@db.$PROJECT_REF.supabase.co:6543/postgres"

        if command -v psql >/dev/null 2>&1; then
            psql "$DB_URL" -f "$migration"
            echo "✅ Applied: $filename"
        else
            echo "❌ psql not found. Please install PostgreSQL client tools"
            echo "Alternative: Copy the SQL from $migration and run it in your Supabase SQL editor"
            exit 1
        fi
    fi
done

if [[ "$DRY_RUN" == "false" ]]; then
    echo "🎉 Schema deployment completed successfully!"
else
    echo "🏃‍♂️ DRY RUN completed - no changes were made"
fi