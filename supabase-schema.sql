-- BlackBox Logistics Database Schema
-- Run this in your Supabase SQL editor

-- Riders table
CREATE TABLE riders (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  pin TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
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
  pickup_area TEXT NOT NULL,
  pickup_address TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  dropoff_area TEXT NOT NULL,
  dropoff_address TEXT NOT NULL,
  package_description TEXT,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('transfer', 'cash_sender', 'cod')),
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

-- Indexes
CREATE INDEX idx_deliveries_status ON deliveries(status);
CREATE INDEX idx_deliveries_rider ON deliveries(rider_id);
CREATE INDEX idx_deliveries_created ON deliveries(created_at DESC);
CREATE INDEX idx_history_delivery ON delivery_history(delivery_id);

-- Enable RLS (Row Level Security) but allow all operations via service role
ALTER TABLE riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_history ENABLE ROW LEVEL SECURITY;

-- Policies: allow all operations (we handle auth in the API layer)
CREATE POLICY "Allow all on riders" ON riders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on admins" ON admins FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on deliveries" ON deliveries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on delivery_history" ON delivery_history FOR ALL USING (true) WITH CHECK (true);

-- Insert default admin (password: TryAndHackThis1)
-- Hash generated with bcrypt, 10 rounds
INSERT INTO admins (name, email, password_hash, role) VALUES
  ('Oluwasegun Aderibigbe', 'admin@blackboxlogistics.com', '$2b$10$tRKYxgtJcUpfPzMeI3/OUOuI1obDaTwAY7Fka98pwvx4DMRT/xdVO', 'owner');

-- Insert sample riders
INSERT INTO riders (name, phone, pin) VALUES
  ('Rider 1', '+2348000000001', '1234'),
  ('Rider 2', '+2348000000002', '5678');
