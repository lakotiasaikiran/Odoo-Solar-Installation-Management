"use client";
import { useState, useEffect } from "react";
import { ExternalLink } from "lucide-react";
import "../components.css";
import "../public.css";

const TIERS = [
  { kw: 1, subsidy: 30000, roof: 100, desc: "Ideal for 1–2 BHK. Monthly consumption around 90–120 units." },
  { kw: 2, subsidy: 60000, roof: 200, desc: "Ideal for 2–3 BHK. Monthly consumption around 180–240 units." },
  { kw: 3, subsidy: 78000, roof: 300, desc: "Popular for 3+ BHK with air conditioning. Zero electricity bills possible." },
  { kw: 4, subsidy: 78000, roof: 400, desc: "Larger homes or small commercial with moderate grid use." },
  { kw: 5, subsidy: 78000, roof: 500, desc: "Maximum residential capacity under PM Surya Ghar scheme." },
];

export default function SubsidyGuidePage() {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    fetch("/api/subsidy-config")
      .then(r => r.ok ? r.json() : null)
      .catch(() => null)
      .then(d => setConfig(d));
  }, []);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "var(--space-10) var(--space-6)" }}>
      <p style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--brand-600)", marginBottom: "0.75rem" }}>Government scheme</p>
      <h1 style={{ fontSize: "clamp(1.5rem, 3vw, 2.25rem)", fontWeight: 750, marginBottom: "0.75rem" }}>PM Surya Ghar Muft Bijli Yojana — Subsidy Guide</h1>
      <p style={{ color: "var(--color-text-muted)", lineHeight: 1.7, marginBottom: "1.5rem" }}>
        The Government of India provides direct bank transfer subsidies for residential rooftop solar installations under this scheme. The subsidy amount depends on system capacity and is paid after installation and inspection.
      </p>

      {config ? (
        <div style={{ padding: "0.875rem 1rem", background: "var(--color-info-bg)", border: "1px solid #bcd7f0", borderRadius: "var(--radius-md)", fontSize: "0.8125rem", color: "var(--color-info)", marginBottom: "2rem", display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <span>Figures last verified: <strong>{config.lastVerified}</strong></span>
          <span>&middot;</span>
          <a href={config.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "var(--color-info)", fontWeight: 600 }}>
            Official government portal <ExternalLink size={12} />
          </a>
        </div>
      ) : (
        <div style={{ marginBottom: "2rem" }}>
          <a href="https://pmsuryaghar.gov.in" target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.8125rem", color: "var(--brand-600)", fontWeight: 600 }}>
            pmsuryaghar.gov.in <ExternalLink size={12} />
          </a>
          <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginLeft: "0.75rem" }}>Always verify current amounts on the official portal before applying.</span>
        </div>
      )}

      <h2 style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "1rem" }}>Central subsidy tiers (residential)</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "2.5rem" }}>
        {TIERS.map(t => (
          <div key={t.kw} style={{ border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden", background: "var(--color-surface)" }}>
            <div style={{ padding: "1rem", background: t.kw >= 3 ? "var(--brand-500)" : "var(--color-surface-alt)" }}>
              <p style={{ fontSize: "0.75rem", fontWeight: 700, color: t.kw >= 3 ? "rgba(255,255,255,.75)" : "var(--color-text-muted)", letterSpacing: ".06em", textTransform: "uppercase" }}>Capacity</p>
              <p style={{ fontSize: "1.5rem", fontWeight: 800, color: t.kw >= 3 ? "#fff" : "var(--color-text)" }}>{t.kw} kW</p>
            </div>
            <div style={{ padding: "1rem" }}>
              <p style={{ fontSize: "1.25rem", fontWeight: 750, color: "var(--color-success)", marginBottom: "0.5rem" }}>Rs {t.subsidy.toLocaleString("en-IN")}</p>
              <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginBottom: "0.5rem" }}>{t.desc}</p>
              <p style={{ fontSize: "0.75rem", color: "var(--color-text-faint)" }}>Required roof: ~{t.roof} sq ft</p>
            </div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "0.75rem" }}>How to apply</h2>
      <ol style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.9rem", color: "var(--color-text-muted)", lineHeight: 1.7, listStyle: "decimal", paddingLeft: "1.5rem" }}>
        <li>Register at the National Portal for Rooftop Solar (<a href="https://pmsuryaghar.gov.in" target="_blank" rel="noopener noreferrer">pmsuryaghar.gov.in</a>) using your electricity consumer number and DISCOM name.</li>
        <li>Apply for net metering through your DISCOM via the portal.</li>
        <li>After DISCOM technical approval, install the system through an empanelled vendor (we assist with this documentation).</li>
        <li>Submit your installation completion report and bank account details on the portal.</li>
        <li>DISCOM installs the net meter and inspects the system.</li>
        <li>Subsidy is credited directly to your bank account after successful inspection.</li>
      </ol>

      <div style={{ marginTop: "2.5rem", padding: "1.25rem", background: "var(--color-warning-bg)", border: "1px solid #fad88e", borderRadius: "var(--radius-lg)", fontSize: "0.8125rem", color: "var(--color-warning)", lineHeight: 1.7 }}>
        <strong>Disclaimer:</strong> Subsidy amounts and eligibility criteria are set by the Government of India and are subject to change. The figures on this page are based on scheme guidelines as published and have been independently verified against the official portal (see source link above). Always confirm current amounts directly at pmsuryaghar.gov.in before applying.
      </div>
    </div>
  );
}
