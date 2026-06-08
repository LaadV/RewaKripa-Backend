-- ============================================================
--  REWA KRIPA TRAVELS — Complete Supabase Database Setup
--  Run this entire file in: Supabase → SQL Editor → New Query → Run
--  Safe to run multiple times (uses IF NOT EXISTS + DROP IF EXISTS)
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. SEATS TABLE  (real-time shared seat booking)
-- ────────────────────────────────────────────────────────────
create table if not exists seats (
  id              bigint generated always as identity primary key,
  bus_id          text        not null,
  travel_date     date        not null,
  seat_num        int         not null,
  gender          text        not null default 'M',
  passenger_name  text        default '',
  passenger_phone text        default '',
  status          text        not null default 'booked',
  booked_at       timestamptz default now(),
  constraint seats_unique unique (bus_id, travel_date, seat_num),
  constraint gender_check check (gender in ('M','F'))
);

create index if not exists idx_seats_bus_date
  on seats (bus_id, travel_date);


-- ────────────────────────────────────────────────────────────
-- 2. SITE CONFIG TABLE  (admin-editable, public-readable)
-- ────────────────────────────────────────────────────────────
create table if not exists site_config (
  id          int         primary key default 1,
  config_json jsonb,
  updated_at  timestamptz default now()
);


-- ────────────────────────────────────────────────────────────
-- 3. STAFF TABLE
-- ────────────────────────────────────────────────────────────
create table if not exists staff (
  id           bigint generated always as identity primary key,
  name         text    not null,
  role         text    not null check (role in ('driver','conductor','helper','office')),
  phone        text    not null,
  whatsapp     text    default '',
  photo_url    text    default '',
  bus_id       text    default '',
  bus_plate    text    default '',
  salary       int     default 0,
  join_date    text    default '',
  address      text    default '',
  id_proof     text    default '',
  active       boolean default true,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- Sample staff (only inserted once — skip if already exist)
insert into staff (name, role, phone, whatsapp, bus_id, bus_plate, salary, join_date)
select 'Raju Sharma',   'driver',    '+91 98765 43210', '919876543210', 'bus1', 'MP09CY8606', 22000, '2020-01-15'
where not exists (select 1 from staff where phone = '+91 98765 43210');

insert into staff (name, role, phone, whatsapp, bus_id, bus_plate, salary, join_date)
select 'Suresh Patel',  'driver',    '+91 98765 43211', '919876543211', 'bus2', 'MP09CY7782', 22000, '2021-03-10'
where not exists (select 1 from staff where phone = '+91 98765 43211');

insert into staff (name, role, phone, whatsapp, bus_id, bus_plate, salary, join_date)
select 'Mohan Verma',   'conductor', '+91 98765 43212', '919876543212', 'bus1', 'MP09CY8606', 14000, '2020-01-15'
where not exists (select 1 from staff where phone = '+91 98765 43212');

insert into staff (name, role, phone, whatsapp, bus_id, bus_plate, salary, join_date)
select 'Dinesh Kumar',  'conductor', '+91 98765 43213', '919876543213', 'bus2', 'MP09CY7782', 14000, '2021-03-10'
where not exists (select 1 from staff where phone = '+91 98765 43213');

insert into staff (name, role, phone, whatsapp, bus_id, bus_plate, salary, join_date)
select 'Ramesh Helper', 'helper',    '+91 98765 43214', '919876543214', 'bus3', 'MP09CY9911', 10000, '2022-06-01'
where not exists (select 1 from staff where phone = '+91 98765 43214');

insert into staff (name, role, phone, whatsapp, bus_id, bus_plate, salary, join_date)
select 'Anita Devi',    'office',    '+91 98765 43215', '919876543215', '',    '',            15000, '2019-08-20'
where not exists (select 1 from staff where phone = '+91 98765 43215');


-- ────────────────────────────────────────────────────────────
-- 4. ATTENDANCE TABLE
-- ────────────────────────────────────────────────────────────
create table if not exists attendance (
  id           bigint generated always as identity primary key,
  staff_id     bigint references staff(id) on delete cascade,
  staff_name   text    not null,
  role         text    not null,
  bus_id       text    default '',
  bus_plate    text    default '',
  date         date    not null default current_date,
  status       text    not null default 'absent'
               check (status in ('present','absent','halfday','leave','late')),
  check_in     text    default '',
  note         text    default '',
  marked_by    text    default 'admin',
  wa_confirmed boolean default false,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  unique(staff_id, date)
);

create index if not exists idx_attendance_date
  on attendance (date);

create index if not exists idx_attendance_staff_date
  on attendance (staff_id, date);


-- ────────────────────────────────────────────────────────────
-- 5. FINANCE ENTRIES TABLE
-- ────────────────────────────────────────────────────────────
create table if not exists finance_entries (
  id          text primary key,
  type        text          not null check (type in ('income','expense')),
  bus_id      text          not null,
  bus_plate   text          default '',
  bus_title   text          default '',
  date        date          not null,
  category    text          not null,
  amount      numeric(12,2) not null,
  route       text          default '',
  pax1        int           default 0,
  pax2        int           default 0,
  fare        numeric(10,2) default 0,
  vendor      text          default '',
  ref_no      text          default '',
  notes       text          default '',
  created_at  timestamptz   default now()
);

create index if not exists idx_finance_bus_date
  on finance_entries (bus_id, date);

create index if not exists idx_finance_type
  on finance_entries (type);


-- ────────────────────────────────────────────────────────────
-- 6. ROW LEVEL SECURITY — Enable on all tables
-- ────────────────────────────────────────────────────────────
alter table seats           enable row level security;
alter table site_config     enable row level security;
alter table staff           enable row level security;
alter table attendance      enable row level security;
alter table finance_entries enable row level security;


-- ────────────────────────────────────────────────────────────
-- 7. RLS POLICIES — Drop old, create fresh
-- ────────────────────────────────────────────────────────────

-- seats
drop policy if exists "seats_select" on seats;
drop policy if exists "seats_insert" on seats;
drop policy if exists "seats_update" on seats;
drop policy if exists "seats_delete" on seats;

create policy "seats_select" on seats for select using (true);
create policy "seats_insert" on seats for insert with check (true);
create policy "seats_update" on seats for update using (true);
create policy "seats_delete" on seats for delete using (true);

-- site_config
drop policy if exists "config_select" on site_config;
drop policy if exists "config_all"    on site_config;

create policy "config_select" on site_config for select using (true);
create policy "config_all"    on site_config for all    using (true) with check (true);

-- staff
drop policy if exists "staff_select" on staff;
drop policy if exists "staff_all"    on staff;

create policy "staff_select" on staff for select using (true);
create policy "staff_all"    on staff for all    using (true) with check (true);

-- attendance
drop policy if exists "att_select" on attendance;
drop policy if exists "att_all"    on attendance;

create policy "att_select" on attendance for select using (true);
create policy "att_all"    on attendance for all    using (true) with check (true);

-- finance_entries
drop policy if exists "fin_select" on finance_entries;
drop policy if exists "fin_all"    on finance_entries;

create policy "fin_select" on finance_entries for select using (true);
create policy "fin_all"    on finance_entries for all    using (true) with check (true);


-- ────────────────────────────────────────────────────────────
-- 8. REAL-TIME — Enable for seats + attendance
-- ────────────────────────────────────────────────────────────
do $$ begin
  begin
    alter publication supabase_realtime add table seats;
  exception when others then null;
  end;
  begin
    alter publication supabase_realtime add table attendance;
  exception when others then null;
  end;
end $$;


-- ────────────────────────────────────────────────────────────
-- 9. VERIFY — Should return 5 rows
-- ────────────────────────────────────────────────────────────
select table_name,
       pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as size
from   information_schema.tables
where  table_schema = 'public'
  and  table_name in ('seats','site_config','staff','attendance','finance_entries')
order  by table_name;

-- ============================================================
--  DONE ✅  All 5 tables created and secured.
--  Next: copy Project URL + anon key into frontend .env.local
--        copy Project URL + service role key into backend .env
-- ============================================================
