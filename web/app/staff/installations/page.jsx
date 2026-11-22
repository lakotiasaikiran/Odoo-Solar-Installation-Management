"use client";
/* Field Installation Workflow & Customer Acceptance Form (Scope 4) */
import { useEffect, useState, useRef } from "react";
import { Wrench, CheckCircle, Zap, Shield, PenTool, RefreshCw } from "lucide-react";
import { Button, Card, Badge, Alert, Spinner, DataTable, Modal } from "../../../components/ui";

export default function InstallationsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  // Signature canvas
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  function getAuthHeader() {
    const token = typeof window !== "undefined" ? sessionStorage.getItem("photonix_token") : "";
    return { Authorization: `Bearer ${token}` };
  }

  async function loadJobs() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/installations", { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Could not load installation jobs");
      const list = await res.json();
      setJobs(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadJobs();
  }, []);

  // Signature drawing handlers
  function startDrawing(e) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  }

  function draw(e) {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#142e35";
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  }

  function stopDrawing() {
    setIsDrawing(false);
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  }

  async function handleCompleteJob(e) {
    e.preventDefault();
    if (!selectedJob) return;
    const fd = new FormData(e.currentTarget);
    const canvas = canvasRef.current;
    const signatureData = canvas ? canvas.toDataURL("image/png") : "";

    if (!hasSignature && !signatureData) {
      setError("Customer acceptance signature is required on the canvas before completion.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const payload = {
        powerTestWatts: Number(fd.get("powerTestWatts")),
        safetyEarthing: fd.get("safetyEarthing") === "on",
        mountingChecked: fd.get("mountingChecked") === "on",
        wiringChecked: fd.get("wiringChecked") === "on",
        completionNotes: String(fd.get("completionNotes") || "").trim(),
        customerSignature: signatureData,
      };

      const res = await fetch(`/api/installations/${selectedJob.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Could not complete installation");
      }

      setNotice(`Installation job ${selectedJob.job_number} completed with customer signature.`);
      setSelectedJob(null);
      await loadJobs();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const columns = [
    { key: "job_number", label: "Job #", render: (r) => <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>{r.job_number}</span> },
    { key: "customer_name", label: "Customer & Site", render: (r) => (
      <div>
        <div style={{ fontWeight: 600 }}>{r.customer_name}</div>
        <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>{r.address}</div>
      </div>
    )},
    { key: "system_capacity_kw", label: "Capacity", render: (r) => `${r.system_capacity_kw} kW (${r.system_type === "on_grid" ? "On-Grid" : "Off-Grid"})` },
    { key: "technician_name", label: "Technician", render: (r) => r.technician_name || "Unassigned" },
    { key: "scheduled_date", label: "Scheduled", render: (r) => new Date(r.scheduled_date).toLocaleDateString("en-IN") },
    { key: "status", label: "Status", render: (r) => <Badge variant={r.status === "completed" ? "success" : r.status === "in_progress" ? "warning" : "neutral"}>{r.status}</Badge> },
    { key: "power_test_watts", label: "Power Output", render: (r) => r.power_test_watts ? `${r.power_test_watts} W` : "Pending" },
    { key: "actions", label: "Field Actions", render: (r) => (
      r.status !== "completed" ? (
        <Button variant="primary" size="sm" onClick={() => { setSelectedJob(r); setHasSignature(false); }}>
          <Zap size={14} /> Complete & Sign-off
        </Button>
      ) : (
        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-success)", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
          <CheckCircle size={14} /> Signed & Done
        </span>
      )
    )},
  ];

  return (
    <>
      <div className="queue-header">
        <div className="queue-header-left">
          <h1 className="queue-title">Field Installation & Customer Acceptance</h1>
          <p className="queue-subtitle">
            Mobile-ready workflow for installation crews. Record start/finish times, safety earthing checks, power generation tests, and on-screen customer sign-off.
          </p>
        </div>
        <div className="queue-toolbar">
          <Button variant="secondary" size="md" onClick={loadJobs} disabled={loading}>
            <RefreshCw size={15} /> Refresh
          </Button>
        </div>
      </div>

      {notice && <Alert variant="success" onClose={() => setNotice("")}>{notice}</Alert>}
      {error && <Alert variant="danger" onClose={() => setError("")}>{error}</Alert>}

      <DataTable
        columns={columns}
        rows={jobs}
        loading={loading}
        getRowKey={(r) => r.id}
        emptyTitle="No installation jobs scheduled"
      />

      {/* ─── COMPLETION & SIGNATURE MODAL ─────────────────────────────── */}
      <Modal
        open={Boolean(selectedJob)}
        onClose={() => setSelectedJob(null)}
        title={`Complete Job — ${selectedJob?.job_number}`}
        wide
      >
        {selectedJob && (
          <form onSubmit={handleCompleteJob} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div style={{ background: "var(--color-surface-alt)", padding: "var(--space-3)", borderRadius: "var(--radius-md)", fontSize: "var(--text-xs)" }}>
              <strong>Customer:</strong> {selectedJob.customer_name} &middot; {selectedJob.customer_phone}<br />
              <strong>Site:</strong> {selectedJob.address}<br />
              <strong>System Size:</strong> {selectedJob.system_capacity_kw} kW {selectedJob.system_type === "on_grid" ? "On-Grid" : "Off-Grid"}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
              <div className="field">
                <label className="field-label" htmlFor="job-power">Power Generation Test (Watts Peak) <span className="field-required">*</span></label>
                <input
                  id="job-power"
                  name="powerTestWatts"
                  type="number"
                  min="100"
                  max="10000"
                  step="10"
                  required
                  defaultValue={Math.round(selectedJob.system_capacity_kw * 880)}
                  className="field-input"
                />
                <span className="field-hint">Actual generation measured on inverter display</span>
              </div>
              <div className="field">
                <label className="field-label">Safety & Earthing Checklist</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "6px", fontSize: "var(--text-xs)" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <input type="checkbox" name="safetyEarthing" defaultChecked required />
                    GI Pipe Earthing & Lightning Arrestor connected
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <input type="checkbox" name="mountingChecked" defaultChecked required />
                    MS structure bolted & roof waterproofing verified
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <input type="checkbox" name="wiringChecked" defaultChecked required />
                    DC disconnect & AC breaker anti-islanding trip tested
                  </label>
                </div>
              </div>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="job-notes">Crew Completion Remarks</label>
              <textarea
                id="job-notes"
                name="completionNotes"
                className="field-input field-textarea"
                rows={2}
                defaultValue="System installed, verified, and commissioned. Grid synchronized without fault."
              />
            </div>

            {/* On-screen customer signature canvas */}
            <div className="field">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label className="field-label">Customer Acceptance On-Screen Signature <span className="field-required">*</span></label>
                <button type="button" className="btn btn-secondary btn-sm" onClick={clearCanvas}>
                  Clear Signature
                </button>
              </div>
              <div style={{ border: "2px dashed var(--color-border)", borderRadius: "var(--radius-md)", background: "#fff", marginTop: "4px" }}>
                <canvas
                  ref={canvasRef}
                  width={560}
                  height={140}
                  style={{ width: "100%", height: "140px", cursor: "crosshair", display: "block" }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
              <span className="field-hint">Sign above using finger, stylus, or mouse as formal acceptance of completed work.</span>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)", marginTop: "var(--space-3)" }}>
              <Button type="button" variant="secondary" onClick={() => setSelectedJob(null)}>Cancel</Button>
              <Button type="submit" variant="primary" loading={busy}>
                <CheckCircle size={15} /> Submit Final Acceptance & Commission
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
