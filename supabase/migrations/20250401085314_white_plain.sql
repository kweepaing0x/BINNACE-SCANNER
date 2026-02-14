/*
  # Create authentication tables

  1. New Tables
    - `whitelisted_addresses`
      - `id` (uuid, primary key)
      - `address` (text, unique with network)
      - `network` (text)
      - `created_at` (timestamp)
      - `last_login` (timestamp)
      - `login_attempts` (integer)
    
    - `login_attempts`
      - `id` (uuid, primary key)
      - `address` (text)
      - `network` (text)
      - `timestamp` (timestamp)
      - `success` (boolean)
      - `ip_address` (text)
    
    - `whitelist_requests`
      - `id` (uuid, primary key)
      - `address` (text)
      - `network` (text)
      - `status` (text)
      - `requested_at` (timestamp)
      - `processed_at` (timestamp)
      - `processed_by` (uuid, references auth.users)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create whitelisted_addresses table
CREATE TABLE IF NOT EXISTS whitelisted_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  address text NOT NULL,
  network text NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_login timestamptz,
  login_attempts integer DEFAULT 0,
  UNIQUE(address, network)
);

-- Create login_attempts table
CREATE TABLE IF NOT EXISTS login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  address text NOT NULL,
  network text NOT NULL,
  timestamp timestamptz DEFAULT now(),
  success boolean NOT NULL,
  ip_address text
);

-- Create whitelist_requests table
CREATE TABLE IF NOT EXISTS whitelist_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  address text NOT NULL,
  network text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  requested_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  processed_by uuid REFERENCES auth.users(id),
  UNIQUE(address, network)
);

-- Enable RLS
ALTER TABLE whitelisted_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE whitelist_requests ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public read access to whitelisted addresses"
  ON whitelisted_addresses
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can manage whitelisted addresses"
  ON whitelisted_addresses
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can view all login attempts"
  ON login_attempts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow inserting login attempts"
  ON login_attempts
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can request whitelist access"
  ON whitelist_requests
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Admins can manage whitelist requests"
  ON whitelist_requests
  USING (auth.role() = 'authenticated');