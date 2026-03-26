// test-supabase.js
// Quick test to verify Supabase connection and data access

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function testConnection() {
  try {
    console.log('🔍 Testing Supabase connection...');

    // Test 1: Basic connection (select from staff table)
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .limit(3);

    if (staffError) {
      console.error('❌ Staff query failed:', staffError.message);
      return false;
    }

    console.log('✅ Staff table accessible:', staff.length, 'records found');
    if (staff.length > 0) {
      console.log('   Sample:', staff[0]);
    }

    // Test 2: Check services table
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .limit(1);

    if (servicesError) {
      console.error('❌ Services query failed:', servicesError.message);
      return false;
    }

    console.log('✅ Services table accessible:', services.length, 'records found');

    // Test 3: Check appointments table
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('*')
      .limit(1);

    if (appointmentsError) {
      console.error('❌ Appointments query failed:', appointmentsError.message);
      return false;
    }

    console.log('✅ Appointments table accessible:', appointments.length, 'records found');

    console.log('🎉 All tests passed! Supabase connection is working.');
    return true;

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    return false;
  }
}

testConnection();