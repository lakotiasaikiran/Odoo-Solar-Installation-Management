"use client";
import QuoteDownload from "../../components/QuoteDownload";
/* Track Installation — public, requires private tracking code */
import { useState, useEffect } from "react";
import { Search, CheckCircle, XCircle, Clock, Circle } from "lucide-react";
import { Alert } from "../../components/ui";
import "../components.css";
import "../public.css";

const STAGES = [
  { key: "enquiry", label: "Enquiry received" },
  { key: "qualification", label: "Sales call" },
  { key: "survey", label: "Site survey" },
  { key: "review", label: "Technical review" },
  { key: "quote", label: "Quotation" },
  { key: "installation", label: "Installation" },
];

function stageStatus(lead) {
  const qual = lead.qualificationState;
  const survey = lead.surveyStatus;
  const quote = lead.quoteStatus;

  return [
    { key: "enquiry", state: "done", note: `Received via ${(lead.sourceChannel || "web").toUpperCase()}` },
    {
      key: "qualification",
      state: qual === "qualified" ? "done" : qual === "unsuitable" ? "fail" : "active",
      note: qual === "qualified" ? `Qualified — approx. ${lead.preliminaryCapacityKw || "?"} kW system` : qual === "unsuitable" ? "Site not suitable" : "Pending sales call",
    },
    {
      key: "survey",
      state: qual !== "qualified" ? "pending" : survey === "approved" ? "done" : survey === "submitted" ? "active" : survey === "changes_requested" ? "active" : survey === "unassigned" ? "pending" : "active",
      note: survey === "approved" ? "Survey verified by engineer" : survey === "submitted" ? "Survey submitted — awaiting review" : survey === "changes_requested" ? "Survey returned for correction" : survey === "assigned" ? "Technician assigned" : "Awaiting survey assignment",
    },
    {
      key: "review",
      state: survey !== "approved" ? "pending" : "done",
      note: survey === "approved" ? "Technical measurements approved" : "Awaiting survey approval",
    },
    {
      key: "quote",
      state: quote === "sent" || quote === "accepted" ? "done" : survey === "approved" ? "active" : "pending",
      note: quote === "sent" ? `Quote sent — Rs ${(lead.quoteAmount || 0).toLocaleString("en-IN")}` : quote === "accepted" ? "Quote accepted" : "Awaiting quote generation",
    },
    {
      key: "installation",
      state: quote === "accepted" ? "active" : "pending",
      note: "Scheduled after payment confirmation",
    },
  ];
}

function StepDot({ state }) {
  if (state === "done") return <span className="track-step-dot track-step-dot-done"><CheckCircle size={16} /></span>;
  if (state === "fail") return <span className="track-step-dot track-step-dot-fail"><XCircle size={16} /></span>;
  if (state === "active") return <span className="track-step-dot track-step-dot-active"><Clock size={16} /></span>;
  return <span className="track-step-dot"><Circle size={14} /></span>;
}

export default function TrackPage() {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [lead, setLead] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    const code = params.get("code");
    if (ref && code) {
      setInput(`${ref}.${code}`);
      doTrack(`${ref}.${code}`);
    }
  }, []);

  async function doTrack(raw) {
    const val = (raw || input).trim().toUpperCase();
    if (!val) return;
    setBusy(true);
    setErr("");
    setLead(null);
    try {
      const [ref, code] = val.split(".");
      if (!ref || !/^PX-\d{6}$/.test(ref)) {
        setErr("Enter the full tracking code from your receipt, e.g. PX-000001.ABCD1234…");
        return;
      }
      const res = await fetch(`/api/enquiries/track/${encodeURIComponent(ref)}`, {
        headers: { "X-Tracking-Code": code || "" },
      });
      if (res.status === 404) { setErr("No enquiry found with that tracking code. Check your receipt."); return; }
      if (!res.ok) { setErr("Tracking service is temporarily unavailable. Please try again in a moment."); return; }
      setLead(await res.json());
    } catch {
      setErr("Could not connect. Please check your internet connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    doTrack();
  }

  const stages = lead ? stageStatus(lead) : [];

  return (
    <div className="track-wrap">
      <h1 style={{ fontSize: "1.75rem", fontWeight: 750, marginBottom: "0.5rem" }}>Track your project</h1>
      <p style={{ color: "var(--color-text-muted)", fontSize: "0.9375rem", marginBottom: "1.5rem" }}>
        Enter the private tracking code from your enquiry receipt. The code format is{" "}
        <code style={{ fontFamily: "var(--font-mono)", background: "var(--gray-100)", padding: "1px 6px", borderRadius: 4 }}>PX-000001.TRACKINGCODE</code>.
      </p>

      <form onSubmit={handleSubmit} className="track-form">
        <input
          className="field-input"
          value={input}
          onChange={e => setInput(e.target.value.toUpperCase())}
          placeholder="PX-000001.ABCDEF..."
          maxLength={72}
          style={{ flex: 1, fontFamily: "var(--font-mono)", letterSpacing: ".05em" }}
          autoFocus
        />
        <button type="submit" className="btn btn-primary btn-md" disabled={busy}>
          <Search size={16} />
          {busy ? "Searching…" : "Track"}
        </button>
      </form>

      {err && <Alert variant="danger" onClose={() => setErr("")} style={{ marginTop: "1rem" }}>{err}</Alert>}

      {lead && (
        <div className="track-result">
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "0.5rem" }}>
            <div>
              <p style={{ fontSize: "0.75rem", fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--color-text-muted)" }}>Booking reference</p>
              <p style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-.03em" }}>{lead.reference}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)" }}>Customer</p>
              <p style={{ fontWeight: 600 }}>{lead.customerName}</p><QuoteDownload lead={lead}/>
            </div>
          </div>

          {stages.map((s, i) => (
            <div key={s.key}>
              <div className="track-step">
                <StepDot state={s.state} />
                <div className="track-step-body">
                  <p className="track-step-title">{STAGES.find(x => x.key === s.key)?.label}</p>
                  <p className="track-step-note">{s.note}</p>
                </div>
              </div>
              {i < stages.length - 1 && (
                <div className={`track-step-line${s.state === "done" ? " track-step-line-done" : ""}`} />
              )}
            </div>
          ))}

          <p style={{ fontSize: "0.75rem", color: "var(--color-text-faint)", marginTop: "0.5rem" }}>
            Property type: {lead.propertyType} &middot; Source: {lead.sourceChannel}
          </p>
        </div>
      )}
    </div>
  );
}
