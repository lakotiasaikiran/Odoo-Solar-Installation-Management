# HelioDesk | System workflow and hackathon sprint plan

Planning date: 21 November 2026. All times are IST. Coding deadline: 22 November, 07:00. The master requirements checklist governs coverage. These timeboxes are estimates starting around 13:00, with one team working through the slices in order. All sprint acceptance tests below are planned.

## Walk one installation through the company

A homeowner asks for a subsidised 3 kW system. Use two fictional customers and two sites during the demo so customer isolation and correct asset selection can be demonstrated. Each handoff retains the installation, source document, responsible person, time, status and next action. One customer may have several installations.

| Step and owner | Work and decision | Output, exception and access |
| --- | --- | --- |
| 1. Customer or intake adviser | Submit a short English/Hindi enquiry online, or log a phone, WhatsApp or walk-in enquiry on the customer's behalf. Record contact, address, property, bill, demand, roof, budget, backup and payment needs as they become known. | CRM creates the lead and assigns sales follow-up. Show the public user a receipt. Retrieve personal history through authenticated access. Flag unowned or unattended leads. |
| 2. Sales adviser | Call the customer. Qualify shadow-free space, bill and grid suitability. Explain on-grid/off-grid options, preliminary sizing, subsidy and financing assumptions. | Qualified lead goes to a survey technician. Record the reason and next action if details are missing or the site is unsuitable. Only assigned sales staff and their manager access the sales case. |
| 3. Technician and technical reviewer | Technician records roof direction, tilt, usable area and cable distance. Reviewer checks findings, returns for correction or approves. | Final quote creation and sending require an approved survey for this site. A material change to measurements requires a new review. Record approver, time and version. |
| 4. Buyer, sales adviser and sales manager | SolarFit compares feasible 1–5 kW packages using demand, roof, backup, compatible components and dated supplier prices. Generate the complete hardware and installation bill of materials. Show cost, warranty, generation, savings, EMI and payback assumptions. | Customer sees gross price, estimated subsidy and effective cost. Finance and authorized sales staff see internal cost and margin. Missing costs or no feasible fit go to review. Snapshot the quote, validity and terms. Flag later price rises and below-floor margins for manager resolution before release. |
| 5. Customer, sales and finance | Customer accepts the chosen quote. Record advance or full payment against the order. Confirm the order. | Create one packing request and one planned crew job. A repeated confirmation must return the same work references. A planned appointment is visible before release. Finance owns the payment record. |
| 6. Subsidy coordinator, in parallel | Open an applicable case, collect private documents, record external reference and verified milestones from registration and feasibility through inspection, net metering, commissioning, claim and disbursement. | Assign each missing or rejected document and due action. Customer sees own progress. Only applicable pre-installation approvals block release. Later subsidy milestones continue after installation. |
| 7. Dispatcher, buyer and warehouse | SmartOps checks approved survey, requirements, acceptance, required payment, materials, compatibility, applicable approvals, qualified available crew, site and safety. Warehouse scans each required inverter, battery and controller serial before dispatch. | Show every blocker and its owner. Prevent overlapping assignments, dispatch with missing serials and release with a mandatory blocker. On actual delivery, associate each delivered unit with its installation and start its product-specific warranty once. Partial deliveries cover only delivered units. |
| 8. Assigned installer and customer | Installer uses a mobile job record for start/end time, installed size, quality and safety checklist, power-generation test and roof photos. Customer signs acceptance. | Store evidence against the installation and post actual labour and extra materials. Failed testing or missing acceptance leaves the job open with corrective work assigned. Installer accesses assigned sites only. |
| 9. Customer, support and service technician | Register a fault directly or with staff assistance. Look up the customer, site and unit, check coverage and severity, and assign repair. | Covered work is free. Give an estimate before chargeable work, then bill actual applicable parts and labour. Record replacements and service history. Ticket remains open until customer confirms resolution. A serial or QR identifies the unit; access to private details requires authorization. |
| 10. Finance and director, throughout | Reconcile invoices, advances, receivables, supplier purchases, technician pay, transport, rework and service costs by installation. Review jobs and repairs still open. | Daily, weekly and monthly summaries show estimated versus actual costs, revenue, collections and contribution separately. Report net profit only when its cost basis is available. Restrict financial exports and use recorded transactions to support totals. |

