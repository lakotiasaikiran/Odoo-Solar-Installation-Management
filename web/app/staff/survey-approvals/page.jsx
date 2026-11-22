"use client";
/* Technical Reviewer Approval Interface (Acceptance Check 4) */
import { useEffect, useState } from "react";
import { CheckCircle2, RotateCcw, AlertTriangle, RefreshCw, FileText } from "lucide-react";
import { Button, Alert, Spinner, Modal, Card, Badge, surveyBadge } from "../../../components/ui";

export default function SurveyApprovalsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  function getAuthHeader() {
    const token = typeof window !== "undefined" ? sessionStorage.getItem("photonix_token") : "";
    return { Authorization: `Bearer ${token}` };
  }

  async function loadSurveys() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/enquiries", { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Could not load review queue");
      const list = await res.json();
      setReviews(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSurveys();
  }, []);

  async function submitDecision(decision, notes) {
    if (!selectedLead) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/enquiries/${selectedLead.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({
          decision,
          reviewNotes: notes,
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Review decision could not be recorded");
      }

      setNotice(
        decision === "approve"
          ? `Survey for ${selectedLead.reference} approved. Quotation gate unlocked.`
          : `Survey for ${selectedLead.reference} returned to surveyor for correction.`
      );
      setSelectedLead(null);
      await loadSurveys();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="queue-header">
        <div className="queue-header-left">
          <h1 className="queue-title">Technical Survey Approvals</h1>
          <p className="queue-subtitle">
            Engineering review queue. Verify azimuth, tilt, DC cable run voltage drop, and usable area before unlocking final quotation.
          </p>
        </div>
        <div className="queue-toolbar">
          <Button variant="secondary" size="md" onClick={loadSurveys} disabled={loading}>
            <RefreshCw size={15} /> Refresh
          </Button>
        </div>
      </div>

      {notice && <Alert variant="success" onClose={() => setNotice("")}>{notice}</Alert>}
      {error && <Alert variant="danger" onClose={() => setError("")}>{error}</Alert>}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-12)" }}>
          <Spinner size={32} />
        </div>
      ) : !reviews.length ? (
        <Card style={{ textAlign: "center", padding: "var(--space-12)" }}>
          <CheckCircle2 size={40} style={{ margin: "0 auto var(--space-3)", color: "var(--brand-500)" }} />
          <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 700 }}>Survey review queue clear</h2>
          <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)", marginTop: "4px" }}>
            All submitted site surveys have been reviewed and decided.
          </p>
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "var(--space-4)" }}>
          {reviews.map((lead) => (
            <Card key={lead.id} className="card-hover">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-2)" }}>
                <div>
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "var(--text-xs)", color: "var(--brand-700)" }}>
                    {lead.reference}
                  </span>
                  <h3 style={{ fontSize: "var(--text-base)", fontWeight: 750, marginTop: "2px" }}>{lead.customerName}</h3>
                </div>
                {surveyBadge(lead.surveyStatus)}
              </div>

              <div style={{ background: "var(--color-surface-alt)", padding: "var(--space-3)", borderRadius: "var(--radius-md)", fontSize: "var(--text-xs)", marginBottom: "var(--space-3)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                <div>Azimuth: <strong>{lead.roofDirection?.toUpperCase() || "N/A"}</strong></div>
                <div>Tilt Angle: <strong>{lead.roofTiltDeg}&deg;</strong></div>
                <div>Usable Area: <strong>{lead.usableRoofArea} sq ft</strong></div>
                <div>Cable Run: <strong>{lead.cableDistanceM} m</strong></div>
                <div>Roof Type: <span>{lead.roofType}</span></div>
                <div>Target Capacity: <span>{lead.preliminaryCapacityKw || 3} kW</span></div>
              </div>

              {lead.surveyNotes && (
                <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-3)" }}>
                  <strong>Surveyor Notes:</strong> "{lead.surveyNotes}"
                </div>
              )}

              {lead.surveyStatus === "approved" ? (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--color-success)", fontSize: "var(--text-xs)", fontWeight: 600 }}>
                  <CheckCircle2 size={16} /> Approved & Unlocked for Quotation
                </div>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => setSelectedLead(lead)}
                >
                  <FileText size={15} /> Review & Decide
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* ─── TECHNICAL REVIEW DECISION MODAL ───────────────────────────── */}
      <Modal
        open={Boolean(selectedLead)}
        onClose={() => setSelectedLead(null)}
        title={`Engineering Verification — ${selectedLead?.reference}`}
      >
        {selectedLead && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div style={{ background: "var(--color-surface-alt)", padding: "var(--space-4)", borderRadius: "var(--radius-md)", fontSize: "var(--text-xs)", display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ fontWeight: 700, fontSize: "var(--text-sm)", color: "var(--color-text)" }}>
                {selectedLead.customerName} &middot; {selectedLead.address}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", marginTop: "4px" }}>
                <div>Azimuth Direction: <strong>{selectedLead.roofDirection?.toUpperCase()}</strong></div>
                <div>Roof Tilt Angle: <strong>{selectedLead.roofTiltDeg}&deg;</strong></div>
                <div>Measured Usable Roof Area: <strong>{selectedLead.usableRoofArea} sq ft</strong></div>
                <div>DC Cable Distance to Inverter: <strong>{selectedLead.cableDistanceM} meters</strong></div>
                <div>Construction Type: <strong>{selectedLead.roofType}</strong></div>
                <div>Preliminary Size: <strong>{selectedLead.preliminaryCapacityKw || 3} kW</strong></div>
              </div>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="tr-notes">
                Engineering Review Remarks / Return Reason:
              </label>
              <textarea
                id="tr-notes"
                className="field-input field-textarea"
                rows={3}
                placeholder="Approval: Verified azimuth and tilt. Cable run within acceptable DC voltage drop. Return: Cable distance exceeds 40m for single string, please re-measure or propose sub-array combiner."
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-3)", marginTop: "var(--space-3)" }}>
              <Button
                type="button"
                variant="danger"
                loading={busy}
                onClick={() => {
                  const val = document.getElementById("tr-notes")?.value || "";
                  if (!val.trim()) {
                    setError("Returning a survey for correction requires detailed review notes.");
                    return;
                  }
                  submitDecision("return", val.trim());
                }}
              >
                <RotateCcw size={15} /> Return for Correction
              </Button>

              <Button
                type="button"
                variant="primary"
                loading={busy}
                onClick={() => {
                  const val = document.getElementById("tr-notes")?.value || "Survey measurements verified and approved.";
                  submitDecision("approve", val.trim());
                }}
              >
                <CheckCircle2 size={15} /> Approve Survey & Unlock Quote
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
