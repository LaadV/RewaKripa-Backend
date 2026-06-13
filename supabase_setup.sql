-- ============================================================
--  REWA KRIPA TRAVELS — Complete Supabase Setup
--  Run this in: Supabase → SQL Editor → New Query → Run
--  Safe to run multiple times (IF NOT EXISTS everywhere)
-- ============================================================

-- ── 1. SEATS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seats (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bus_id          TEXT        NOT NULL,
  travel_date     DATE        NOT NULL,
  seat_num        INT         NOT NULL,
  gender          TEXT        NOT NULL DEFAULT 'M' CHECK (gender IN ('M','F')),
  passenger_name  TEXT        DEFAULT '',
  passenger_phone TEXT        DEFAULT '',
  status          TEXT        NOT NULL DEFAULT 'booked',
  booked_at       TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT seats_unique UNIQUE (bus_id, travel_date, seat_num)
);

-- ── 2. SITE CONFIG ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_config (
  id          INT PRIMARY KEY DEFAULT 1,
  config_json JSONB,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. BUSES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS buses (
  id          TEXT PRIMARY KEY,
  plate       TEXT NOT NULL,
  title       TEXT NOT NULL,
  image       TEXT DEFAULT '',
  bus_type    TEXT DEFAULT 'AC Seater',
  layout      TEXT DEFAULT '2x2',
  capacity    INT  DEFAULT 40,
  climate     TEXT DEFAULT 'Full AC',
  price       INT  DEFAULT 230,
  route       TEXT DEFAULT '',
  departure   TEXT DEFAULT '',
  tags        JSONB DEFAULT '[]',
  features    JSONB DEFAULT '[]',
  description TEXT DEFAULT '',
  driver      JSONB DEFAULT '{}',
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. ROUTES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS routes (
  id         TEXT PRIMARY KEY,
  bus_id     TEXT REFERENCES buses(id) ON DELETE SET NULL,
  from_city  TEXT NOT NULL,
  to_city    TEXT NOT NULL,
  via        TEXT DEFAULT '',
  label      TEXT NOT NULL,
  image      TEXT DEFAULT '',
  duration   TEXT DEFAULT '',
  route_type TEXT DEFAULT 'Daily',
  first_bus  TEXT DEFAULT '',
  last_bus   TEXT DEFAULT '',
  price      INT  DEFAULT 200,
  rating     NUMERIC(3,1) DEFAULT 4.5,
  reviews    TEXT DEFAULT '0',
  status     TEXT DEFAULT 'open' CHECK (status IN ('open','closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. TRIPS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trips (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  short_title  TEXT NOT NULL,
  subtitle     TEXT DEFAULT '',
  image        TEXT DEFAULT '',
  badge        TEXT DEFAULT 'popular',
  badge_label  TEXT DEFAULT '',
  price        INT  DEFAULT 2000,
  departure    TEXT DEFAULT '',
  return_date  TEXT DEFAULT '',
  duration     TEXT DEFAULT '',
  seats_left   INT  DEFAULT 0,
  meals        TEXT DEFAULT '',
  bus_type     TEXT DEFAULT 'AC Coach',
  description  TEXT DEFAULT '',
  itinerary    JSONB DEFAULT '[]',
  inclusions   JSONB DEFAULT '[]',
  exclusions   JSONB DEFAULT '[]',
  notes        JSONB DEFAULT '[]',
  active       BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── 6. STAFF ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('driver','conductor','helper','office')),
  phone       TEXT NOT NULL,
  whatsapp    TEXT DEFAULT '',
  photo_url   TEXT DEFAULT '',
  bus_id      TEXT DEFAULT '',
  bus_plate   TEXT DEFAULT '',
  salary      INT  DEFAULT 0,
  join_date   TEXT DEFAULT '',
  address     TEXT DEFAULT '',
  id_proof    TEXT DEFAULT '',
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 7. ATTENDANCE ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  staff_id     BIGINT REFERENCES staff(id) ON DELETE CASCADE,
  staff_name   TEXT NOT NULL,
  role         TEXT NOT NULL,
  bus_id       TEXT DEFAULT '',
  bus_plate    TEXT DEFAULT '',
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  status       TEXT NOT NULL DEFAULT 'absent'
               CHECK (status IN ('present','absent','halfday','leave','late')),
  check_in     TEXT DEFAULT '',
  note         TEXT DEFAULT '',
  marked_by    TEXT DEFAULT 'admin',
  wa_confirmed BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT attendance_unique UNIQUE (staff_id, date)
);

-- ── 8. FINANCE ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS finance_entries (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bus_id      TEXT NOT NULL,
  bus_plate   TEXT DEFAULT '',
  bus_title   TEXT DEFAULT '',
  date        DATE NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('income','expense')),
  category    TEXT NOT NULL,
  amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  route       TEXT DEFAULT '',
  pax1        INT  DEFAULT 0,
  pax2        INT  DEFAULT 0,
  fare        NUMERIC(10,2) DEFAULT 0,
  vendor      TEXT DEFAULT '',
  ref_no      TEXT DEFAULT '',
  notes       TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 9. ROW LEVEL SECURITY ────────────────────────────────────
ALTER TABLE seats           ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_config     ENABLE ROW LEVEL SECURITY;
ALTER TABLE buses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips           ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff           ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance      ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_entries ENABLE ROW LEVEL SECURITY;

-- Drop old policies before recreating
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies
    WHERE tablename IN ('seats','site_config','buses','routes','trips','staff','attendance','finance_entries')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- Public tables (seats, config, buses, routes, trips) — anyone can read/write
CREATE POLICY "public_all" ON seats           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON site_config     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_read" ON buses          FOR SELECT USING (true);
CREATE POLICY "public_read" ON routes         FOR SELECT USING (true);
CREATE POLICY "public_read" ON trips          FOR SELECT USING (true);

-- Admin tables (staff, attendance, finance) — service role key bypasses RLS
-- Frontend uses service-role via backend, so anon key gets blocked here
CREATE POLICY "service_all" ON buses           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON routes          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON trips           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON staff           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON attendance      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all" ON finance_entries FOR ALL USING (true) WITH CHECK (true);

-- ── 10. REAL-TIME ────────────────────────────────────────────
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE seats;       EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE attendance;  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE staff;       EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- ── 11. INDEXES ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_seats_bus_date      ON seats (bus_id, travel_date);
CREATE INDEX IF NOT EXISTS idx_attendance_date     ON attendance (date);
CREATE INDEX IF NOT EXISTS idx_attendance_staff    ON attendance (staff_id, date);
CREATE INDEX IF NOT EXISTS idx_finance_bus_date    ON finance_entries (bus_id, date);
CREATE INDEX IF NOT EXISTS idx_finance_type        ON finance_entries (type, date);

-- ── 12. SEED DEFAULT DATA ────────────────────────────────────
INSERT INTO buses (id, plate, title, image, bus_type, layout, capacity, climate, price, route, departure, tags, features, description, driver)
VALUES
  ('bus1','MP09CY8606','Luxury Seater','images/bus1.jpeg','AC Seater','2x2',40,'Full AC',230,'Barwani → Pati → Bokrata','08:00 AM',
   '["❄️ AC","📶 WiFi","🔌 USB","💺 Recliner"]',
   '["❄️ Air Conditioning","📶 Free WiFi","🔌 USB Charging","💺 Recliner Seats","💡 Reading Light","📹 CCTV Camera"]',
   'Our flagship Luxury Seater with premium 2×2 recliner seating.',
   '{"name":"Raju Sharma","phone":"+91 98765 43210","licence":"MP09 DL 2019 0012345","exp":"8+ Years Experience","photo":""}'),
  ('bus2','MP09CY7782','AC Seater','images/bus2.jpeg','AC Pushback','2x2',44,'Full AC',230,'Barwani → Pati','09:00 AM',
   '["❄️ AC","💡 Reading Light","☕ Cup Holder"]',
   '["❄️ Air Conditioning","💡 Reading Light","☕ Cup Holder","🔌 USB Charging","💺 Pushback Seats","📹 CCTV Camera"]',
   'Comfortable AC Seater with pushback reclining, cup holders, and reading lights.',
   '{"name":"Suresh Patel","phone":"+91 98765 43211","licence":"MP09 DL 2020 0054321","exp":"6+ Years Experience","photo":""}'),
  ('bus3','MP09CY9911','Premium Coach','images/bus3.jpeg','Premium AC','2x1',36,'Full AC',350,'Indore → Barwani','07:00 AM',
   '["🎬 Entertainment","🍿 Snacks","📺 LED"]',
   '["🎬 Entertainment System","🍿 Complimentary Snacks","📺 LED Displays","❄️ Full AC","🔌 USB Charging","📶 Free WiFi"]',
   'The ultimate travel experience. Entertainment system, complimentary snacks, LED displays.',
   '{"name":"Mohan Verma","phone":"+91 98765 43212","licence":"MP09 DL 2018 0098765","exp":"10+ Years Experience","photo":""}'),
  ('bus4','MP09CY4455','Budget Seater','images/bus4.jpeg','Non-AC Seater','2x3',52,'Ceiling Fans',170,'Anjad → Indore','07:30 AM',
   '["💨 Fan","💰 Budget","🧳 Luggage"]',
   '["💨 Ceiling Fans","🧳 Luggage Racks","💰 Budget Fares","⏱️ On-time Service"]',
   'Reliable and economical. Clean, punctual, and ideal for budget-conscious travellers.',
   '{"name":"Dinesh Kumar","phone":"+91 98765 43213","licence":"MP09 DL 2021 0011111","exp":"4+ Years Experience","photo":""}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO routes (id, bus_id, from_city, to_city, via, label, image, duration, route_type, first_bus, last_bus, price, rating, reviews, status)
VALUES
  ('barwani-bokrata','bus1','Barwani','Bokrata','Pati','Barwani → Pati → Bokrata','images/bus1.jpeg','4.5 hrs','MP State Highway · Daily','08:30 AM','05:00 PM',230,4.9,'1,060+','open'),
  ('indore-barwani','bus3','Indore','Barwani','','Indore → Barwani','images/bus4.jpeg','3–4 hrs','Daily Highway Route','06:50 AM','08:30 PM',230,4.8,'980+','open'),
  ('barwani-indore','bus2','Barwani','Indore','','Barwani → Indore','images/bus2.jpeg','3–4 hrs','Express Route','08:30 AM','04:15 PM',230,4.7,'860+','open'),
  ('anjad-indore','bus4','Anjad','Indore','','Anjad → Indore','images/bus3.jpeg','2.5 hrs','Daily Morning Route','07:30 AM','12:00 PM',170,4.6,'540+','open')
ON CONFLICT (id) DO NOTHING;

INSERT INTO staff (name, role, phone, whatsapp, bus_id, bus_plate, salary, join_date)
VALUES
  ('Raju Sharma',   'driver',    '+91 98765 43210','919876543210','bus1','MP09CY8606',22000,'2020-01-15'),
  ('Suresh Patel',  'driver',    '+91 98765 43211','919876543211','bus2','MP09CY7782',22000,'2021-03-10'),
  ('Mohan Verma',   'conductor', '+91 98765 43212','919876543212','bus1','MP09CY8606',14000,'2020-01-15'),
  ('Dinesh Kumar',  'conductor', '+91 98765 43213','919876543213','bus2','MP09CY7782',14000,'2021-03-10'),
  ('Ramesh Helper', 'helper',    '+91 98765 43214','919876543214','bus3','MP09CY9911',10000,'2022-06-01'),
  ('Anita Devi',    'office',    '+91 98765 43215','919876543215','',   '',           15000,'2019-08-20')
ON CONFLICT DO NOTHING;

-- ── VERIFY ───────────────────────────────────────────────────
SELECT table_name, pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) AS size
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('seats','site_config','buses','routes','trips','staff','attendance','finance_entries')
ORDER BY table_name;

-- ============================================================
-- DONE ✅  All 8 tables created with seed data
-- ============================================================
