-- ============================================================
-- BookEase Database Setup
-- Run this entire file in your Supabase SQL Editor
-- Go to: Supabase Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================

-- APPOINTMENTS TABLE
create table if not exists appointments (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),

  -- Customer info
  name text not null,
  email text not null,
  phone text not null,
  notes text,

  -- Booking details
  service text not null,
  management text not null,
  date text not null,        -- stored as "YYYY-M-D"
  time text not null,        -- stored as "9:00 AM"

  -- Status: confirmed | cancelled | completed
  status text default 'confirmed'
);

-- SERVICES TABLE
create table if not exists services (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  active boolean default true
);

-- MANAGEMENT TABLE
create table if not exists management (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  active boolean default true
);

-- ─── SEED DATA ───────────────────────────────────────────────

-- Default services
insert into services (name) values
  ('AI AGENTS' ),
    ('STAFF AUGMENTATION')
  ;

-- Default management
insert into management (name) values
  ('Azeez'),
  ('Piero'),
    ('Happy');

-- ─── ROW LEVEL SECURITY (optional, recommended) ──────────────
-- Allows public read/write for now (fine for MVP)
alter table appointments enable row level security;
create policy "Allow all" on appointments for all using (true);

alter table services enable row level security;
create policy "Allow all" on services for all using (true);

alter table management enable row level security;
create policy "Allow all" on staff for all using (true);
