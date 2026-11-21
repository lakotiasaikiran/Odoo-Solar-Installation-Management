BEGIN;
CREATE SCHEMA IF NOT EXISTS photonix_solarfit;
CREATE TABLE IF NOT EXISTS photonix_solarfit.catalog (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  packages jsonb NOT NULL, assumptions jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
-- Sprint 1 writes this handoff only after reviewer approval. Revoke an obsolete revision on re-survey.
CREATE TABLE IF NOT EXISTS photonix_solarfit.approved_survey (
  lead_id integer PRIMARY KEY, revision text NOT NULL, needs jsonb NOT NULL,
  approved_by uuid NOT NULL, approved_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS photonix_solarfit.quote (
  id uuid PRIMARY KEY, lead_id integer NOT NULL, revision text NOT NULL,
  sales_id uuid NOT NULL, snapshot jsonb NOT NULL, assumptions jsonb NOT NULL,
  valid_until timestamptz NOT NULL, reviewed_by uuid, review_reason text,
  accepted_at timestamptz, acceptance_reference text, issued_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS photonix_solarfit.confirmed_order (
  id uuid PRIMARY KEY, quote_id uuid UNIQUE NOT NULL REFERENCES photonix_solarfit.quote(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;