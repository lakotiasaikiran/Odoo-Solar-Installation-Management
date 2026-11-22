import Link from "next/link";
import "../components.css";
import "../public.css";

export const metadata = { title: "On-grid and off-grid solar solutions" };

const ON_GRID_PARTS = [
  { product: "Solar panels", spec: "250 Wp polycrystalline per panel", warranty: "20 years" },
  { product: "String inverter", spec: "Single-phase, 1–5 kW", warranty: "2 years" },
  { product: "DC disconnect switch", spec: "MNRE-compliant DC safety", warranty: "1 year" },
  { product: "AC circuit breaker", spec: "With surge protection", warranty: "1 year" },
  { product: "Earthing system", spec: "GI pipe with salt and charcoal", warranty: "Lifetime" },
  { product: "MS mounting structure", spec: "Hot-dip galvanised, roof-specific", warranty: "5 years" },
  { product: "PV wire and DC connectors", spec: "XLPO insulated, UV resistant", warranty: "On installation" },
  { product: "Net meter assistance", spec: "DISCOM application and liaison", warranty: "N/A" },
];

const OFF_GRID_EXTRAS = [
  { product: "MPPT charge controller", spec: "12/24/48 V, matched to system", warranty: "2 years" },
  { product: "Tubular battery bank", spec: "150–200 Ah per unit", warranty: "2 years" },
  { product: "Battery box and ventilation", spec: "Fire-resistant enclosure", warranty: "On installation" },
];

export default function SolutionsPage() {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "var(--space-10) var(--space-6)" }}>
      <p style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--brand-600)", marginBottom: "0.75rem" }}>What we install</p>
      <h1 style={{ fontSize: "clamp(1.5rem, 3vw, 2.25rem)", fontWeight: 750, marginBottom: "0.75rem" }}>On-grid and off-grid solar systems, 1 kW to 5 kW</h1>
      <p style={{ color: "var(--color-text-muted)", lineHeight: 1.7, marginBottom: "2.5rem", maxWidth: "60ch" }}>
        Every installation uses the same quality-checked parts list. The right system depends on your grid supply reliability, electricity bill, and roof size — our survey determines this for you.
      </p>

      {/* On-grid */}
      <div style={{ marginBottom: "3rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 750, marginBottom: "0.5rem" }}>On-grid (grid-tied) system</h2>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", lineHeight: 1.7, marginBottom: "1.5rem", maxWidth: "60ch" }}>
          Connected to your electricity grid via a bi-directional net meter. Surplus solar energy is exported to the grid, reducing your bill to near zero. Powers off automatically during grid outages (anti-islanding protection). Eligible for the maximum PM Surya Ghar subsidy.
        </p>
        <div style={{ border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ background: "var(--color-surface-alt)", borderBottom: "1px solid var(--color-border)" }}>
                <th style={{ padding: ".625rem 1rem", textAlign: "left", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: ".05em", color: "var(--color-text-muted)" }}>Component</th>
                <th style={{ padding: ".625rem 1rem", textAlign: "left", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: ".05em", color: "var(--color-text-muted)" }}>Specification</th>
                <th style={{ padding: ".625rem 1rem", textAlign: "left", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: ".05em", color: "var(--color-text-muted)" }}>Warranty</th>
              </tr>
            </thead>
            <tbody>
              {ON_GRID_PARTS.map((p, i) => (
                <tr key={p.product} style={{ background: i % 2 === 0 ? "var(--color-surface)" : "var(--color-surface-alt)", borderBottom: i < ON_GRID_PARTS.length - 1 ? "1px solid var(--color-border-alt)" : "none" }}>
                  <td style={{ padding: ".75rem 1rem", fontWeight: 600 }}>{p.product}</td>
                  <td style={{ padding: ".75rem 1rem", color: "var(--color-text-muted)" }}>{p.spec}</td>
                  <td style={{ padding: ".75rem 1rem", color: "var(--color-text-muted)" }}>{p.warranty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Off-grid extras */}
      <div style={{ marginBottom: "3rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 750, marginBottom: "0.5rem" }}>Off-grid (battery backup) additions</h2>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", lineHeight: 1.7, marginBottom: "1.5rem", maxWidth: "60ch" }}>
          Off-grid systems include all on-grid components plus the following. Battery systems are ideal for areas with frequent power cuts.
        </p>
        <div style={{ border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ background: "var(--color-surface-alt)", borderBottom: "1px solid var(--color-border)" }}>
                <th style={{ padding: ".625rem 1rem", textAlign: "left", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: ".05em", color: "var(--color-text-muted)" }}>Added component</th>
                <th style={{ padding: ".625rem 1rem", textAlign: "left", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: ".05em", color: "var(--color-text-muted)" }}>Specification</th>
                <th style={{ padding: ".625rem 1rem", textAlign: "left", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: ".05em", color: "var(--color-text-muted)" }}>Warranty</th>
              </tr>
            </thead>
            <tbody>
              {OFF_GRID_EXTRAS.map((p, i) => (
                <tr key={p.product} style={{ background: i % 2 === 0 ? "var(--color-surface)" : "var(--color-surface-alt)", borderBottom: i < OFF_GRID_EXTRAS.length - 1 ? "1px solid var(--color-border-alt)" : "none" }}>
                  <td style={{ padding: ".75rem 1rem", fontWeight: 600 }}>{p.product}</td>
                  <td style={{ padding: ".75rem 1rem", color: "var(--color-text-muted)" }}>{p.spec}</td>
                  <td style={{ padding: ".75rem 1rem", color: "var(--color-text-muted)" }}>{p.warranty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Link href="/enquiry" className="btn btn-primary btn-lg">
        Request a site survey
      </Link>
    </div>
  );
}
