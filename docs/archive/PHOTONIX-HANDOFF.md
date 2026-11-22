# Photonix project handoff

## Project and priorities

Photonix is a rooftop solar installation management system for Indian installers. It covers customer enquiry, technical survey, quotation, payments, procurement, dispatch, installation, warranty service and project profitability. The problem statement and all 22 official acceptance checks take precedence. SolarFit is the primary differentiator. It should show which 1–5 kW options fit the roof and budget, what the customer would pay, and whether the installer can deliver at an acceptable margin.

Each profession gets a queue, relevant actions and server-enforced access. An enhancement should name the recurring problem, who encounters it, what decision improves and how to measure the result. Keep the customer and judge experience simple. Explain one successful handoff and one blocked decision. Work locally before publishing and ask the owner before each GitHub action.

## Work completed from planning through Sprint 0

- Consolidated the official requirements and enhancements, with P0–P2 priorities and a sprint-by-sprint plan. Built a role-based workflow that covers sales, survey, purchasing, warehouse, subsidy, installation, service, finance and management.
- Chose React and Next.js, Node.js and Express, Odoo 20 for business records, and PostgreSQL for persistence. Documented scoped WebSocket updates and Razorpay Test Mode for later sprints.
- Built the Express identity API. Public staff applications request an eligible role, a verifier records an independent evidence reference, and an administrator admits that verified application. Login issues a short-lived JWT. The API checks the current role and active status. PostgreSQL records review decisions. Role and state are revalidated during approval to avoid an authorization race.
- Built the local CRM add-on and working intake path. The Next.js customer form sends an enquiry through Express to a native Odoo CRM lead. The customer receives a reference. The assigned salesperson signs in and reads the enquiry in the staff queue. A stable request key prevents duplicate CRM leads on retry. Reusing the key with different details produces a conflict.
- Set up isolated local identity and CRM databases. The current demo runs on loopback. Local runtime settings and synthetic staff credentials are stored outside the source tree. No real customer information is needed for the demo.

## Sprint 0 evidence

- Next.js production build and two request-key tests passed.
- Both web routes responded on port 3200. Submitted a new synthetic enquiry through the Next.js API proxy and found exactly one copy in the assigned queue.
- The persisted lead PX-000001 survived an Express restart and an isolated Odoo restart. A second synthetic enquiry received PX-000002 through Next.js.
- Concurrent replays returned the original reference. Different details under the same key were rejected. Anonymous readers, a verifier, and an unassigned salesperson were denied access to the protected record or queue.
- The admission suite exercises pending accounts, independent review, concurrent decisions and suspension. Local data and test keys stay out of the repository.

## Review and resume

Project folder: C:\Users\saiki\Desktop\Odoo-SIMS

- Open http://127.0.0.1:3200 for enquiry intake and http://127.0.0.1:3200/staff for staff sign-in.
- From PowerShell at the project root, run .\start-sprint0.ps1 -Smoke while the isolated databases are running. The script tests the real Express-to-CRM path and uses synthetic records.
- For a fresh setup, install backend and web dependencies with npm ci in each folder. From the root, run backend\setup-identity.ps1, then run scripts\odoo-dev.py start with the bundled Odoo Python. In web, run npm run build. From the root, run .\start-sprint0.ps1.
- Synthetic sign-in accounts are stored in the current Windows user's Photonix local application data under identity-dev\demo-accounts.json. Do not share that file or runtime.env.

## Start of Sprint 1

The next slice takes an assigned lead through sales qualification, technician survey and independent technical approval, then enforces the final-quotation gate. Assisted intake, full Hindi workflow acceptance, SolarFit offers, checkout, push updates, subsidy milestones and field operations have their own upcoming acceptance checks. The Sprint 0 test suite demonstrates a working local path. A full interactive browser automation run and customer account portal are pending.

The GitHub repository is lakotiasaikiran/Odoo-Solar-Installation-Management. The previously published workflow and architecture image predate this Sprint 0 implementation. Ask the owner before any GitHub operation.

## Copy-ready prompt for another assistant

Review Photonix's architecture and completed Sprint 0 summary above. Give feedback on the smallest Sprint 1 implementation that gets an assigned lead through survey review and prevents a final quote before approved measurements. For each idea, name the role, recurring problem, decision, proof of success and implementation cost. Identify any requirement or test we missed. Keep the existing Next.js, Express, Odoo and PostgreSQL architecture and prioritise a clear judge demo. Treat future features as backlog until their acceptance checks pass.