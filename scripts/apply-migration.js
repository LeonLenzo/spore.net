#!/usr/bin/env node

/**
 * Apply migration to remote Supabase database
 * This script reads the migration file and executes it using the service role key
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase configuration in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('Reading migration file...');

  const migrationPath = './supabase/migrations/20260204_user_roles_auth.sql';
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('Applying migration to remote database...\n');

  // Split into individual statements and execute them
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';

    // Skip comments
    if (statement.startsWith('--')) continue;

    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement });

      if (error) {
        // Try direct query if RPC doesn't exist
        const result = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ query: statement })
        });

        if (!result.ok) {
          const errorText = await result.text();

          // Ignore "already exists" errors for idempotency
          if (errorText.includes('already exists') || errorText.includes('SQLSTATE 42P07')) {
            console.log(`⚠️  Skipped (already exists): ${statement.substring(0, 50)}...`);
            successCount++;
            continue;
          }

          console.error(`❌ Error executing statement ${i + 1}:`);
          console.error(errorText);
          console.error(`Statement: ${statement.substring(0, 100)}...\n`);
          errorCount++;
        } else {
          console.log(`✅ Statement ${i + 1}/${statements.length} executed`);
          successCount++;
        }
      } else {
        console.log(`✅ Statement ${i + 1}/${statements.length} executed`);
        successCount++;
      }
    } catch (err) {
      console.error(`❌ Error executing statement ${i + 1}:`, err.message);
      console.error(`Statement: ${statement.substring(0, 100)}...\n`);
      errorCount++;
    }
  }

  console.log(`\n📊 Migration Summary:`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);

  if (errorCount === 0) {
    console.log('\n🎉 Migration completed successfully!');
    console.log('\n⚠️  IMPORTANT: The default admin password is NOT secure.');
    console.log('   Please update user passwords before production use.\n');
  } else {
    console.log('\n⚠️  Migration completed with errors. Please review above.');
  }
}

// Manual approach: Use SQL editor
console.log('==========================================');
console.log('MIGRATION SCRIPT');
console.log('==========================================\n');
console.log('📝 Note: Supabase client library cannot execute DDL statements directly.');
console.log('   You have two options:\n');
console.log('Option 1 (Recommended): Use Supabase Dashboard');
console.log('   1. Go to: https://supabase.com/dashboard/project/iydrfitrsltqmxbewxsi/sql/new');
console.log('   2. Copy contents of: supabase/migrations/20260204_user_roles_auth.sql');
console.log('   3. Paste into SQL Editor');
console.log('   4. Click "Run"\n');
console.log('Option 2: Use psql directly');
console.log('   1. Get your database password from Supabase Dashboard');
console.log('   2. Run: npx supabase db remote commit');
console.log('   OR manually execute the SQL file\n');
console.log('==========================================\n');

const migrationPath = './supabase/migrations/20260204_user_roles_auth.sql';
const sql = fs.readFileSync(migrationPath, 'utf8');

console.log('📄 Migration SQL to copy:\n');
console.log('```sql');
console.log(sql);
console.log('```\n');
