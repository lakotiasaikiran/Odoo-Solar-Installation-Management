BEGIN;
CREATE SCHEMA IF NOT EXISTS photonix_auth;
CREATE TABLE IF NOT EXISTS photonix_auth.account (
  id uuid PRIMARY KEY,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin','verifier','sales','surveyor','buyer','warehouse','installer','dispatcher','support','finance','manager','director','subsidy','technical_reviewer','service_technician')),
  state text NOT NULL CHECK (state IN ('pending','verified','active','rejected','suspended')),
  verified_by uuid REFERENCES photonix_auth.account,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (verified_by <> id)
);
CREATE TABLE IF NOT EXISTS photonix_auth.review_event (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES photonix_auth.account,
  actor_id uuid NOT NULL REFERENCES photonix_auth.account,
  decision text NOT NULL CHECK (decision IN ('verify','admit','reject','suspend')),
  evidence_reference text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  CHECK (account_id <> actor_id)
);

CREATE SCHEMA IF NOT EXISTS photonix_crm;
CREATE TABLE IF NOT EXISTS photonix_crm.enquiry (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reference text UNIQUE NOT NULL,
  request_id text UNIQUE NOT NULL,
  payload_hash text NOT NULL,
  sales_id uuid NOT NULL REFERENCES photonix_auth.account(id),
  customer_id uuid,
  customer_name text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  requirement text NOT NULL,
  source_channel text NOT NULL DEFAULT 'web' CHECK (source_channel IN ('web', 'call', 'whatsapp', 'walkin')),
  property_type text NOT NULL DEFAULT 'residential' CHECK (property_type IN ('residential', 'commercial')),
  monthly_bill numeric(12,2) DEFAULT 0,
  roof_space numeric(12,2) DEFAULT 0,
  subsidy_requested boolean DEFAULT true,
  backup_required text DEFAULT 'essential' CHECK (backup_required IN ('none', 'essential', 'full')),
  budget numeric(12,2) DEFAULT 0,
  payment_method text DEFAULT 'milestone' CHECK (payment_method IN ('cash', 'loan_emi', 'milestone')),
  
  -- Qualification (Acceptance Check 2)
  qualification_state text NOT NULL DEFAULT 'new' CHECK (qualification_state IN ('new', 'qualified', 'unsuitable')),
  grid_suitability text CHECK (grid_suitability IN ('suitable', 'unsuitable', 'voltage_unstable', 'upgrade_needed')),
  preliminary_capacity_kw numeric(4,2),
  qualification_notes text,
  qualified_at timestamptz,
  assigned_surveyor_id uuid REFERENCES photonix_auth.account(id),

  -- Survey findings (Acceptance Check 3)
  survey_status text NOT NULL DEFAULT 'unassigned' CHECK (survey_status IN ('unassigned', 'assigned', 'submitted', 'changes_requested', 'approved')),
  roof_direction text CHECK (roof_direction IN ('south', 'south_west', 'south_east', 'east', 'west', 'north')),
  roof_tilt_deg numeric(5,2),
  usable_roof_area numeric(12,2),
  cable_distance_m numeric(6,2),
  roof_type text CHECK (roof_type IN ('rcc_flat', 'tin_shed', 'tiled_pitched', 'asbestos', 'other')),
  survey_notes text,
  survey_submitted_at timestamptz,

  -- Technical Review (Acceptance Check 4)
  technical_reviewer_id uuid REFERENCES photonix_auth.account(id),
  technical_review_notes text,
  technical_reviewed_at timestamptz,

  -- Quotation Gate (Acceptance Check 4)
  quote_status text NOT NULL DEFAULT 'locked' CHECK (quote_status IN ('locked', 'draft', 'sent')),
  quote_amount numeric(12,2),
  quote_details jsonb,
  quote_created_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;
