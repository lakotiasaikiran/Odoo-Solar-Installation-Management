-- First local workflow: one CRM enquiry per intake, with its technical survey.
-- Contact details are entered once and referenced by enquiry_id thereafter.
PRAGMA foreign_keys = ON;

CREATE TABLE enquiry (
    id INTEGER PRIMARY KEY,
    received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    channel TEXT NOT NULL CHECK (channel IN ('web', 'phone', 'walk_in', 'whatsapp')),
    language TEXT NOT NULL CHECK (language IN ('en', 'hi')),
    assisted_by TEXT,
    customer_name TEXT NOT NULL CHECK (length(trim(customer_name)) > 0),
    phone TEXT NOT NULL CHECK (length(trim(phone)) > 0),
    site_address TEXT NOT NULL CHECK (length(trim(site_address)) > 0),
    customer_needs TEXT NOT NULL CHECK (length(trim(customer_needs)) > 0),
    property_type TEXT CHECK (property_type IN ('residential', 'commercial')),
    monthly_consumption_kwh REAL CHECK (monthly_consumption_kwh >= 0),
    monthly_bill_inr REAL CHECK (monthly_bill_inr >= 0),
    available_roof_m2 REAL CHECK (available_roof_m2 >= 0),
    budget_inr REAL CHECK (budget_inr >= 0),
    backup_needs TEXT,
    preferred_payment_method TEXT,
    subsidy_requested INTEGER CHECK (subsidy_requested IN (0, 1)),
    shadow_free_roof_m2 REAL CHECK (shadow_free_roof_m2 >= 0),
    grid_suitability TEXT CHECK (grid_suitability IN ('suitable', 'unsuitable', 'unknown'))
) STRICT;

CREATE TABLE site_survey (
    enquiry_id INTEGER PRIMARY KEY REFERENCES enquiry(id),
    technician TEXT NOT NULL CHECK (length(trim(technician)) > 0),
    roof_direction TEXT,
    tilt_degrees REAL CHECK (tilt_degrees BETWEEN 0 AND 90),
    cable_distance_m REAL CHECK (cable_distance_m >= 0),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by TEXT,
    CHECK (status <> 'approved' OR (
        length(trim(coalesce(roof_direction, ''))) > 0
        AND tilt_degrees IS NOT NULL AND cable_distance_m IS NOT NULL
        AND length(trim(coalesce(approved_by, ''))) > 0
    ))
) STRICT;

-- Input for final quotation generation once pricing and templates are implemented.
CREATE VIEW quotation_eligible_enquiry AS
SELECT enquiry.*
FROM enquiry
JOIN site_survey ON site_survey.enquiry_id = enquiry.id
WHERE site_survey.status = 'approved';
