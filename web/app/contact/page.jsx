"use client";
import { useState } from "react";
import { Button, Alert } from "../../components/ui";
import "../components.css";
import "../public.css";

export default function ContactPage() {
  const [data, setData] = useState({ name: "", phone: "", email: "", subject: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  function onChange(k, v) { setData(d => ({ ...d, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Could not send message. Please try again.");
      }
      setSent(true);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "var(--space-10) var(--space-6)" }}>
      <h1 style={{ fontSize: "1.75rem", fontWeight: 750, marginBottom: "0.5rem" }}>Contact us</h1>
      <p style={{ color: "var(--color-text-muted)", marginBottom: "2.5rem" }}>
        Fill the form and a team member will respond within one business day.
        For urgent service issues, include your enquiry reference number.
      </p>

      {sent ? (
        <Alert variant="success">
          Your message has been sent. We will be in touch within one business day.
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="field">
              <label className="field-label" htmlFor="c-name">Name <span className="field-required">*</span></label>
              <input id="c-name" className="field-input" required maxLength={120} value={data.name} onChange={e => onChange("name", e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="c-phone">Phone number</label>
              <input id="c-phone" type="tel" className="field-input" maxLength={24} value={data.phone} onChange={e => onChange("phone", e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="c-email">Email address</label>
            <input id="c-email" type="email" className="field-input" maxLength={254} value={data.email} onChange={e => onChange("email", e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="c-subject">Subject <span className="field-required">*</span></label>
            <input id="c-subject" className="field-input" required maxLength={200} placeholder="e.g. Question about my PX-000012 installation" value={data.subject} onChange={e => onChange("subject", e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="c-msg">Message <span className="field-required">*</span></label>
            <textarea id="c-msg" className="field-input field-textarea" required rows={5} maxLength={4000} value={data.message} onChange={e => onChange("message", e.target.value)} />
          </div>

          {err && <Alert variant="danger" onClose={() => setErr("")}>{err}</Alert>}

          <Button type="submit" variant="primary" size="lg" loading={busy}>
            Send message
          </Button>
        </form>
      )}
    </div>
  );
}