## Security and handoff rules

Use server-side checks for the acting role, customer/site scope, allowed fields and valid workflow state on each read, download, export and change. Apply the same rules to forms, direct requests and imports. Use private storage and authorized downloads for subsidy documents, photos and signatures. Validate file type and size, and keep document contents and credentials out of logs and Git. Limit repeated public submissions. Keep a dated history of approvals, price changes, deliveries, financial adjustments and access-sensitive changes. Use synthetic data for development and demos.

Show each profession its queue, blocker and next action. The director can see a delayed subsidy case without seeing identity documents. A customer may share their own quote without exposing supplier prices. Test both cases using the actual user roles.

## Timeboxed delivery

Each sprint delivers one working journey through interface, business rules, storage and permissions. Frontend work follows the user's design preferences. Backend work enforces rules independently of the interface. Workflow approved. Use React/Next.js, Node.js/Express and scoped WebSocket notifications. The database recommendation and integration test are recorded in ARCHITECTURE.md. The existing local Odoo installation is available for that decision.

| Sprint (IST) | Increment to demonstrate | Acceptance evidence before advancing |
| --- | --- | --- |
| 0 · Nov 21, 13:00–14:00 | Workflow approved and frontend/backend tools selected. Confirm visual direction and prove the local integration. Isolate the dev environment, create synthetic users, save and reload one record. | Confirm the chosen setup starts twice and retains the record. Verify an unauthorized user cannot read it. If choices are pending, keep implementation queued. |
| 1 · 14:00–16:00 | English/Hindi customer and assisted intake → assigned CRM lead → measured, reviewed survey. | Demo one assisted intake and one self-service intake. Return an incomplete survey, block a premature quote, approve corrected findings, deny access by a second customer. |
| 2 · 16:00–18:45 | SolarFit recommendation → costed package and transparent quote → acceptance and order. | Show a roof-constrained recommendation, an off-grid battery BOM, and a no-fit result. Recalculate a known cost example by hand. Simulate a supplier price rise and margin alert. Check customer-visible pricing and retry confirmation. |
| 3 · 18:45–21:45 | Subsidy case, required payment, packing and planned crew job → readiness → serial dispatch and delivery. | Show missing approval and scheduling conflict, resolve both, reject a missing serial, then prove a repeated partial delivery creates one warranty for each delivered unit. Verify another customer cannot download the case file. |
| 4 · 21:45–23:30 | Assigned mobile job → site checks and generation test → photos, time and customer signature. | Demo a failed check and correction. Verify acceptance, costs and evidence belong to the right installation. An unassigned installer cannot change the job. |
| 5 · 23:30–Nov 22, 01:15 | Equipment history → complaint → covered or chargeable service → customer-confirmed closure. | Run a covered fault and an expired-warranty fault. Verify zero customer charge on one, estimate and one parts/labour bill on the other. |
| 6 · 01:15–03:30 | Finance and director review, invoices, subsidy follow-up, unfinished work, repairs and shareable performance views. | Reconcile one profitable and one loss-making fixture to recorded costs and sales. Record a partial payment and verify revenue, cash and outstanding balance separately. Check date filters and export access. |
| 7 · 03:30–05:30 | Replay the complete official workflow and SolarFit scenario. Fix integration, permission, mobile and language defects. | Cross-check all 22 official checklist items against evidence, replay earlier acceptance tests and record unresolved gaps. Time the quote and work-queue paths on the demo data. |
| Release · 05:30–06:45 | Freeze feature work. Rehearse from a clean start, review evidence and prepare the submission. | Two-role handoff demo, verified release revision and honest list of limitations. Reserve 06:45–07:00 for submission contingency. |

### Review rule for every sprint

