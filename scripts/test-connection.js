#!/usr/bin/env node

/**
 * Test Supabase connection
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Testing Supabase connection...');
console.log('📍 URL:', supabaseUrl);
console.log('🔑 Key:', supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'NOT SET');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('🔄 Testing basic connection...');

    // Try a simple query
    const { data, error } = await supabase
      .from('pathogen_species')
      .select('count', { count: 'exact', head: true });

    if (error) {
      console.log('⚠️  Table query failed (expected if schema not deployed yet):', error.message);

      // Try a more basic test
      console.log('🔄 Testing auth...');
      const { data: authData, error: authError } = await supabase.auth.getSession();

      if (authError) {
        console.error('❌ Auth test failed:', authError.message);
      } else {
        console.log('✅ Basic connection successful');
      }
    } else {
      console.log('✅ Database connection successful');
      console.log('📊 Query result:', data);
    }

  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();