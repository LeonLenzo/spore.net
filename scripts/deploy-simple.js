#!/usr/bin/env node

/**
 * Simple schema deployment using direct SQL execution
 * Usage: node scripts/deploy-simple.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing environment variables');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

async function executeSql(sql) {
  if (dryRun) {
    console.log('🏃‍♂️ DRY RUN - SQL would be executed:');
    console.log('─'.repeat(50));
    console.log(sql.substring(0, 500) + (sql.length > 500 ? '...' : ''));
    console.log('─'.repeat(50));
    return;
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey
      },
      body: JSON.stringify({ sql })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    console.log('✅ SQL executed successfully');
  } catch (error) {
    console.error('❌ SQL execution failed:', error.message);
    throw error;
  }
}

async function deploySchema() {
  try {
    console.log('🚀 Starting schema deployment...');

    if (dryRun) {
      console.log('🏃‍♂️ DRY RUN MODE - No changes will be applied');
    }

    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20250101000000_initial_schema.sql');

    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Executing initial schema migration...');
    await executeSql(sql);

    if (!dryRun) {
      console.log('🎉 Schema deployment completed successfully!');
      console.log('');
      console.log('✅ Next steps:');
      console.log('1. Check your Supabase dashboard - you should see the new tables');
      console.log('2. Test data ingestion: npm run data:ingest:dry -- --file ../dummy_data.csv');
      console.log('3. Load real data: npm run data:ingest -- --file ../dummy_data.csv');
    }

  } catch (error) {
    console.error('❌ Schema deployment failed:', error.message);
    process.exit(1);
  }
}

deploySchema();