1. Pick the smallest demonstrable case, its owner and its pass condition. Build the user action, server rule and persisted result together.
2. Reserve roughly the last quarter of each timebox for testing, bug fixes and review. Exercise the successful path, a blocked business transition, and a forbidden role or record. Test retries for operations that create money, assets or downstream jobs.
3. For a failure, record reproduction steps, expected/actual result and impact. Fix it, rerun its test and replay the upstream handoff. Keep the checklist item open until the evidence passes.
4. Review the working increment, record pass or hold, and identify one adjustment for the next sprint. Data exposure, incorrect billing or warranty, broken handoffs and failed mandatory gates hold progression. If a slot overruns, reforecast the remaining time immediately. Simplify UI polish and defer P2 expansion first. Report any mandatory gap explicitly.
5. Source of truth for remaining work: HelioDesk Requirements.txt. Keep additional P1/P2 items visible in the backlog. Pull them forward only after the dependent official path passes and the release buffer is protected.

### Hourly GitHub evidence

Proposed publication targets: 13:45 IST on Nov 21, then every hour at :45 through 06:45 IST on Nov 22. Align the first checkpoint earlier if the hackathon's official reporting clock requires it. At :35 prepare the real local change, current test result, bugs and next step. Planning documents count as planning evidence; label incomplete code as work in progress. Keep each checkpoint useful even if the sprint is still open.

Before each GitHub operation, request the user's permission for the exact action and destination. For each approved push, record the commit identifier, time and confirmed remote result. If permission or connectivity is pending, keep the local evidence and show the missed remote checkpoint accurately. Use the first authorized checkpoint to establish the repository connection if necessary. The schedule itself does not publish changes.

## Official problem statement acceptance checks

Use each numbered item as a sprint review check. Record the observed result before marking the master checklist. Sprint 7 replays all checks.

1. Sprint 1 — Keep a sales record for enquiries received through WhatsApp, calls, and the web form. Web submissions must reach sales immediately with the customer's name, phone, address, and needs, including a subsidy request when applicable.
2. Sprint 1 — Record the qualification call covering shadow-free roof area, monthly electricity bill, and grid suitability.
3. Sprint 1 — For a suitable site, record the technician's survey findings on roof direction, tilt, and cable distance.
4. Sprint 1 — Allow a quote to be sent to the customer only after survey approval.
5. Sprint 2 — Offer a solar panel hardware set with panels, connectors, and wires, plus an installation service covering on-site fitting and testing.
6. Sprint 2 — Support on-grid and off-grid systems from 1 kW to 5 kW. The on-grid kit includes panels, inverter, wiring boxes, charge controller, safety earthing, and metal stands. The off-grid kit adds a storage battery.
7. Sprint 2 — Generate quotes from ready-made templates. The selected package and capacity must supply the complete parts list, including switches, wiring, and safety parts.
8. Sprint 3 — Record an advance or full payment before work starts when paid. The brief describes this as the usual payment flow.
9. Sprint 2 — On order confirmation, automatically give the warehouse its packing list and put the installation job on the crew's schedule.
10. Sprint 3 — Track stock for high-value equipment such as panels, inverters, and batteries.
11. Sprint 3 — Require a serial scan for every inverter, battery, and charge controller before it leaves the warehouse. Link each dispatched unit to its customer.
12. Sprint 3 — On completed delivery, automatically start the warranty for each serial number using the applicable product term. Example terms in the brief are 2 years for an inverter or battery and 20 years for a panel.
13. Sprint 4 — Support the crew's field workflow through mounting stands, laying panels, connecting boxes, completing earthing, and testing power generation.
14. Sprint 4 — Provide a phone- or tablet-friendly completion form for start time, finish time, installed system size, and finished-roof photos.
15. Sprint 4 — Capture the customer's on-screen acceptance signature and retain it with the installation record as proof of work.
16. Sprint 5 — Open a complaint ticket and quickly retrieve the customer's installation, exact equipment serial number, and warranty status.
17. Sprint 5 — Provide an in-warranty repair or replacement at no charge. Automatically bill parts and labour for an out-of-warranty repair.
18. Sprint 5 — Track the ticket until the customer confirms the system works.
19. Sprint 6 — Track advances, send invoices, record stock purchases, capture technician hours, and track technician pay.
20. Sprint 3 — Track government subsidy paperwork and outstanding steps for each customer.
21. Sprint 6 — Show revenue, costs, and profit or loss for each installation so the director can identify profitable and loss-making jobs.
22. Sprint 6 — Provide daily, weekly, and monthly views of performance, unfinished installations, and open repairs. Allow the director to share the figures.