#!/usr/bin/env node

/**
 * Direct schema deployment by executing SQL statements individually
 * This bypasses the need for exec_sql function
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🚀 Direct Schema Deployment');
console.log('📍 URL:', supabaseUrl);
console.log('');

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

// Split SQL into individual statements
function splitSqlStatements(sql) {
  // Remove comments and empty lines
  const lines = sql.split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('--'));

  const statements = [];
  let currentStatement = '';

  for (const line of lines) {
    currentStatement += line + '\n';

    // Check if this line ends a statement
    if (line.endsWith(';')) {
      statements.push(currentStatement.trim());
      currentStatement = '';
    }
  }

  return statements.filter(stmt => stmt.length > 1);
}

async function executeStatement(statement, index, total) {
  try {
    console.log(`⚡ [${index + 1}/${total}] Executing statement...`);

    // For CREATE TYPE, CREATE TABLE, etc. we can use the direct database connection
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sql',
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
        'Accept': 'application/json'
      },
      body: statement
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Statement ${index + 1} failed:`, error);
      console.error(`Statement was: ${statement.substring(0, 100)}...`);
      return false;
    }

    console.log(`✅ [${index + 1}/${total}] Success`);
    return true;
  } catch (error) {
    console.error(`❌ Statement ${index + 1} failed:`, error.message);
    return false;
  }
}

async function deploySchema() {
  try {
    console.log('📄 Reading migration file...');

    const migrationPath = path.join(__dirname, '../supabase/migrations/20250101000000_initial_schema.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('🔪 Splitting SQL into statements...');
    const statements = splitSqlStatements(sql);
    console.log(`📋 Found ${statements.length} SQL statements`);

    console.log('');
    console.log('⚠️  MANUAL DEPLOYMENT RECOMMENDED');
    console.log('');
    console.log('Due to API limitations, the easiest way is to:');
    console.log('1. Go to https://supabase.com/dashboard/project/rrziguogaivzuxdlxffpb');
    console.log('2. Click "SQL Editor" in the left sidebar');
    console.log('3. Copy the entire migration file content');
    console.log('4. Paste and click "Run"');
    console.log('');
    console.log('Migration file location:');
    console.log(`   ${migrationPath}`);
    console.log('');

    // Show first few statements as preview
    console.log('Preview of statements to execute:');
    statements.slice(0, 3).forEach((stmt, i) => {
      console.log(`${i + 1}. ${stmt.substring(0, 80)}...`);
    });

    if (statements.length > 3) {
      console.log(`... and ${statements.length - 3} more statements`);
    }

  } catch (error) {
    console.error('❌ Failed to read migration:', error.message);
  }
}

deploySchema();