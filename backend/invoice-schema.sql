BEGIN;
CREATE TABLE IF NOT EXISTS photonix_ops.invoice (
 job_id uuid PRIMARY KEY REFERENCES photonix_ops.installation_job(id),
 number bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
 amount numeric(12,2) NOT NULL CHECK(amount>0),
 issued_by uuid NOT NULL REFERENCES photonix_auth.account(id),
 issued_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS photonix_ops.receipt (
 id uuid PRIMARY KEY, job_id uuid NOT NULL REFERENCES photonix_ops.invoice(job_id),
 amount numeric(12,2) NOT NULL CHECK(amount>0),
 method text NOT NULL CHECK(method IN ('bank','upi','cash','card')),
 recorded_by uuid NOT NULL REFERENCES photonix_auth.account(id),
 recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS receipt_job_idx ON photonix_ops.receipt(job_id);
GRANT SELECT,INSERT ON photonix_ops.invoice,photonix_ops.receipt TO photonix_api;
GRANT UPDATE(job_id) ON photonix_ops.invoice TO photonix_api;
GRANT USAGE ON SEQUENCE photonix_ops.invoice_number_seq TO photonix_api;
COMMIT;