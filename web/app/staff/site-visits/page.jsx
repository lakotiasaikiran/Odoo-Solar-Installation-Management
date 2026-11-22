"use client";
/* Site Surveyor Mobile-Friendly Field Measurement Form (Acceptance Check 3) */
import { useEffect, useState } from "react";
import { Compass, Ruler, Cable, Check, AlertCircle, RefreshCw, Send } from "lucide-react";
import { Button, Alert, Spinner, Modal, Card, Badge, surveyBadge } from "../../../components/ui";

export default function SiteVisitsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  function getAuthHeader() {
    const token = typeof window !== "undefined" ? sessionStorage.getItem("photonix_token") : "";
    return { Authorization: `Bearer ${token}` };
  }

  async function loadVisits() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/enquiries", { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Could not load assigned visits");
      const data = await res.json();
      setLeads(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVisits();
  }, []);

  async function submitSurvey(e) {
    e.preventDefault();
    if (!selectedLead) return;
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const payload = {
        roofDirection: fd.get("roofDirection"),
        roofTiltDeg: Number(fd.get("roofTiltDeg")),
        usableRoofArea: Number(fd.get("usableRoofArea")),
        cableDistanceM: Number(fd.get("cableDistanceM")),
        roofType: fd.get("roofType") || "rcc_flat",
        surveyNotes: String(fd.get("surveyNotes") || "").trim(),
      };

      const res = await fetch(`/api/enquiries/${selectedLead.id}/survey`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Survey submission failed");
      }

      setNotice(`Site survey submitted for ${selectedLead.reference}. It is now in the technical review queue.`);
      setSelectedLead(null);
      await loadVisits();
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
          <h1 className="queue-title">Site Survey Visits</h1>
          <p className="queue-subtitle">
            Mobile field interface for certified site surveyors. Record physical azimuth, tilt angle, usable area, and cable run distance.
          </p>
        </div>
        <div className="queue-toolbar">
          <Button variant="secondary" size="md" onClick={loadVisits} disabled={loading}>
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
      ) : !leads.length ? (
        <Card style={{ textAlign: "center", padding: "var(--space-12)" }}>
          <Compass size={40} style={{ margin: "0 auto var(--space-3)", color: "var(--color-text-faint)" }} />
          <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 700 }}>No surveys assigned</h2>
          <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)", marginTop: "4px" }}>
            When a sales adviser qualifies an enquiry and assigns your account, the site will appear here.
          </p>
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "var(--space-4)" }}>
          {leads.map((lead) => (
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

              <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-3)" }}>
                <div><strong>Phone:</strong> {lead.phone}</div>
                <div style={{ marginTop: "2px" }}><strong>Site:</strong> {lead.address}</div>
                <div style={{ marginTop: "2px" }}><strong>Target Size:</strong> ~{lead.preliminaryCapacityKw || 3} kW</div>
              </div>

              {lead.surveyStatus === "changes_requested" && (
                <div style={{ padding: "var(--space-3)", background: "var(--color-danger-bg)", border: "1px solid #f5b8b4", borderRadius: "var(--radius-md)", fontSize: "var(--text-xs)", color: "var(--color-danger)", marginBottom: "var(--space-3)" }}>
                  <strong>Returned by Technical Reviewer:</strong> {lead.technicalReviewNotes}
                </div>
              )}

              {lead.surveyStatus === "approved" ? (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--color-success)", fontSize: "var(--text-xs)", fontWeight: 600 }}>
                  <Check size={16} /> Survey Approved by Engineering
                </div>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => setSelectedLead(lead)}
                >
                  <Compass size={15} /> Record Survey Findings
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* ─── SURVEY ENTRY MODAL ────────────────────────────────────────── */}
      <Modal
        open={Boolean(selectedLead)}
        onClose={() => setSelectedLead(null)}
        title={`Site Survey Findings — ${selectedLead?.reference}`}
      >
        {selectedLead && (
          <form onSubmit={submitSurvey} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div style={{ background: "var(--color-surface-alt)", padding: "var(--space-3)", borderRadius: "var(--radius-md)", fontSize: "var(--text-xs)" }}>
              <strong>Customer:</strong> {selectedLead.customerName} &middot; {selectedLead.phone}<br />
              <strong>Location:</strong> {selectedLead.address}
            </div>

            <div className="field">
              <label className="field-label" htmlFor="sv-dir">Roof Azimuth / Direction <span className="field-required">*</span></label>
              <select id="sv-dir" name="roofDirection" className="field-input field-select" defaultValue={selectedLead.roofDirection || "south"} required>
                <option value="south">True South (Optimal solar yield in India)</option>
                <option value="south_west">South-West (Acceptable - ~5% yield drop)</option>
                <option value="south_east">South-East (Acceptable - ~5% yield drop)</option>
                <option value="east">East (Morning sun only - lower annual yield)</option>
                <option value="west">West (Afternoon sun only - lower annual yield)</option>
                <option value="north">North (Not recommended - high angle loss)</option>
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
              <div className="field">
                <label className="field-label" htmlFor="sv-tilt">Roof Tilt Angle (&deg;) <span className="field-required">*</span></label>
                <input
                  id="sv-tilt"
                  name="roofTiltDeg"
                  type="number"
                  min="0"
                  max="90"
                  step="0.5"
                  defaultValue={selectedLead.roofTiltDeg || 15}
                  required
                  className="field-input"
                />
                <span className="field-hint">Flat terrace: 10&deg;–18&deg; via metal structure</span>
              </div>
              <div className="field">
                <label className="field-label" htmlFor="sv-area">Measured Usable Area (sq ft) <span className="field-required">*</span></label>
                <input
                  id="sv-area"
                  name="usableRoofArea"
                  type="number"
                  min="50"
                  max="10000"
                  step="10"
                  defaultValue={selectedLead.usableRoofArea || selectedLead.roofSpace || 300}
                  required
                  className="field-input"
                />
                <span className="field-hint">Excluding parapet/tank shadows</span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
              <div className="field">
                <label className="field-label" htmlFor="sv-cable">Cable Run to Main Board (m) <span className="field-required">*</span></label>
                <input
                  id="sv-cable"
                  name="cableDistanceM"
                  type="number"
                  min="1"
                  max="200"
                  step="1"
                  defaultValue={selectedLead.cableDistanceM || 25}
                  required
                  className="field-input"
                />
                <span className="field-hint">DC cable from roof to inverter</span>
              </div>
              <div className="field">
                <label className="field-label" htmlFor="sv-roof-type">Terrace Construction Type <span className="field-required">*</span></label>
                <select id="sv-roof-type" name="roofType" className="field-input field-select" defaultValue={selectedLead.roofType || "rcc_flat"} required>
                  <option value="rcc_flat">RCC Concrete Flat Roof</option>
                  <option value="tin_shed">Industrial Tin Shed</option>
                  <option value="tiled_pitched">Tiled Pitched Roof</option>
                  <option value="asbestos">Asbestos Sheet</option>
                  <option value="other">Other Construction</option>
                </select>
              </div>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="sv-notes">Surveyor Physical Observations</label>
              <textarea
                id="sv-notes"
                name="surveyNotes"
                className="field-input field-textarea"
                rows={2}
                defaultValue={selectedLead.surveyNotes || ""}
                placeholder="Clear unshaded terrace. Adequate access stairs. Parapet wall 3 ft on west side."
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)", marginTop: "var(--space-3)" }}>
              <Button type="button" variant="secondary" onClick={() => setSelectedLead(null)}>Cancel</Button>
              <Button type="submit" variant="primary" loading={busy}>
                <Send size={15} /> Submit Survey for Technical Review
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
