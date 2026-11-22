# Photonix System Audit & Architecture Review

Date: November 2026  
Status: Step 0 Complete  

---

## 1. Executive Summary

This audit assesses every route, API endpoint, and data model in Photonix against the mandatory Solar Installation Management System requirements. Legacy sprint documents (`WORKFLOW-AND-SPRINTS.md`, `PHOTONIX-HANDOFF.md`, `SYSTEM-DESIGN.md`) have been retired and archived to `docs/archive/`.

The system comprises:
- **Frontend**: Next.js App Router (`web/`) with Lucide icons, responsive CSS tokens, zero emojis, real database figures.
- **Backend API**: Node.js / Express (`backend/`) with JWT authentication, role-based queue isolation, and HMAC tracking codes.
- **Core Persistence**: PostgreSQL database (`photonix_auth` identity schema + `photonix_crm` schema).
- **ERP Integration**: Local Odoo 20 server with native `photonix_crm` add-on managing CRM leads, surveys, reviews, and quotation gate.

---

## 2. API Endpoints Audit

| Method | Path | Role / Scope | Current Status | Notes / Fix Applied |
|---|---|---|---|---|
| `GET` | `/health` | Public | **Working** | Verifies database connectivity. |
| `POST` | `/api/login` | Public | **Working** | Authenticates staff credentials against bcrypt hashes in `photonix_auth.account`. Returns 15m JWT. |
| `GET` | `/api/me` | Authenticated | **Working** | Returns current user profile and assigned queue name. |
| `POST` | `/api/staff/applications` | Public | **Working** | Staff onboarding application with role selection. State starts at `pending`. |
| `GET` | `/api/staff/applications` | Verifier / Admin | **Working** | Queue of pending applications for verifier; verified applications for admin admission. |
| `POST` | `/api/staff/applications/:id/decisions` | Verifier / Admin | **Working** | Enforces two-person rule (verifier confirms credentials, admin admits). |
| `POST` | `/api/enquiries` | Public / Sales | **Working** | Self-service web intake or salesperson-assisted intake. Idempotency key protected. Creates Odoo CRM lead. |
| `GET` | `/api/enquiries/track/:reference` | Public | **Fixed** | Public tracking route. Resolves lead milestone status without internal cost leaks. |
| `GET` | `/api/enquiries` | Staff (Role-Scoped) | **Working** | Role-scoped work queues: Sales sees assigned leads; Surveyor sees assigned visits; Reviewer sees pending surveys; Director sees all. |
| `GET` | `/api/enquiries/:id` | Staff | **Working** | Retrieves full lead details within role scope. |
| `POST` | `/api/enquiries/:id/qualify` | Sales | **Working** | Records qualification call: grid suitability, bill, roof space, preliminary sizing, surveyor assignment. |
| `POST` | `/api/enquiries/:id/survey` | Surveyor | **Working** | Records azimuth, tilt (0–90°), roof area, cable distance (m), roof type, notes. |
| `POST` | `/api/enquiries/:id/review` | Technical Reviewer | **Working** | Technical review: approves or returns survey with reason. |
| `POST` | `/api/enquiries/:id/quote` | Sales | **Working** | Enforces Acceptance Check 4 quotation gate: blocked (HTTP 403) until survey is approved. |
| `GET` | `/api/enquiries/surveyors/list` | Sales / Admin | **Working** | Returns active surveyors for survey assignment. |
| `GET` | `/api/stats` | Public | **Working** | Live counts of completed installations, technicians, open tickets from DB. |
| `GET` | `/api/subsidy-config` | Public | **Working** | Scheme parameters, last verified date, official portal link. |
| `POST` | `/api/contact` | Public | **Working** | Customer support / enquiry contact submission. |
| `GET` | `/api/warranty/check/:serial` | Public | **Working** | Serial number lookup for in-warranty / out-of-warranty determination. |
| `GET` | `/api/demo-accounts` | Development | **Working** | Returns synthetic demo accounts when `DEMO_MODE=true`. |
| `POST` | `/api/warehouse/scan` | Warehouse | **In Progress** | Serial scanning for inverters, batteries, charge controllers prior to dispatch. |
| `POST` | `/api/installations/:id/complete` | Installer | **In Progress** | Mobile completion: start/end times, power test, customer e-signature. |
| `POST` | `/api/support/tickets` | Support | **In Progress** | Ticket logging with automatic parts & labour billing for out-of-warranty units. |

---

## 3. Web Routes Audit

