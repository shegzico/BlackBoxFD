-- businesses table
CREATE TABLE IF NOT EXISTS businesses (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  type TEXT,
  state TEXT DEFAULT 'Lagos',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add business fields to customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS business_id INTEGER REFERENCES businesses(id) ON DELETE SET NULL;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS business_role TEXT CHECK (business_role IN ('admin', 'basic'));
ALTER TABLE customers ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'individual' CHECK (account_type IN ('individual', 'business'));

-- Business invites
CREATE TABLE IF NOT EXISTS business_invites (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  invited_by INTEGER NOT NULL REFERENCES customers(id),
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'basic')),
  token TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);
