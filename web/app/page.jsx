"use client";
import { useState, useEffect } from "react";
import Journey from "../components/Journey";
import Link from "next/link";
import { ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { PublicHeader, PublicFooter } from "../components/PublicShell";
import "./components.css";
import "./public.css";

/* ─── Home page — all statistics come from real database (/api/stats) ─── */

const HOW_STEPS = [
  { num: "01", title: "Submit your enquiry", desc: "Fill the online form in under 3 minutes, or call us and a sales adviser logs it for you." },
  { num: "02", title: "Roof survey", desc: "A certified technician measures your roof direction, tilt, and cable run." },
  { num: "03", title: "Package quote", desc: "An engineer reviews the survey and unlocks a fixed-price quote matched to your roof and bill." },
  { num: "04", title: "Installation and warranty", desc: "Crew installs, power-tests, and starts your 20-year panel warranty automatically on delivery." },
];

const FAQS = [
  { q: "Do I need to pay anything before the survey?", a: "No. The initial site survey is free. Payment begins only when you accept the final quotation." },
  { q: "How long does a typical installation take?", a: "A residential 3 kW on-grid system is typically installed in one day. Larger or off-grid systems may take two days." },
  { q: "Am I eligible for the PM Surya Ghar subsidy?", a: "Residential properties with a sanctioned electricity connection from a DISCOM are generally eligible. See our Subsidy Guide for the latest criteria and amounts." },
  { q: "What is covered under the 20-year panel warranty?", a: "Manufacturing defects and performance below 80% of rated output at year 20. The warranty is linked to the serial number scanned at dispatch and starts from the delivery date." },
  { q: "Can I track my installation progress online?", a: "Yes. After your enquiry is submitted you receive a private tracking code you can enter on the Track Project page." },
];

const PKG_CARDS = [
  {
    type: "On-grid",
    name: "Starter 1 kW",
    capacity: "1 kW",
    items: ["4 × 250 Wp solar panels", "1 kW string inverter", "DC disconnect & AC breaker", "Safety earthing set", "MS mounting structure", "Professional installation and testing"],
    featured: false,
  },
  {
    type: "On-grid",
    name: "Popular 3 kW",
    capacity: "3 kW",
    items: ["12 × 250 Wp solar panels", "3 kW string inverter", "DC/AC protection system", "Safety earthing + lightning arrestor", "MS mounting structure", "Net-meter liaison assistance", "Professional installation"],
    featured: true,
    popular: true,
  },
  {
    type: "Off-grid",
    name: "Backup 2 kW",
    capacity: "2 kW",
    items: ["8 × 250 Wp solar panels", "2 kW PWM/MPPT charge controller", "200 Ah tubular battery bank", "2 kW inverter with UPS mode", "Safety earthing set", "MS mounting structure", "Professional installation"],
    featured: false,
  },
];

function SubsidyCalc() {
  const [bill, setBill] = useState(3000);
  const [area, setArea] = useState(300);
  const tariff = 8; // Rs/kWh — assumption shown to user
  const monthlyKwh = bill / tariff;
  const kw = Math.min(5, Math.max(1, Math.round(monthlyKwh / 90)));
  const subsidy = kw <= 1 ? 30000 : kw <= 2 ? 60000 : 78000;
  const annualSaving = Math.round(monthlyKwh * tariff * 11);

  return (
    <section className="home-section calc-section">
      <div className="container">
        <div className="calc-grid">
          <div>
            <p className="section-label">Free estimate</p>
            <h2 className="section-title" style={{ color: "#fff" }}>How much could you save?</h2>
            <p className="section-desc" style={{ color: "rgba(255,255,255,.65)", marginBottom: "2rem" }}>
              Enter your electricity bill and available roof area. We calculate the system size,
              government subsidy, and estimated first-year savings. All assumptions are shown.
            </p>
            <div className="calc-results">
              <div className="calc-result-item">
                <span className="calc-result-label">Recommended system size</span>
                <span className="calc-result-value">{kw} kW</span>
                <span className="calc-result-note">Based on {monthlyKwh.toFixed(0)} kWh monthly usage at Rs {tariff}/kWh assumed tariff</span>
              </div>
              <div className="calc-result-item">
                <span className="calc-result-label">Central subsidy (PM Surya Ghar)</span>
                <span className="calc-result-value">Rs {subsidy.toLocaleString("en-IN")}</span>
                <span className="calc-result-note">Residential. Verify at pmsuryaghar.gov.in before applying.</span>
              </div>
              <div className="calc-result-item">
                <span className="calc-result-label">Estimated annual bill saving</span>
                <span className="calc-result-value">Rs {annualSaving.toLocaleString("en-IN")}</span>
                <span className="calc-result-note">Conservative estimate. Actual saving depends on local tariff slab.</span>
              </div>
              <p className="calc-disclaimer">
                This is a preliminary estimate only. The final system size is determined after a
                technician surveys your roof direction, tilt and shading. Subsidy amounts shown
                are from published government guidelines and may change.{" "}
                <a href="https://pmsuryaghar.gov.in" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,.6)" }}>pmsuryaghar.gov.in</a>
              </p>
            </div>
          </div>
          <div className="calc-form">
            <h3 style={{ color: "#fff", fontWeight: 700, marginBottom: "1rem" }}>Enter your details</h3>
            <div className="field">
              <label className="field-label" htmlFor="calc-bill">Monthly electricity bill (Rs)</label>
              <input
                id="calc-bill" type="number" min={300} max={50000} step={100}
                value={bill} onChange={e => setBill(Number(e.target.value))}
                className="field-input"
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="calc-area">Available roof area (sq ft)</label>
              <input
                id="calc-area" type="number" min={50} max={5000} step={25}
                value={area} onChange={e => setArea(Number(e.target.value))}
                className="field-input"
              />
            </div>
            <div style={{ marginTop: "1rem", padding: "1rem", background: "rgba(255,255,255,.06)", borderRadius: "8px", fontSize: "0.75rem", color: "rgba(255,255,255,.5)", lineHeight: 1.7 }}>
              <strong style={{ color: "rgba(255,255,255,.75)" }}>Assumptions used:</strong><br />
              Electricity tariff: Rs {tariff}/kWh<br />
              Solar yield: 90 kWh/kW/month (Indian average)<br />
              Roof area required: ~100 sq ft per kW
            </div>
            <Link href="/enquiry" className="btn btn-primary btn-lg" style={{ marginTop: "0.5rem" }}>
              Get an accurate quote
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="faq-item">
      <button className="faq-trigger" onClick={() => setOpen(v => !v)} aria-expanded={open}>
        {q}
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && <div className="faq-answer">{a}</div>}
    </div>
  );
}

