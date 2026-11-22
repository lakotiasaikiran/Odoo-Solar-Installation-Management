BEGIN;

CREATE SCHEMA IF NOT EXISTS photonix_auth;
CREATE SCHEMA IF NOT EXISTS photonix_ops;

-- Customer accounts for portal sign-in and self-service
CREATE TABLE IF NOT EXISTS photonix_auth.customer (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text UNIQUE NOT NULL,
  name text NOT NULL,
  email text,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);

-- Invoices scoped strictly to individual customers
CREATE TABLE IF NOT EXISTS photonix_ops.customer_invoice (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  customer_id uuid REFERENCES photonix_auth.customer(id),
  customer_phone text NOT NULL,
  customer_name text NOT NULL,
  customer_address text NOT NULL,
  enquiry_reference text NOT NULL,
  lead_id bigint,
  system_capacity_kw numeric(5,2) NOT NULL,
  milestone text NOT NULL DEFAULT 'advance_20',
  milestone_label text NOT NULL DEFAULT '20% Advance Booking & Procurement Fee',
  gross_system_cost numeric(12,2) NOT NULL,
  subsidy_amount numeric(12,2) NOT NULL DEFAULT 0,
  net_project_cost numeric(12,2) NOT NULL,
  invoice_taxable_amount numeric(12,2) NOT NULL,
  tax_rate_percent numeric(5,2) NOT NULL DEFAULT 13.80,
  tax_amount numeric(12,2) NOT NULL,
  total_invoice_amount numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'cancelled')),
  payment_method text CHECK (payment_method IN ('bank_transfer', 'upi', 'cheque', 'card')),
  payment_reference text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  due_date date NOT NULL DEFAULT (CURRENT_DATE + interval '7 days')
);

CREATE INDEX IF NOT EXISTS customer_invoice_phone_idx ON photonix_ops.customer_invoice(customer_phone);
CREATE INDEX IF NOT EXISTS customer_invoice_ref_idx ON photonix_ops.customer_invoice(enquiry_reference);

GRANT USAGE ON SCHEMA photonix_auth, photonix_ops TO photonix_api;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA photonix_auth TO photonix_api;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA photonix_ops TO photonix_api;

COMMIT;