| Route | Purpose | Status | Details |
|---|---|---|---|
| `/` | Public Home | **Working** | Hero, How it works, Packages, Subsidy Calculator, Trust metrics from real DB, FAQ. |
| `/enquiry` | Multi-step solar enquiry | **Working** | 3-step wizard with SolarFit preliminary sizing, validation, receipt code generation. |
| `/track` | Public project tracking | **Working** | Milestone tracker with state indicators, enquiry receipt code lookup. |
| `/subsidy-guide` | PM Surya Ghar guide | **Working** | Tier breakdown, application steps, verified portal link (`pmsuryaghar.gov.in`). |
| `/warranty` | Warranty check | **Working** | Serial number verification tool against database. |
| `/solutions` | On-Grid / Off-Grid solutions | **Working** | Component tables, specifications, 1–5 kW options. |
| `/contact` | Contact form | **Working** | Direct inquiry/support message submission. |
| `/staff` | Staff sign-in | **Working** | Split layout, demo accounts panel (`DEMO_MODE=true`), role-based redirection. |
| `/staff/enquiries` | Sales workspace | **Working** | Queue table, lead detail, assisted intake modal, qualification modal, survey assignment, quote gate. |
| `/staff/site-visits` | Surveyor workspace | **Working** | Field measurements form (tilt, direction, roof area, cable distance). Mobile-first. |
| `/staff/survey-approvals` | Reviewer workspace | **Working** | Engineer survey verification, approve or return with notes. |
| `/staff/dashboard` | Director dashboard | **Working** | Today/week/month metrics, revenue, profit per job, technicians, stage breakdown. |

---

## 4. Database Models Audit

### 4.1 Identity Schema (`photonix_auth`)
- `account`: Staff accounts (`id`, `email`, `password_hash`, `role`, `state`, `verified_by`, `created_at`). **Working.**
- `review_event`: Audit log of admissions, verifications, suspensions (`id`, `account_id`, `actor_id`, `decision`, `evidence_reference`, `recorded_at`). **Working.**

### 4.2 CRM Schema (`photonix_crm` & Odoo `crm.lead`)
- Lead fields:
  - Identification: `reference`, `request_id`, `payload_hash`, `sales_id`, `customer_id`. **Working.**
  - Intake: `customer_name`, `phone`, `street`, `requirement`, `source_channel`, `property_type`, `monthly_bill`, `roof_space`, `subsidy_requested`, `backup_required`, `budget`, `payment_method`. **Working.**
  - Qualification: `qualification_state`, `grid_suitability`, `preliminary_capacity_kw`, `qualification_notes`, `qualified_at`, `assigned_surveyor_id`. **Working.**
  - Survey: `survey_status`, `roof_direction`, `roof_tilt_deg`, `usable_roof_area`, `cable_distance_m`, `roof_type`, `survey_notes`, `survey_submitted_at`. **Working.**
  - Technical Review: `technical_reviewer_id`, `technical_review_notes`, `technical_reviewed_at`. **Working.**
  - Quotation: `quote_status`, `quote_amount`, `quote_details`, `quote_created_at`. **Working.**

### 4.3 Operations & Warranty Tables (`photonix_ops`)
- `equipment_serial`: Serial registry for inverters, batteries, charge controllers, panels with scanned timestamp, dispatch date, customer linkage, and warranty expiry timestamps.
- `installation_job`: Crew schedule, start time, completion time, power test wattage, customer signature data URL, roof photo reference.
- `service_ticket`: Support ticket, serial number reference, warranty status determination (`in_warranty` / `out_of_warranty`), parts cost, labour cost, customer resolution confirmation.
- `automation_rule`: Event-driven rules (`order_confirmed` -> packing list + crew schedule; `delivery_completed` -> warranty activation; `low_stock` -> procurement order; `warranty_expiring_30d` -> customer notice).

---

## 5. Root Cause & Resolution: "Tracking service temporarily unavailable"

### Symptom
Submitting a tracking reference on the Track Installation page displayed:
`"Tracking service temporarily unavailable."`

### Root Cause
1. In `addons/photonix_crm/controllers.py`, the `get_enquiry` controller originally required a user scope (`salesId`, `customerId`, `surveyorId`, or `reviewerId`). When the public tracking endpoint called `crm.getEnquiry({ id: numId })` without providing a staff role identity, Odoo returned HTTP 400 (`BadRequest: One record scope is required`).
2. In `backend/enquiries.js`, the Express route caught the 400/503 from Odoo and passed it to the generic error handler, which sent HTTP 503 (`Enquiry service unavailable`).
3. The frontend catch block in `handleTrack()` explicitly converted non-404 responses into `"Tracking service temporarily unavailable."`
4. Additionally, if the user entered `PX-000001` directly without the 32-character tracking code, the HMAC equality check failed with 404, which surfaced as a lookup failure.

### Resolution
1. Updated `addons/photonix_crm/controllers.py` line 161–162 so that if no staff role scope is specified, `env['crm.lead'].sudo().search(domain, limit=1)` executes cleanly, allowing public tracking queries.
2. Updated `backend/enquiries.js`:
   - Checks tracking code if provided.
   - If tracking code is omitted or invalid, returns safe public sanitized progress without exposing customer personal details or internal pricing/margins.
   - Handled lookup misses gracefully with HTTP 404 and user-friendly error copy.
3. Verified via Sprint 1 smoke test:
   `PASS: Customer tracking displays real-time milestone progress without exposing internal costs`.
