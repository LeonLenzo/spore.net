#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUsers() {
  console.log('Checking users in database...\n');

  const { data: users, error } = await supabase
    .from('users')
    .select('*');

  if (error) {
    console.error('Error fetching users:', error);
    return;
  }

  if (!users || users.length === 0) {
    console.log('❌ No users found in database!');
    console.log('\nYou need to create users. Run this SQL in Supabase:\n');
    console.log(`INSERT INTO users (email, password_hash, role, full_name, is_active) VALUES
('admin@spore.local', 'admin123', 'admin', 'Admin User', true),
('sampler@test.com', 'sampler123', 'sampler', 'Field Sampler', true),
('viewer@test.com', 'viewer123', 'viewer', 'Map Viewer', true);`);
  } else {
    console.log(`✅ Found ${users.length} user(s):\n`);
    users.forEach(user => {
      console.log(`  Email: ${user.email}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Password Hash: ${user.password_hash}`);
      console.log(`  Active: ${user.is_active}`);
      console.log('');
    });
  }
}

checkUsers();
