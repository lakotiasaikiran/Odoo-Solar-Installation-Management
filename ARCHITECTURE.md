# Photonix architecture blueprint
Planning baseline for local development

## 1. Decide what the first release must prove

Working hypothesis: a sales adviser can quote an oversized or underpriced system because roof measurements, customer needs and current equipment costs are checked at different times. This can make the customer overpay or leave the installer with an unprofitable job. Validate the hypothesis against real cases when available. The brief also requires dispatch, installation, warranty, service and management reporting.

First proof: an approved survey and a priced bill of materials produce an understandable, affordable and commercially viable quote. A salesperson can explain the proposed size, price and assumptions. An unsuitable or unprofitable option has a specific reason and an owner who can resolve it.

## 2. Establish the development environment first

- Source folder: C:\Users\saiki\Desktop\Odoo-SIMS. Keep custom code under addons\photonix. Use the same source with the user's preferred editor.
- Verified installation: C:\Program Files\Odoo 20.0.20261117, bundled Python 3.12.3, PostgreSQL installation and server\odoo-bin. The current configuration lists the bundled add-ons folder and D:\workspace. The Desktop project is outside both entries.
- Proposed development environment: a dedicated local database named photonix_dev and a separate Odoo development process bound to 127.0.0.1 on a free port such as 8070. Use the installed Python, server and existing PostgreSQL connection settings. Pass the current add-ons paths plus the Desktop project's addons directory as a development launch override. Restrict database selection to the development database. Keep credentials outside project files.
- Setup order: verify database access and free port, create the add-on skeleton, create the development database, start the isolated process, install Photonix and its declared dependencies, then restart and test an upgrade. Create role-specific test users and synthetic records in the development database.
- Environment acceptance: Apps discovers Photonix from the Desktop folder, the module installs and upgrades in the development database, and a test lead persists across a restart. Record the working launch command once verified.
- Runtime direction following workflow approval: React with Next.js for customer and role-specific employee screens. Node.js with Express handles browser API requests and scoped WebSocket notifications. PostgreSQL is the recommended database because the local Odoo system already uses it. Proposed integration: use Odoo for business records, transactions and access rules. Express calls a supported Odoo application interface with the acting user's permissions. Verify that interface in the local edition before extending it to further workflows.
- Persist an action before notifying subscribers. Authorize subscriptions by role and installation, send minimal change notices, and reload the authorized state after reconnecting. Ordinary submissions use HTTP.
- Design direction: use Figma for the mobile enquiry, employee queue and customer progress views. Start with English/Hindi labels and visible status text. Use brief transitions for feedback and respect reduced-motion settings. Optional Gemini-generated illustrations are prepared during design and bundled as static assets.
- First integration test: submit a fictional enquiry in Next.js, receive it in Express, persist it once in Odoo CRM, and see it in the assigned sales queue after refresh. A second customer cannot retrieve the record or receive its update. onboarding.sql is a reference prototype. Reimplement its useful rules in the Odoo workflow. The blueprint is a plan. Database creation, add-on installation and role tests are pending.

## 3. Give each profession a decision and a work queue

| User | Work they see and own | Handoff or access boundary |
| --- | --- | --- |
| Customer | English/Hindi enquiry, options and assumptions, own project progress, acceptance and service requests | Access only their own authorized records. Procurement prices and margins are internal. |
| Sales adviser | Assigned new leads, assisted intake, follow-ups, needs, preliminary sizing and approved-survey quotes | Request a survey. Final pricing uses approved measurements. A manager reviews low margins. |
| Survey technician / technical reviewer | Assigned site visits, direction, tilt, roof area, cable run and grid suitability | Technician submits measurements. Authorized reviewer approves or returns them with a reason. |
| Buyer | Supplier offers, compatible alternatives, costs and lead times | Supply dated costs to SolarFit. Technical staff validate substitutions. |
| Warehouse operator | Confirmed packing lists, stock shortages and serial scanning | Validate delivery against the customer order. Delivery starts each applicable unit warranty. |
| Subsidy coordinator | Protected case documents, reference numbers, evidence, pending milestone and owner | Publish customer-safe progress. Applicable approvals feed readiness. |
| Dispatcher / installer | Dispatcher sees blockers and schedules. Installer sees assigned site, job and safety checklist | Confirmation creates a planned job. Release depends on readiness. Installer records time, photos, test outcome and acceptance. |
| Service adviser / technician | Complaint, installed unit, coverage, estimates and assigned repair | Covered repairs are free. Show chargeable estimates before work, bill the applicable parts and labour, and close on customer confirmation. |
| Finance / director | Finance tracks costs, advances, receivables and invoices. Director sees job profitability, unfinished work and exceptions | Distinguish margin, net profit and cash received. Give summary access separately from document access. |

A small company can assign several roles to one person. Use Odoo groups, model permissions, field access restrictions and record rules. Test cross-customer and cross-assignment access as well as legitimate handoffs.

## 4. Keep a single record chain

Use one Photonix add-on initially. Extend CRM leads for intake, link surveys and approvals to the enquiry, link sale orders to the approved survey and price snapshot, and link fulfilment and actual costs to the confirmed order/project. One customer may have several sites and installations. Use installation-level links for assets, subsidy cases and service history.

Reuse native contacts, CRM, products, supplier prices, quotations, stock deliveries and lots/serials, project tasks, timesheets and invoice records where applicable. Add solar-specific records for survey decisions, versioned sizing and pricing assumptions, subsidy milestones, job readiness and installed-unit warranties where needed. Verify local availability and licensing before selecting a module for service workflows.

Enforce transitions on the server for UI, import and programmatic writes. Check approval before final quote creation and sending. Preserve the issued quote's assumptions and dated prices. Surface price changes for review. Confirmation creates packing and planned work once. Readiness controls job release. Delivery starts warranties once per delivered unit. Use actual expenses for project reporting. Test retries, partial deliveries and multiple installations for the same customer.

## 5. Build in demonstrable slices

1. Intake to survey approval. Capture a bilingual or assisted enquiry, assign an owner, collect needs, submit a survey and approve or return it. Show the final-quote gate and outstanding action.
2. SolarFit quote. Compare suitable 1–5 kW packages against demand, roof, budget and backup needs. Show gross price, conditional subsidy, effective price, estimated savings and estimated payback with dated assumptions. Use current supplier data and a complete parts list to calculate expected contribution. Show the impact of a price change and the margin-floor response.
3. Confirm to acceptance. Pack by order, reserve qualified staff, show exact blockers, scan serials, record delivery and warranty starts, then capture mobile installation evidence and signature. Include applicable subsidy milestones in readiness.
4. Service to financial review. Retrieve the installed unit, handle both warranty outcomes, and reconcile job revenue, costs and collections. Deliver the remaining official workflows and track every item against the master checklist. Schedule further enhancements using its P0/P1/P2 priorities.

## 6. Judge demonstration and measurement

Use a labelled synthetic residential enquiry requesting 3 kW. The adviser records it; the technician finds a roof constraint; the adviser sees which package fits and why. Show the same quote after a supplier price rise and let the reviewer see how customer price and expected contribution change. Demonstrate a blocked transition and its resolution live. A data gap should produce a visible unknown or blocker.

For this slice, measure time from enquiry to first response, percentage of final quotes linked to an approved survey, and expected contribution per quoted installation. Later compare accepted estimates with actual completed-job costs. A demo proves the rule works; business improvement requires historical or pilot data.

Keep the interactive quote calculation local. Snapshot external assumptions before use and move reminders and summaries off the interactive path. Measure quote calculation and queue load times with a representative dataset before choosing a performance target or adding infrastructure.
