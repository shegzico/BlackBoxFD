-- BlackBox Logistics V2 Migration
-- Run this in your Supabase SQL editor AFTER the initial schema

-- 1. Add pricing table for delivery locations
CREATE TABLE IF NOT EXISTS pricing (
  id SERIAL PRIMARY KEY,
  location TEXT NOT NULL UNIQUE,
  zone_category TEXT NOT NULL CHECK (zone_category IN ('Island Core', 'Mainland Core', 'Mainland Extended', 'Island Extended', 'Far Areas')),
  price NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pricing_location ON pricing(location);
CREATE INDEX idx_pricing_zone ON pricing(zone_category);

ALTER TABLE pricing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on pricing" ON pricing FOR ALL USING (true) WITH CHECK (true);

-- 2. Add new columns to riders table
ALTER TABLE riders ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS bike_plate TEXT;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS bike_model TEXT;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS bike_color TEXT;

-- 3. Add sender_email to deliveries table
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS sender_email TEXT;

-- 4. Update payment_method constraint (drop old, add new)
ALTER TABLE deliveries DROP CONSTRAINT IF EXISTS deliveries_payment_method_check;
ALTER TABLE deliveries ADD CONSTRAINT deliveries_payment_method_check
  CHECK (payment_method IN ('sender_pays', 'receiver_pays', 'transfer', 'cash_sender', 'cod'));

-- 5. Insert all Lagos delivery locations with prices from Notion
INSERT INTO pricing (location, zone_category, price) VALUES
  -- Island Core (₦2,500)
  ('Victoria Island', 'Island Core', 2500),
  ('Ikoyi', 'Island Core', 2500),
  ('Lagos Island', 'Island Core', 2500),
  ('Lekki Phase 1', 'Island Core', 2500),
  ('Lekki Phase 2', 'Island Core', 2500),

  -- Mainland Core (₦3,000)
  ('Yaba', 'Mainland Core', 3000),
  ('Surulere', 'Mainland Core', 3000),
  ('Maryland', 'Mainland Core', 3000),
  ('Ikeja', 'Mainland Core', 3000),
  ('Costain', 'Mainland Core', 3000),
  ('Ketu', 'Mainland Core', 3000),
  ('Ogudu', 'Mainland Core', 3000),
  ('Ojota', 'Mainland Core', 3000),
  ('Jibowu', 'Mainland Core', 3000),
  ('Oshodi-Isolo', 'Mainland Core', 3000),
  ('Mushin', 'Mainland Core', 3000),

  -- Mainland Extended (₦4,500)
  ('Ogba', 'Mainland Extended', 4500),
  ('Egbeda', 'Mainland Extended', 4500),
  ('Olowoora', 'Mainland Extended', 4500),
  ('Egan', 'Mainland Extended', 4500),
  ('Ajangbadi', 'Mainland Extended', 4500),
  ('Aspamda', 'Mainland Extended', 4500),
  ('Ikorodu', 'Mainland Extended', 4500),
  ('Ojodu Berger', 'Mainland Extended', 4500),
  ('Isheri-Berger', 'Mainland Extended', 4500),
  ('Ojodu', 'Mainland Extended', 4500),
  ('Amuwo Odofin', 'Mainland Extended', 4500),
  ('Apapa', 'Mainland Extended', 4500),
  ('Festac Town', 'Mainland Extended', 4500),

  -- Island Extended (₦5,000)
  ('Ajah', 'Island Extended', 5000),
  ('Sangotedo', 'Island Extended', 5000),
  ('Lakowe', 'Island Extended', 5000),
  ('Eleko', 'Island Extended', 5000),
  ('Bogije', 'Island Extended', 5000),
  ('Ibeju-Lekki', 'Island Extended', 5000),
  ('Epe', 'Island Extended', 5000),

  -- Far Areas (₦5,000)
  ('Agege', 'Far Areas', 5000),
  ('Iba', 'Far Areas', 5000),
  ('Lasu', 'Far Areas', 5000),
  ('Ojo', 'Far Areas', 5000),
  ('Seme', 'Far Areas', 5000),
  ('Agbara', 'Far Areas', 5000),
  ('Mowo', 'Far Areas', 5000)
ON CONFLICT (location) DO NOTHING;
