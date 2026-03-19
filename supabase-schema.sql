-- BlackBox Logistics Database Schema V2
-- Run this in your Supabase SQL editor

-- Riders table
CREATE TABLE riders (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  pin TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  image_url TEXT,
  bike_plate TEXT,
  bike_model TEXT,
  bike_color TEXT
);

-- Admins table
CREATE TABLE admins (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'manager'))
);

-- Deliveries table
CREATE TABLE deliveries (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'confirmed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  sender_name TEXT NOT NULL,
  sender_phone TEXT NOT NULL,
  sender_email TEXT,
  pickup_area TEXT NOT NULL,
  pickup_address TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  dropoff_area TEXT NOT NULL,
  dropoff_address TEXT NOT NULL,
  package_description TEXT,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('sender_pays', 'receiver_pays')),
  is_express BOOLEAN DEFAULT false,
  fee NUMERIC,
  rider_id INTEGER REFERENCES riders(id),
  created_by TEXT NOT NULL DEFAULT 'customer' CHECK (created_by IN ('customer', 'admin'))
);

-- Delivery history table
CREATE TABLE delivery_history (
  id SERIAL PRIMARY KEY,
  delivery_id TEXT NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  triggered_by TEXT NOT NULL CHECK (triggered_by IN ('system', 'admin', 'rider', 'recipient')),
  note TEXT
);

-- Pricing table for delivery locations
CREATE TABLE pricing (
  id SERIAL PRIMARY KEY,
  location TEXT NOT NULL UNIQUE,
  zone_category TEXT NOT NULL CHECK (zone_category IN ('Island Core', 'Mainland Core', 'Mainland Extended', 'Island Extended', 'Far Areas')),
  price NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_deliveries_status ON deliveries(status);
CREATE INDEX idx_deliveries_rider ON deliveries(rider_id);
CREATE INDEX idx_deliveries_created ON deliveries(created_at DESC);
CREATE INDEX idx_history_delivery ON delivery_history(delivery_id);
CREATE INDEX idx_pricing_location ON pricing(location);
CREATE INDEX idx_pricing_zone ON pricing(zone_category);

-- Enable RLS (Row Level Security) but allow all operations via service role
ALTER TABLE riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing ENABLE ROW LEVEL SECURITY;

-- Policies: allow all operations (we handle auth in the API layer)
CREATE POLICY "Allow all on riders" ON riders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on admins" ON admins FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on deliveries" ON deliveries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on delivery_history" ON delivery_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on pricing" ON pricing FOR ALL USING (true) WITH CHECK (true);

-- Insert default admin (password: TryAndHackThis1)
-- Hash generated with bcrypt, 10 rounds
INSERT INTO admins (name, email, password_hash, role) VALUES
  ('Oluwasegun Aderibigbe', 'admin@blackboxlogistics.com', '$2b$10$tRKYxgtJcUpfPzMeI3/OUOuI1obDaTwAY7Fka98pwvx4DMRT/xdVO', 'owner');

-- Insert sample riders
INSERT INTO riders (name, phone, pin) VALUES
  ('Rider 1', '+2348000000001', '1234'),
  ('Rider 2', '+2348000000002', '5678');

-- Insert all Lagos delivery locations with prices
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
  ('Mowo', 'Far Areas', 5000);
