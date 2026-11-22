"use client";

import Link from "next/link";
import { Download, ArrowRight, ShieldCheck } from "lucide-react";

export default function QuoteDownload({ lead }) {
  if (!lead || lead.quoteAmount == null || !["sent", "accepted"].includes(lead.quoteStatus)) return null;

  const d = lead.quoteDetails || {};
  const money = (n) => "INR " + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

  // Generate formal HTML quotation document
  const htmlDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Quotation ${lead.reference} - Photonix Solar</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 40px; color: #111827; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0284c7; padding-bottom: 16px; margin-bottom: 24px; }
    .logo { font-size: 24px; font-weight: 800; color: #0284c7; }
    .meta { font-size: 13px; color: #4b5563; }
    .card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th, td { padding: 10px; border: 1px solid #e5e7eb; text-align: left; font-size: 14px; }
    th { background: #f3f4f6; }
    .total { font-size: 16px; font-weight: bold; background: #e0f2fe; }
    .footer { font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 40px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">PHOTONIX SOLAR ENERGY SOLUTIONS</div>
      <div class="meta">CIN: U40106MH2026PTC392811 | GSTIN: 27AABCP8921M1Z4</div>
      <div class="meta">Plot 48, Photonix Tech Park, Baner Road, Pune 411045</div>
    </div>
    <div style="text-align: right;">
      <div style="font-weight: bold; font-size: 18px;">${lead.reference}</div>
      <div class="meta">Date: ${new Date().toLocaleDateString("en-IN")}</div>
      <div class="meta">Valid for: 30 Days</div>
    </div>
  </div>

  <div class="card">
    <div style="font-weight: bold; margin-bottom: 6px;">Customer Details:</div>
    <div style="font-size: 14px;"><strong>${lead.customerName || "Customer"}</strong></div>
    <div style="font-size: 13px; color: #4b5563;">Site Address: ${lead.address || "As per survey"}</div>
  </div>

  <h3>System Technical Sizing</h3>
  <table>
    <tr><th>Specification</th><th>Details</th></tr>
    <tr><td>System Capacity</td><td>${d.capacityKw || lead.preliminaryCapacityKw || 3.0} kW Rooftop Solar PV</td></tr>
    <tr><td>Solar Modules</td><td>Tier-1 TopCon Bi-facial 550Wp (${d.panelCount || 6} Panels)</td></tr>
    <tr><td>Inverter</td><td>High-Efficiency On-Grid Smart MPPT Inverter (10-Yr Warranty)</td></tr>
    <tr><td>Mounting Structure</td><td>Hot-Dip Galvanized Pre-engineered Structure (150 km/h wind rated)</td></tr>
    <tr><td>Module Warranty</td><td>25-Year Linear Power Performance Guarantee (min 84.8%)</td></tr>
  </table>

  <h3>Commercial Pricing & Central Subsidy</h3>
  <table>
    <tr><td>Gross Turnkey Installation Value</td><td style="text-align: right;">${money(d.grossPrice || (d.capacityKw * 60000))}</td></tr>
    <tr style="color: #166534;"><td>PM Surya Ghar Muft Bijli Yojana Central Subsidy</td><td style="text-align: right;">-${money(d.estimatedSubsidy || 78000)}</td></tr>
    <tr class="total"><td>Net Effective Customer Investment</td><td style="text-align: right; color: #0284c7;">${money(lead.quoteAmount)}</td></tr>
  </table>

  <div class="footer">
    <div>Subsidy is disbursed directly by MNRE under DBT upon net-meter installation.</div>
    <div>Sign in to your Photonix Customer Portal to generate your 20% advance milestone tax invoice.</div>
  </div>
</body>
</html>`;

  return (
    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
      <a
        className="btn btn-secondary btn-sm"
        download={`${lead.reference}-quotation.html`}
        href={`data:text/html;charset=utf-8,${encodeURIComponent(htmlDoc)}`}
        style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
      >
        <Download size={15} />
        <span>Download formal quotation</span>
      </a>

      <Link
        href="/customer/login"
        className="btn btn-primary btn-sm"
        style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
      >
        <span>Customer portal & invoicing</span>
        <ArrowRight size={15} />
      </Link>
    </div>
  );
}
