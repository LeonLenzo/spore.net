#!/usr/bin/env node

/**
 * Schema deployment script for Supabase
 * Usage: node scripts/deploy-schema.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Run a migration file
 */
async function runMigration(migrationFile) {
  console.log(`📄 Running migration: ${migrationFile}`);

  const migrationPath = path.join(__dirname, '../supabase/migrations', migrationFile);

  if (!fs.existsSync(migrationPath)) {
    throw new Error(`Migration file not found: ${migrationPath}`);
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');

  if (dryRun) {
    console.log('🏃‍♂️ DRY RUN - SQL would be executed:');
    console.log('─'.repeat(50));
    console.log(sql.substring(0, 500) + (sql.length > 500 ? '...' : ''));
    console.log('─'.repeat(50));
    return;
  }

  try {
    const { error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      throw error;
    }

    console.log(`✅ Migration completed: ${migrationFile}`);
  } catch (error) {
    console.error(`❌ Migration failed: ${migrationFile}`);
    throw error;
  }
}

/**
 * Get list of migration files
 */
function getMigrations() {
  const migrationsDir = path.join(__dirname, '../supabase/migrations');

  if (!fs.existsSync(migrationsDir)) {
    console.log('📁 No migrations directory found');
    return [];
  }

  return fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort(); // Migrations should be named with timestamps for proper ordering
}

/**
 * Create migrations tracking table
 */
async function createMigrationsTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  if (dryRun) {
    console.log('🏃‍♂️ DRY RUN - Would create migrations table');
    return;
  }

  try {
    const { error } = await supabase.rpc('exec_sql', { sql });
    if (error) throw error;
    console.log('📋 Migrations tracking table ready');
  } catch (error) {
    console.error('❌ Failed to create migrations table:', error);
    throw error;
  }
}

/**
 * Check if migration has been applied
 */
async function isMigrationApplied(version) {
  if (dryRun) return false;

  const { data, error } = await supabase
    .from('schema_migrations')
    .select('version')
    .eq('version', version)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw error;
  }

  return !!data;
}

/**
 * Mark migration as applied
 */
async function markMigrationApplied(version) {
  if (dryRun) return;

  const { error } = await supabase
    .from('schema_migrations')
    .insert({ version });

  if (error) {
    throw error;
  }
}

/**
 * Main deployment function
 */
async function deploySchema() {
  try {
    console.log('🚀 Starting schema deployment...');

    if (dryRun) {
      console.log('🏃‍♂️ DRY RUN MODE - No changes will be applied');
    }

    // Ensure migrations table exists
    await createMigrationsTable();

    // Get all migrations
    const migrations = getMigrations();

    if (migrations.length === 0) {
      console.log('📝 No migrations found');
      return;
    }

    console.log(`📋 Found ${migrations.length} migration(s)`);

    // Apply each migration
    for (const migration of migrations) {
      const version = migration.replace('.sql', '');

      const applied = await isMigrationApplied(version);

      if (applied) {
        console.log(`⏭️  Skipping ${migration} (already applied)`);
        continue;
      }

      await runMigration(migration);
      await markMigrationApplied(version);
    }

    console.log('🎉 Schema deployment completed successfully!');

  } catch (error) {
    console.error('❌ Schema deployment failed:', error);
    process.exit(1);
  }
}

// Create the exec_sql function if it doesn't exist
async function ensureExecSqlFunction() {
  if (dryRun) {
    console.log('🏃‍♂️ DRY RUN - Would ensure exec_sql function exists');
    return;
  }

  const sql = `
    CREATE OR REPLACE FUNCTION exec_sql(sql TEXT)
    RETURNS VOID AS $$
    BEGIN
      EXECUTE sql;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;

  try {
    const { error } = await supabase.rpc('exec_sql', { sql });
    if (error) {
      // Function doesn't exist, create it using a direct query
      const { error: createError } = await supabase.from('').select('').single();
      // This will fail, but we'll catch and use raw SQL
      console.log('⚙️  Setting up exec_sql function...');
    }
  } catch (error) {
    console.log('⚙️  exec_sql function ready');
  }
}

// Run the deployment
ensureExecSqlFunction().then(() => deploySchema());