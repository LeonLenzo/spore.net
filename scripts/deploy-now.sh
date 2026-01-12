#!/bin/bash

# Simple deployment script that copies SQL to clipboard for manual execution
# Usage: ./scripts/deploy-now.sh

echo "🚀 Schema Deployment Helper"
echo ""

MIGRATION_FILE="supabase/migrations/20250101000000_initial_schema.sql"

if [[ ! -f "$MIGRATION_FILE" ]]; then
    echo "❌ Migration file not found: $MIGRATION_FILE"
    exit 1
fi

echo "📄 Schema is ready to deploy!"
echo ""
echo "📋 To deploy your schema:"
echo "1. Go to: https://supabase.com/dashboard/project/rrziguogaivzuxdlxffpb"
echo "2. Click 'SQL Editor' in the left sidebar"
echo "3. Copy the SQL below and paste it in the editor"
echo "4. Click 'Run' to execute"
echo ""
echo "🔗 Direct link: https://supabase.com/dashboard/project/rrziguogaivzuxdlxffpb/sql/new"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "📄 SQL TO COPY AND PASTE:"
echo "═══════════════════════════════════════════════════════════════"
echo ""
cat "$MIGRATION_FILE"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "✅ After running the SQL, you should see these tables in your database:"
echo "   • organizations"
echo "   • sampling_routes  "
echo "   • pathogen_species"
echo "   • pathogen_detections"
echo "   • pathogen_data_view (view)"
echo ""
echo "🔄 Next step: Test data ingestion"
echo "   npm run data:ingest:dry -- --file ../dummy_data.csv"