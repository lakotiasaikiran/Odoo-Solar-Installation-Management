# Photonix SolarFit backend handoff

SolarFit reads the assigned lead and current approved survey directly from Odoo. The revision captures reviewer, timestamps, measurements and pricing inputs. Usable roof area is converted from square feet to square metres. Electricity usage is estimated from the monthly bill and configured tariff. The customer tracking code on the receipt is private.

Sales staff use POST /api/solarfit/leads/{id}/compare and /quote. Quote takes packageId. Both require a sales token and assigned CRM lead. Compare returns internal option economics. For customer screens expose only public pricing, specs, assumptions, subsidy, savings and warranty through a separately authorized customer projection. Never forward internal costs or margins to a customer.

A manager can POST /api/solarfit/quotes/{id}/review with reason. Sales records acceptance with POST /api/solarfit/quotes/{id}/accept and acceptanceReference. Server checks current survey revision, expiry, BOM changes, procurement increases and margin review. Repeat acceptance returns the same order ID. The confirmed_order row is the database handoff for Sprint 3 fulfilment. Warehouse packing and crew scheduling belong to the downstream consumer.

The local catalogue contains 30 explicitly synthetic fixtures across 1–5 kW, two system types and three tiers. Every kit includes installation, testing and transport. Estimated subsidy defaults to zero pending verified rules. Replace demo costs and assumptions with versioned procurement inputs before live quotations. Current records are PostgreSQL quotation snapshots; native Odoo sale-order synchronization requires integration work.

From backend, run setup-solarfit.js with the isolated identity database owner environment, then load-solarfit-demo.js to seed an empty catalogue. Run test-local.ps1 for the pricing, HTTP workflow and identity regression suites. The HTTP workflow test uses PostgreSQL and controlled survey/identity fixtures.
