"use client";
/* Warranty check by serial number */
import { useState } from "react";
import { Search, ShieldCheck, ShieldX } from "lucide-react";
import { Alert } from "../../components/ui";
import "../components.css";
import "../public.css";

export default function WarrantyPage() {
  const [serial, setSerial] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    const s = serial.trim().toUpperCase();
    if (!s) return;
    setBusy(true);
    setErr("");
    setResult(null);
    try {
      const res = await fetch(`/api/warranty/check/${encodeURIComponent(s)}`);
      if (res.status === 404) { setErr("No warranty record found for that serial number. Check the number on the product label."); return; }
      if (!res.ok) { setErr("Warranty service temporarily unavailable. Please try again."); return; }
      setResult(await res.json());
    } catch {
      setErr("Could not connect. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="track-wrap">
      <h1 style={{ fontSize: "1.75rem", fontWeight: 750, marginBottom: "0.5rem" }}>Warranty check</h1>
      <p style={{ color: "var(--color-text-muted)", fontSize: "0.9375rem", marginBottom: "1.5rem" }}>
        Enter the serial number printed on your inverter, battery, or solar panel to view your warranty status.
      </p>

      <form onSubmit={handleSubmit} className="track-form">
        <input
          className="field-input"
          value={serial}
          onChange={e => setSerial(e.target.value.toUpperCase())}
          placeholder="Serial number, e.g. INV-2026-1002"
          maxLength={64}
          style={{ flex: 1, fontFamily: "var(--font-mono)", letterSpacing: ".04em" }}
          autoFocus
        />
        <button type="submit" className="btn btn-primary btn-md" disabled={busy}>
          <Search size={16} />
          {busy ? "Checking…" : "Check"}
        </button>
      </form>

      {err && <Alert variant="danger" onClose={() => setErr("")} style={{ marginTop: "1rem" }}>{err}</Alert>}

      {result && (
        <div style={{ marginTop: "2rem" }}>
          <div style={{
            display: "flex", alignItems: "flex-start", gap: "1rem",
            padding: "1.5rem", borderRadius: "var(--radius-xl)",
            background: result.inWarranty ? "var(--color-success-bg)" : "var(--color-danger-bg)",
            border: `1.5px solid ${result.inWarranty ? "var(--brand-200)" : "#f5b8b4"}`,
          }}>
            <div style={{ color: result.inWarranty ? "var(--color-success)" : "var(--color-danger)", flexShrink: 0 }}>
              {result.inWarranty ? <ShieldCheck size={36} /> : <ShieldX size={36} />}
            </div>
            <div>
              <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: result.inWarranty ? "var(--color-success)" : "var(--color-danger)", marginBottom: "0.25rem" }}>
                {result.inWarranty ? "In warranty" : "Warranty expired"}
              </h2>
              <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>
                {result.inWarranty
                  ? "Repair or replacement is covered at no charge. Contact us to open a service ticket."
                  : "Parts and labour will be billed. Contact us for a repair quote."}
              </p>
            </div>
          </div>

          <div style={{ marginTop: "1.5rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            {[
              ["Serial number", result.serialNumber],
              ["Product type", result.productType],
              ["Customer", result.customerName],
              ["Delivery date", result.deliveryDate ? new Date(result.deliveryDate).toLocaleDateString("en-IN") : "—"],
              ["Warranty term", result.warrantyYears ? `${result.warrantyYears} years` : "—"],
              ["Expires", result.warrantyExpires ? new Date(result.warrantyExpires).toLocaleDateString("en-IN") : "—"],
            ].map(([k, v]) => (
              <div key={k}>
                <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>{k}</p>
                <p style={{ fontWeight: 600, fontSize: "0.9375rem" }}>{v || "—"}</p>
              </div>
            ))}
          </div>

          <p style={{ marginTop: "1.5rem" }}>
            <a href="/contact" className="btn btn-primary btn-md">Open a service request</a>
          </p>
        </div>
      )}
    </div>
  );
}