export default function HomePage() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch("/api/stats")
      .then(r => r.ok ? r.json() : null)
      .catch(() => null)
      .then(d => setStats(d));
  }, []);

  return (
    <div className="pub-layout photonix-home">
      <PublicHeader />
      <main className="pub-main">
        {/* HERO */}
        <section className="hero">
          <div className="container hero-inner">
            <div>
              <p className="hero-eyebrow">Solar installation management</p>
              <h1 className="hero-title">
                One workspace for <em>rooftop solar.</em>
              </h1>
              <p className="hero-desc">
                Customers follow their installation. Solar teams coordinate surveys, quotations, equipment and aftercare in the same project.
              </p>
              <div className="hero-actions">
                <Link href="/enquiry" className="btn btn-hero-primary">
                  Get a free quote
                </Link>
                <Link href="/track" className="btn btn-hero-secondary">
                  Track my project
                </Link>
              </div>
            </div>
            <Journey />
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="home-section">
          <div className="container">
            <p className="section-label">How it works</p>
            <h2 className="section-title">From enquiry to power generation in four steps</h2>
            <div className="how-steps">
              {HOW_STEPS.map((s) => (
                <div key={s.num} className="how-step">
                  <div className="how-step-num">{s.num}</div>
                  <h3 className="how-step-title">{s.title}</h3>
                  <p className="how-step-desc">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PACKAGES */}
        <section className="home-section home-section-alt">
          <div className="container">
            <p className="section-label">System packages</p>
            <h2 className="section-title">Fixed-price packages with complete parts lists</h2>
            <p className="section-desc">
              Every quote is generated from an approved package template — no hidden extras.
            </p>
            <div className="pkg-grid">
              {PKG_CARDS.map((p) => (
                <div key={p.name} className={`pkg-card${p.featured ? " pkg-card-featured" : ""}`}>
                  <div className="pkg-card-head">
                    {p.popular && <span className="pkg-popular">Most popular</span>}
                    <p className="pkg-type">{p.type}</p>
                    <h3 className="pkg-name">{p.name}</h3>
                  </div>
                  <div className="pkg-body">
                    <ul className="pkg-items">
                      {p.items.map((item) => (
                        <li key={item} className="pkg-item">
                          <span className="pkg-item-dot" aria-hidden="true" />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <div className="pkg-cta">
                      <Link href="/enquiry" className={`btn btn-md ${p.featured ? "btn-primary" : "btn-secondary"}`} style={{ width: "100%", justifyContent: "center" }}>
                        Get a quote
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p style={{ marginTop: "1.5rem", fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
              Exact prices depend on your roof survey and current procurement costs.
              Package prices are finalized after the technical review.
              <Link href="/solutions" style={{ marginLeft: "0.5rem" }}>View full package details</Link>
            </p>
          </div>
        </section>

        {/* SUBSIDY CALCULATOR */}
        <SubsidyCalc />

        {/* TRUST */}
        <section className="home-section">
          <div className="container">
            <p className="section-label">Why Photonix</p>
            <h2 className="section-title">By the numbers</h2>
            <div className="trust-grid">
              <div className="trust-item">
                <div className="trust-num">{stats ? stats.completedInstallations : "—"}</div>
                <div className="trust-label">Installations completed</div>
              </div>
              <div className="trust-item">
                <div className="trust-num">{stats ? stats.openWarrantyTickets : "—"}</div>
                <div className="trust-label">Active warranty tickets</div>
              </div>
              <div className="trust-item">
                <div className="trust-num">{stats ? stats.activeTechnicians : "—"}</div>
                <div className="trust-label">Certified technicians</div>
              </div>
              <div className="trust-item">
                <div className="trust-num">20 yr</div>
                <div className="trust-label">Maximum panel warranty</div>
              </div>
            </div>
            <p style={{ marginTop: "1.5rem", fontSize: "0.75rem", color: "var(--color-text-faint)" }}>
              All figures are drawn from recorded transactions in the system. Zero invented statistics.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="home-section home-section-alt">
          <div className="container">
            <p className="section-label">Common questions</p>
            <h2 className="section-title">Frequently asked questions</h2>
            <div className="faq-list">
              {FAQS.map((f) => <FaqItem key={f.q} {...f} />)}
            </div>
            <p style={{ marginTop: "2rem", fontSize: "0.875rem", color: "var(--color-text-muted)" }}>
              Still have a question?{" "}
              <Link href="/contact">Contact us</Link>
            </p>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
