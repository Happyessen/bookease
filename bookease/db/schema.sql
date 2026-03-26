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
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  customer_notes text,

  -- Booking details
  service text not null,
  service_duration text not null,
  service_price text not null,
  staff text not null,
  date text not null,        -- stored as "YYYY-M-D"
  time text not null,        -- stored as "9:00 AM"

  -- Status: confirmed | cancelled | completed
  status text default 'confirmed'
);

-- SERVICES TABLE
create table if not exists services (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  duration text not null,
  price text not null,
  active boolean default true
);

-- STAFF TABLE
create table if not exists staff (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  active boolean default true
);

-- ─── SEED DATA ───────────────────────────────────────────────

-- Default services
insert into services (name, duration, price) values
  ('AI AGENTS - MarCom AI Agent', '60 min', ''),
  ('AI AGENTS - SalesPro AI Agent', '60 min', ''),
  ('AI AGENTS - Procurement AI Agent', '60 min', ''),
  ('AI AGENTS - Market Intel AI Agent', '60 min', ''),
  ('AI AGENTS - Due Diligence AI Agent', '60 min', ''),
  ('AI AGENTS - HR Ops AI Agent', '60 min', ''),
  ('AI AGENTS - SourcePro AI Agent', '60 min', ''),
  ('AI AGENTS - BidPro AI Agent', '60 min', ''),
  ('STAFF AUGMENTATION', '120 min', ''),
  ('BI & Analytics', '120 min', ''),
  ('AI Models', '120 min', '');

-- Default staff
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

alter table staff enable row level security;
create policy "Allow all" on staff for all using (true);
