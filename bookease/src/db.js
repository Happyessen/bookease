// src/db.js
// ─── Database connection using Supabase ───────────────────────

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY in .env');
  process.exit(1);
}

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ─── APPOINTMENT FUNCTIONS ────────────────────────────────────

export async function getAppointments(date = null) {
  let query = supabase
    .from('appointments')
    .select('*')
    .eq('status', 'confirmed')
    .order('date', { ascending: true });

  if (date) query = query.eq('date', date);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function getAppointmentById(id) {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error('Appointment not found');
  return data;
}

export async function createAppointment({ 
  customer_name, customer_phone, customer_notes,
  service, service_duration, service_price,
  staff, date, time 
}) {
  // Check if slot is already taken
  const { data: existing } = await supabase
    .from('appointments')
    .select('id')
    .eq('date', date)
    .eq('time', time)
    .eq('staff', staff)
    .eq('status', 'confirmed');

  if (existing && existing.length > 0) {
    throw new Error(`Sorry, ${time} on ${date} with ${staff} is already booked.`);
  }

  const { data, error } = await supabase
    .from('appointments')
    .insert([{
      customer_name, customer_phone, customer_notes,
      service, service_duration, service_price,
      staff, date, time, status: 'confirmed'
    }])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function cancelAppointment(id) {
  const { data, error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getBookedSlots(date, staff = null) {
  let query = supabase
    .from('appointments')
    .select('time, staff')
    .eq('date', date)
    .eq('status', 'confirmed');

  if (staff) query = query.eq('staff', staff);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data?.map(a => a.time) || [];
}

// ─── SERVICES & STAFF ─────────────────────────────────────────

export async function getServices() {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('active', true);

  if (error) throw new Error(error.message);
  return data;
}

export async function getStaff() {
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .eq('active', true);

  if (error) throw new Error(error.message);
  return data;
}
