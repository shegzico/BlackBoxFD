-- V3 Migration: Customer accounts and portal
-- Run this in Supabase SQL Editor

-- 1. Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  otp_code TEXT,
  otp_expires_at TIMESTAMPTZ,
  default_pickup_area TEXT,
  default_pickup_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on customers" ON customers FOR ALL USING (true) WITH CHECK (true);

-- 2. Add customer_id to deliveries
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id);
CREATE INDEX IF NOT EXISTS idx_deliveries_customer ON deliveries(customer_id);

-- 3. Update delivery_history triggered_by constraint to include 'customer'
ALTER TABLE delivery_history DROP CONSTRAINT IF EXISTS delivery_history_triggered_by_check;
ALTER TABLE delivery_history ADD CONSTRAINT delivery_history_triggered_by_check
  CHECK (triggered_by IN ('system', 'admin', 'rider', 'recipient', 'customer'));
