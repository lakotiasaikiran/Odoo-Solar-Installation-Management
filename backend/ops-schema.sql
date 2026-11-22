BEGIN;

CREATE SCHEMA IF NOT EXISTS photonix_ops;

-- Equipment serial registry for warehouse scan, dispatch & warranty tracking
CREATE TABLE IF NOT EXISTS photonix_ops.equipment_serial (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number text UNIQUE NOT NULL,
  product_type text NOT NULL CHECK (product_type IN ('panel', 'inverter', 'battery', 'charge_controller', 'mounting_structure')),
  model_name text NOT NULL,
  lead_id bigint,
  customer_name text,
  customer_phone text,
  status text NOT NULL DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'packed', 'dispatched', 'delivered', 'installed')),
  scanned_at timestamptz,
  dispatched_at timestamptz,
  delivered_at timestamptz,
  warranty_years integer NOT NULL DEFAULT 2,
  warranty_expires timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Installation job tracking with field completion workflow
CREATE TABLE IF NOT EXISTS photonix_ops.installation_job (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_number text UNIQUE NOT NULL,
  lead_id bigint,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  address text NOT NULL,
  system_capacity_kw numeric(4,2) NOT NULL,
  system_type text NOT NULL DEFAULT 'on_grid' CHECK (system_type IN ('on_grid', 'off_grid')),
  technician_id uuid REFERENCES photonix_auth.account(id),
  technician_name text,
  scheduled_date date NOT NULL,
  start_time timestamptz,
  finish_time timestamptz,
  power_test_watts numeric(8,2),
  safety_earthing_done boolean DEFAULT false,
  mounting_checked boolean DEFAULT false,
  wiring_checked boolean DEFAULT false,
  customer_signature text,
  completion_notes text,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'blocked')),
  contract_amount numeric(12,2) NOT NULL DEFAULT 0,
  equipment_cost numeric(12,2) NOT NULL DEFAULT 0,
  labour_cost numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Customer service and warranty tickets
CREATE TABLE IF NOT EXISTS photonix_ops.service_ticket (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text UNIQUE NOT NULL,
  serial_number text NOT NULL,
  product_type text NOT NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  issue_description text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'parts_ordered', 'resolved', 'customer_confirmed')),
  in_warranty boolean NOT NULL DEFAULT true,
  parts_cost numeric(10,2) NOT NULL DEFAULT 0,
  labour_cost numeric(10,2) NOT NULL DEFAULT 0,
  technician_notes text,
  resolution_confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Automation rules stored in database, run by backend
CREATE TABLE IF NOT EXISTS photonix_ops.automation_rule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text NOT NULL,
  trigger_event text NOT NULL,
  action_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  run_count integer NOT NULL DEFAULT 0,
  last_status text DEFAULT 'idle'
);

-- Automation execution log
CREATE TABLE IF NOT EXISTS photonix_ops.automation_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  rule_id uuid REFERENCES photonix_ops.automation_rule(id),
  rule_name text NOT NULL,
  event_data jsonb,
  action_result text NOT NULL,
  executed_at timestamptz NOT NULL DEFAULT now()
);

-- Subsidy parameters configuration table
CREATE TABLE IF NOT EXISTS photonix_ops.subsidy_config (
  id integer PRIMARY KEY DEFAULT 1,
  scheme_name text NOT NULL DEFAULT 'PM Surya Ghar Muft Bijli Yojana',
  last_verified date NOT NULL DEFAULT '2026-11-15',
  source_url text NOT NULL DEFAULT 'https://pmsuryaghar.gov.in',
  max_residential_subsidy numeric(10,2) NOT NULL DEFAULT 78000,
  tier_1kw numeric(10,2) NOT NULL DEFAULT 30000,
  tier_2kw numeric(10,2) NOT NULL DEFAULT 60000,
  tier_3kw_plus numeric(10,2) NOT NULL DEFAULT 78000,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Public contact messages
CREATE TABLE IF NOT EXISTS photonix_ops.contact_message (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'responded')),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;
