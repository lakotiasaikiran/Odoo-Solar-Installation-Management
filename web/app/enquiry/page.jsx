"use client";
/* Multi-step enquiry form — 3 steps */
import { useState } from "react";
import { CheckCircle, ChevronRight } from "lucide-react";
import { Button, Alert } from "../../components/ui";
import "../components.css";
import "../public.css";

const TOTAL = 3;

function ProgressBar({ step }) {
  return (
    <div className="mstep-progress" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={TOTAL} aria-label="Enquiry form progress">
      {Array.from({ length: TOTAL }).map((_, i) => (
        <div key={i} className="mstep-segment">
          <div className="mstep-segment-fill" style={{ width: i < step ? "100%" : "0%" }} />
        </div>
      ))}
    </div>
  );
}

function Step1({ data, onChange }) {
  return (
    <div className="mstep-fields">
      <div className="mstep-row">
        <div className="field">
          <label className="field-label" htmlFor="customerName">Full name <span className="field-required" aria-hidden="true">*</span></label>
          <input id="customerName" className="field-input" required maxLength={120} placeholder="e.g. Priya Sharma" value={data.customerName} onChange={e => onChange("customerName", e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="phone">Mobile number <span className="field-required" aria-hidden="true">*</span></label>
          <input id="phone" type="tel" className="field-input" required maxLength={24} placeholder="e.g. 9876543210" value={data.phone} onChange={e => onChange("phone", e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label className="field-label" htmlFor="address">Installation address <span className="field-required" aria-hidden="true">*</span></label>
        <textarea id="address" className="field-input field-textarea" required rows={3} minLength={3} maxLength={500} placeholder="House number, street, landmark, city, state, PIN" value={data.address} onChange={e => onChange("address", e.target.value)} />
      </div>
      <div className="mstep-row">
        <div className="field">
          <label className="field-label" htmlFor="propertyType">Property type</label>
          <select id="propertyType" className="field-input field-select" value={data.propertyType} onChange={e => onChange("propertyType", e.target.value)}>
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="backupRequired">Backup power needed?</label>
          <select id="backupRequired" className="field-input field-select" value={data.backupRequired} onChange={e => onChange("backupRequired", e.target.value)}>
            <option value="none">No backup (on-grid only)</option>
            <option value="essential">Essential loads</option>
            <option value="full">Full home backup</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function Step2({ data, onChange }) {
  const monthlyKwh = data.monthlyBill > 0 ? Math.round(data.monthlyBill / 8) : 0;
  const kw = monthlyKwh > 0 ? Math.min(5, Math.max(1, Math.round(monthlyKwh / 90))) : 0;

  return (
    <div className="mstep-fields">
      <div className="mstep-row">
        <div className="field">
          <label className="field-label" htmlFor="monthlyBill">Monthly electricity bill (Rs) <span className="field-required" aria-hidden="true">*</span></label>
          <input id="monthlyBill" type="number" className="field-input" required min={300} max={100000} step={100} placeholder="e.g. 3000" value={data.monthlyBill || ""} onChange={e => onChange("monthlyBill", Number(e.target.value))} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="roofSpace">Approx. roof area (sq ft)</label>
          <input id="roofSpace" type="number" className="field-input" min={50} max={10000} step={10} placeholder="e.g. 300" value={data.roofSpace || ""} onChange={e => onChange("roofSpace", Number(e.target.value))} />
        </div>
      </div>
      {kw > 0 && (
        <div style={{ padding: "1rem", background: "var(--color-success-bg)", border: "1px solid var(--brand-200)", borderRadius: "var(--radius-md)", fontSize: "0.875rem", color: "var(--color-success)" }}>
          <strong>Preliminary estimate:</strong> Based on your bill, a <strong>{kw} kW</strong> system may be suitable. A site survey will confirm the exact size.
        </div>
      )}
      <div className="mstep-row">
        <div className="field">
          <label className="field-label" htmlFor="subsidyRequested">Interested in government subsidy?</label>
          <select id="subsidyRequested" className="field-input field-select" value={data.subsidyRequested ? "true" : "false"} onChange={e => onChange("subsidyRequested", e.target.value === "true")}>
            <option value="true">Yes, please help me apply</option>
            <option value="false">No, skip subsidy process</option>
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="budget">Maximum budget (Rs, optional)</label>
          <input id="budget" type="number" className="field-input" min={0} step={5000} placeholder="e.g. 200000" value={data.budget || ""} onChange={e => onChange("budget", Number(e.target.value))} />
        </div>
      </div>
    </div>
  );
}

function Step3({ data, onChange }) {
  return (
    <div className="mstep-fields">
      <div className="field">
        <label className="field-label" htmlFor="requirement">Describe your requirements <span className="field-required" aria-hidden="true">*</span></label>
        <textarea id="requirement" className="field-input field-textarea" required rows={4} minLength={3} maxLength={2000} placeholder="Tell us anything helpful — appliances you want to run, outage frequency, existing wiring, etc." value={data.requirement} onChange={e => onChange("requirement", e.target.value)} />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="paymentMethod">Preferred payment method</label>
        <select id="paymentMethod" className="field-input field-select" value={data.paymentMethod} onChange={e => onChange("paymentMethod", e.target.value)}>
          <option value="milestone">Milestone (advance + balance on completion)</option>
          <option value="loan_emi">Loan / EMI financing</option>
          <option value="cash">Full cash payment</option>
        </select>
      </div>
      <div style={{ background: "var(--color-surface-alt)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "1.25rem", fontSize: "0.8125rem", color: "var(--color-text-muted)", lineHeight: 1.7 }}>
        <strong style={{ color: "var(--color-text)" }}>What happens next:</strong><br />
        A sales adviser will call you within one business day to confirm your details and arrange a free roof survey. No payment is required at this stage.
      </div>
    </div>
  );
}

const STEP_LABELS = ["Your details", "Energy and roof", "Requirements"];
const STEP_SUBTITLES = [
  "We need a few basic details to create your enquiry record.",
  "This helps us recommend the right system size.",
  "Tell us more so we can prepare an accurate quote.",
];

const DEFAULT = {
  customerName: "", phone: "", address: "", propertyType: "residential",
  backupRequired: "essential", monthlyBill: 0, roofSpace: 0, subsidyRequested: true,
  budget: 0, paymentMethod: "milestone", requirement: "",
};

export default function EnquiryPage() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState({ ...DEFAULT });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState(null);

  function onChange(k, v) { setData(d => ({ ...d, [k]: v })); }

  function next(e) {
    e.preventDefault();
    if (step < TOTAL) setStep(s => s + 1);
    else submit();
  }
  function back() { setStep(s => Math.max(1, s - 1)); }

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const key = typeof crypto !== "undefined" ? crypto.randomUUID() : Date.now().toString();
      const payload = {
        idempotencyKey: key,
        customerName: data.customerName.trim(),
        phone: data.phone.trim(),
        address: data.address.trim(),
        requirement: data.requirement.trim(),
        sourceChannel: "web",
        propertyType: data.propertyType,
        monthlyBill: data.monthlyBill,
        roofSpace: data.roofSpace,
        subsidyRequested: data.subsidyRequested,
        backupRequired: data.backupRequired,
        budget: data.budget,
        paymentMethod: data.paymentMethod,
      };
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Submission failed. Please try again.");
      }
      const { reference, trackingCode } = await res.json();
      setReceipt({ reference, trackingCode });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (receipt) {
    return (
      <div className="mstep-wrap">
        <div className="receipt-card">
          <div className="receipt-icon">
            <CheckCircle size={32} />
          </div>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 750, marginBottom: "0.5rem" }}>Enquiry submitted</h1>
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
              A sales adviser will call you within one business day. Keep your tracking code safe.
            </p>
          </div>
          <div style={{ textAlign: "center" }}>
            <p className="receipt-ref">Booking reference</p>
            <p className="receipt-ref-code">{receipt.reference}</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <p className="receipt-ref">Private tracking code (keep this safe)</p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text)", marginTop: "0.25rem", letterSpacing: ".05em" }}>
              {receipt.reference}.{receipt.trackingCode}
            </p>
          </div>
          <a href={`/track?ref=${receipt.reference}&code=${receipt.trackingCode}`} className="btn btn-primary btn-lg">
            Track my project
          </a>
          <button className="btn btn-ghost btn-sm" onClick={() => { setReceipt(null); setData({ ...DEFAULT }); setStep(1); }}>
            Submit another enquiry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mstep-wrap">
      <ProgressBar step={step - 1} />
      <p className="mstep-step-label">Step {step} of {TOTAL} — {STEP_LABELS[step - 1]}</p>
      <h1 className="mstep-title">Solar enquiry</h1>
      <p className="mstep-subtitle">{STEP_SUBTITLES[step - 1]}</p>

      <form onSubmit={next}>
        {step === 1 && <Step1 data={data} onChange={onChange} />}
        {step === 2 && <Step2 data={data} onChange={onChange} />}
        {step === 3 && <Step3 data={data} onChange={onChange} />}

        {error && <Alert variant="danger" onClose={() => setError("")} className="mstep-fields" style={{ marginTop: "1rem" }}>{error}</Alert>}

        <div className="mstep-actions">
          {step > 1 ? (
            <button type="button" className="btn btn-secondary btn-md" onClick={back}>Back</button>
          ) : (
            <span />
          )}
          <Button type="submit" variant="primary" size="md" loading={busy}>
            {step < TOTAL ? "Continue" : "Submit enquiry"}
            {!busy && step < TOTAL && <ChevronRight size={16} />}
          </Button>
        </div>
      </form>
    </div>
  );
}
