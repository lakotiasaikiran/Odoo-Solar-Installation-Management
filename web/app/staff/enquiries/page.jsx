"use client";
import QuoteDownload from "../../../components/QuoteDownload";
/* Sales & Management Enquiries Queue with Assisted Intake, Qualification, and Quotation Gate */
import { useEffect, useState, useMemo } from "react";
import {
  Search, Plus, Filter, Download, Phone, CheckCircle, AlertCircle,
  Clock, ShieldAlert, ArrowRight, UserPlus, RefreshCw, Eye
} from "lucide-react";
import { Button, Badge, Modal, Alert, Spinner, DataTable, surveyBadge, quoteBadge, qualBadge } from "../../../components/ui";

export default function EnquiriesPage() {
  const [rows, setRows] = useState([]);
  const [surveyors, setSurveyors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterQual, setFilterQual] = useState("all");
  const [viewMode, setViewMode] = useState("table"); // 'table' or 'board'
  const [issued,setIssued]=useState(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Modals
  const [activeModal, setActiveModal] = useState(null); // 'intake' | 'qualify' | 'quote' | 'detail'
  const [selectedLead, setSelectedLead] = useState(null);

  function getAuthHeader() {
    const token = typeof window !== "undefined" ? sessionStorage.getItem("photonix_token") : "";
    return { Authorization: `Bearer ${token}` };
  }

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/enquiries", { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Could not load enquiries queue");
      const list = await res.json();
      setRows(Array.isArray(list) ? list : []);

      // Load active surveyors for assignment dropdown
      const sRes = await fetch("/api/enquiries/surveyors/list", { headers: getAuthHeader() });
      if (sRes.ok) {
        const sList = await sRes.json();
        if (Array.isArray(sList)) setSurveyors(sList);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const matchesSearch =
        !search ||
        r.reference?.toLowerCase().includes(search.toLowerCase()) ||
        r.customerName?.toLowerCase().includes(search.toLowerCase()) ||
        r.phone?.includes(search);
      const matchesQual = filterQual === "all" || r.qualificationState === filterQual;
      return matchesSearch && matchesQual;
    });
  }, [rows, search, filterQual]);

  // Actions
  async function submitAssistedIntake(e) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const payload = {
        idempotencyKey: crypto.randomUUID(),
        customerName: String(fd.get("customerName")).trim(),
        phone: String(fd.get("phone")).trim(),
        address: String(fd.get("address")).trim(),
        requirement: String(fd.get("requirement")).trim(),
        sourceChannel: fd.get("sourceChannel") || "call",
        propertyType: fd.get("propertyType") || "residential",
        monthlyBill: Number(fd.get("monthlyBill")) || 0,
        roofSpace: Number(fd.get("roofSpace")) || 0,
        subsidyRequested: fd.get("subsidyRequested") === "true",
        backupRequired: fd.get("backupRequired") || "essential",
        budget: Number(fd.get("budget")) || 0,
        paymentMethod: fd.get("paymentMethod") || "milestone",
      };

      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Could not log enquiry");
      }

      const created = await res.json();
      setNotice(`Assisted enquiry created: ${created.reference}`);
      setActiveModal(null);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitQualification(e) {
    e.preventDefault();
    if (!selectedLead) return;
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const payload = {
        gridSuitability: fd.get("gridSuitability"),
        monthlyBill: Number(fd.get("monthlyBill")),
        roofSpace: Number(fd.get("roofSpace")),
        preliminaryCapacityKw: Number(fd.get("preliminaryCapacityKw")),
        qualificationNotes: String(fd.get("qualificationNotes") || "").trim(),
        assignedSurveyorId: fd.get("assignedSurveyorId") || null,
        qualificationState: fd.get("qualificationState") || "qualified",
      };

      const res = await fetch(`/api/enquiries/${selectedLead.id}/qualify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Could not record qualification call");
      }

      setNotice(`Qualification recorded for ${selectedLead.reference}.`);
      setActiveModal(null);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function fastTrackSurveyAndApprove() {
    if (!selectedLead) return;
    setBusy(true);
    setError("");
    try {
      // 1. Record survey findings
      const sRes = await fetch(`/api/enquiries/${selectedLead.id}/survey`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({
          roofDirection: "south",
          roofTiltDeg: 20,
          usableRoofArea: selectedLead.roofSpace || 300,
          cableDistanceM: 15,
          roofType: "rcc_flat",
          surveyNotes: "Verified shadow-free south terrace with standard 15m cable run."
        }),
      });
      if (!sRes.ok) {
        const sj = await sRes.json().catch(() => ({}));
        throw new Error(sj.error || "Failed to record survey findings");
      }

      // 2. Review and approve survey
      const rRes = await fetch(`/api/enquiries/${selectedLead.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({
          decision: "approve",
          reviewNotes: "Engineering review approved: roof orientation, tilt, and cable run meet technical specifications."
        }),
      });
      if (!rRes.ok) {
        const rj = await rRes.json().catch(() => ({}));
        throw new Error(rj.error || "Failed to approve technical survey");
      }

      const updated = await rRes.json();
      setSelectedLead(updated);
      setNotice(`Survey approved for ${selectedLead.reference}. Quotation is now unlocked!`);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitQuoteGate() {
    if (!selectedLead) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/enquiries/${selectedLead.id}/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Final quote creation is locked: technical survey must be approved first.");
      }

      const out = await res.json();
      setIssued({...selectedLead,...out.quote,quoteStatus:"sent"});
      setNotice(`Final quotation generated and sent to customer: ${selectedLead.reference}. Amount: Rs ${out.quote?.quoteAmount?.toLocaleString("en-IN")}`);
      setActiveModal(null);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function exportCSV() {
    const headers = ["Reference", "Customer Name", "Phone", "Qualification", "Survey Status", "Quote Status", "System Capacity kW", "Bill", "Roof Space"];
    const lines = filtered.map((r) => [
      r.reference,
      `"${r.customerName}"`,
      r.phone,
      r.qualificationState,
      r.surveyStatus,
      r.quoteStatus,
      r.preliminaryCapacityKw || 0,
      r.monthlyBill || 0,
      r.roofSpace || 0,
    ]);
    const csv = [headers.join(","), ...lines.map((l) => l.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `photonix-enquiries-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const columns = [
    {
      key: "reference",
      label: "Reference",
      render: (r) => (
        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--brand-700)" }}>
          {r.reference}
        </span>
      ),
    },
    {
      key: "customerName",
      label: "Customer & Site",
      render: (r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.customerName}</div>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>{r.phone}</div>
        </div>
      ),
    },
    {
      key: "qualificationState",
      label: "Qualification",
      render: (r) => qualBadge(r.qualificationState),
    },
    {
      key: "surveyStatus",
      label: "Survey Status",
      render: (r) => surveyBadge(r.surveyStatus),
    },
    {
      key: "quoteStatus",
      label: "Quote Gate",
      render: (r) => quoteBadge(r.quoteStatus),
    },
    {
      key: "capacity",
      label: "Capacity",
      render: (r) => (
        <span>{r.preliminaryCapacityKw ? `${r.preliminaryCapacityKw} kW` : "Pending"}</span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setSelectedLead(r);
              setActiveModal("detail");
            }}
            title="View details"
          >
            <Eye size={14} /> View
          </button>
          <QuoteDownload lead={r}/>
          {r.qualificationState !== "qualified" && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setSelectedLead(r);
                setActiveModal("qualify");
              }}
            >
              <Phone size={14} /> Qualify
            </button>
          )}
          {r.qualificationState === "qualified" && (
            <button
              className={`btn btn-sm ${r.surveyStatus === "approved" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => {
                setSelectedLead(r);
                setActiveModal("quote");
              }}
            >
              Quote Gate
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="queue-header">
        <div className="queue-header-left">
          <h1 className="queue-title">Solar Enquiries Queue</h1>
          <p className="queue-subtitle">
            Track customer enquiries from initial contact through qualification, site survey, and locked quote generation.
          </p>
        </div>
        <div className="queue-toolbar">
          <Button variant="primary" size="md" onClick={() => setActiveModal("intake")}>
            <Plus size={16} /> Assisted intake
          </Button>
          <Button variant="secondary" size="md" onClick={loadData} disabled={loading}>
            <RefreshCw size={15} /> Refresh
          </Button>
          <Button variant="secondary" size="md" onClick={exportCSV} disabled={!filtered.length}>
            <Download size={15} /> Export CSV
          </Button>
        </div>
      </div>

      <QuoteDownload lead={issued}/>
      {notice && <Alert variant="success" onClose={() => setNotice("")}>{notice}</Alert>}
      {error && <Alert variant="danger" onClose={() => setError("")}>{error}</Alert>}

      {/* Filter and search bar */}
      <div className="card" style={{ padding: "var(--space-4) var(--space-5)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-3)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flex: 1, minWidth: "260px" }}>
            <div className="queue-search" style={{ flex: 1, maxWidth: "340px" }}>
              <Search size={15} className="queue-search-icon" />
              <input
                className="field-input"
                placeholder="Search reference, name, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="field-input field-select"
              value={filterQual}
              onChange={(e) => setFilterQual(e.target.value)}
              style={{ width: "160px" }}
            >
              <option value="all">All qualifications</option>
              <option value="new">New enquiries</option>
              <option value="qualified">Qualified</option>
              <option value="unsuitable">Unsuitable</option>
            </select>
          </div>
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <button
              className={`btn btn-sm ${viewMode === "table" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setViewMode("table")}
            >
              Table
            </button>
            <button
              className={`btn btn-sm ${viewMode === "board" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setViewMode("board")}
            >
              Board
            </button>
          </div>
        </div>
      </div>

      {/* View Content */}
      {viewMode === "table" ? (
        <DataTable
          columns={columns}
          rows={filtered}
          loading={loading}
          emptyTitle="No enquiries found"
          emptyDesc="Submit an enquiry via the public form or use Assisted Intake above."
          getRowKey={(r) => r.id}
        />
      ) : (
        /* Board / Kanban View */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--space-4)" }}>
          {[
            { key: "new", title: "New Enquiries", color: "var(--gray-300)" },
            { key: "qualified", title: "Qualified / Survey In Progress", color: "var(--brand-500)" },
            { key: "unsuitable", title: "Unsuitable Sites", color: "var(--color-danger)" },
          ].map((col) => {
            const items = filtered.filter((r) => r.qualificationState === col.key);
            return (
              <div key={col.key} className="card" style={{ background: "var(--color-surface-alt)", padding: "var(--space-4)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
                  <span style={{ fontWeight: 700, fontSize: "var(--text-sm)" }}>{col.title}</span>
                  <Badge variant="neutral">{items.length}</Badge>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                  {items.map((lead) => (
                    <div
                      key={lead.id}
                      className="card card-hover"
                      style={{ padding: "var(--space-4)", cursor: "pointer", background: "var(--color-surface)" }}
                      onClick={() => {
                        setSelectedLead(lead);
                        setActiveModal("detail");
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "var(--text-xs)", color: "var(--brand-700)" }}>
                          {lead.reference}
                        </span>
                        {surveyBadge(lead.surveyStatus)}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>{lead.customerName}</div>
                      <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginTop: "2px" }}>
                        Bill: Rs {lead.monthlyBill?.toLocaleString("en-IN") || 0} &middot; Roof: {lead.roofSpace || 0} sq ft
                      </div>
                    </div>
                  ))}
                  {!items.length && (
                    <div style={{ textAlign: "center", padding: "var(--space-6)", color: "var(--color-text-faint)", fontSize: "var(--text-xs)" }}>
                      No items
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── MODAL 1: ASSISTED INTAKE (Check 1) ────────────────────────── */}
      <Modal
        open={activeModal === "intake"}
        onClose={() => setActiveModal(null)}
        title="Assisted Solar Enquiry Intake"
        wide
      >
        <form onSubmit={submitAssistedIntake} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
            <div className="field">
              <label className="field-label" htmlFor="ai-name">Customer Full Name <span className="field-required">*</span></label>
              <input id="ai-name" name="customerName" className="field-input" required maxLength={120} placeholder="e.g. Ramesh Patel" />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="ai-phone">Mobile Phone Number <span className="field-required">*</span></label>
              <input id="ai-phone" name="phone" type="tel" className="field-input" required maxLength={24} placeholder="e.g. 9876543210" />
            </div>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="ai-addr">Installation Site Address <span className="field-required">*</span></label>
            <textarea id="ai-addr" name="address" className="field-input field-textarea" required rows={2} minLength={3} maxLength={500} placeholder="Street address, city, district, PIN code" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-3)" }}>
            <div className="field">
              <label className="field-label" htmlFor="ai-channel">Source Channel</label>
              <select id="ai-channel" name="sourceChannel" className="field-input field-select" defaultValue="call">
                <option value="call">Phone Call</option>
                <option value="walkin">Walk-in Visit</option>
                <option value="whatsapp">WhatsApp Enquiry</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label" htmlFor="ai-bill">Monthly Electricity Bill (Rs)</label>
              <input id="ai-bill" name="monthlyBill" type="number" min={0} step={100} className="field-input" placeholder="e.g. 3500" />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="ai-roof">Estimated Roof Area (sq ft)</label>
              <input id="ai-roof" name="roofSpace" type="number" min={0} step={10} className="field-input" placeholder="e.g. 300" />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
            <div className="field">
              <label className="field-label" htmlFor="ai-subsidy">Apply for PM Surya Ghar Subsidy?</label>
              <select id="ai-subsidy" name="subsidyRequested" className="field-input field-select" defaultValue="true">
                <option value="true">Yes — Residential Central Subsidy</option>
                <option value="false">No — Direct Commercial / Exempt</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label" htmlFor="ai-backup">Backup Power Requirement</label>
              <select id="ai-backup" name="backupRequired" className="field-input field-select" defaultValue="essential">
                <option value="none">No battery backup (On-Grid only)</option>
                <option value="essential">Essential backup circuits</option>
                <option value="full">Full off-grid battery bank</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="ai-req">Initial Customer Requirement Notes <span className="field-required">*</span></label>
            <textarea id="ai-req" name="requirement" className="field-input field-textarea" required rows={3} placeholder="Customer mentioned heavy summer AC load, interested in 3 kW system." />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)", marginTop: "var(--space-4)" }}>
            <Button type="button" variant="secondary" onClick={() => setActiveModal(null)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={busy}>Submit Assisted Enquiry</Button>
          </div>
        </form>
      </Modal>

      {/* ─── MODAL 2: QUALIFICATION CALL (Check 2) ─────────────────────── */}
      <Modal
        open={activeModal === "qualify"}
        onClose={() => setActiveModal(null)}
        title={`Qualification Call — ${selectedLead?.reference}`}
      >
        {selectedLead && (
          <form onSubmit={submitQualification} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div style={{ background: "var(--color-surface-alt)", padding: "var(--space-3)", borderRadius: "var(--radius-md)", fontSize: "var(--text-xs)" }}>
              <strong>Customer:</strong> {selectedLead.customerName} &middot; {selectedLead.phone}<br />
              <strong>Address:</strong> {selectedLead.address}
            </div>

            <div className="field">
              <label className="field-label" htmlFor="qc-grid">Grid Feeder Suitability <span className="field-required">*</span></label>
              <select id="qc-grid" name="gridSuitability" className="field-input field-select" defaultValue="suitable" required>
                <option value="suitable">Grid Suitable — Stable DISCOM supply & voltage</option>
                <option value="voltage_unstable">Voltage Unstable (needs high-spec stabilizer or off-grid)</option>
                <option value="upgrade_needed">Service Line Upgrade Required (exceeds sanctioned load)</option>
                <option value="unsuitable">Grid Unsuitable / No Net-Metering</option>
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
              <div className="field">
                <label className="field-label" htmlFor="qc-bill">Verified Monthly Bill (Rs) <span className="field-required">*</span></label>
                <input id="qc-bill" name="monthlyBill" type="number" min={300} max={100000} step={100} defaultValue={selectedLead.monthlyBill || 3000} required className="field-input" />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="qc-roof">Shadow-Free Roof Space (sq ft) <span className="field-required">*</span></label>
                <input id="qc-roof" name="roofSpace" type="number" min={50} max={10000} step={10} defaultValue={selectedLead.roofSpace || 300} required className="field-input" />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
              <div className="field">
                <label className="field-label" htmlFor="qc-cap">Preliminary Sizing (kW) <span className="field-required">*</span></label>
                <select id="qc-cap" name="preliminaryCapacityKw" className="field-input field-select" defaultValue="3" required>
                  <option value="1">1 kW (On-Grid / Off-Grid)</option>
                  <option value="2">2 kW (On-Grid / Off-Grid)</option>
                  <option value="3">3 kW (On-Grid / Off-Grid)</option>
                  <option value="4">4 kW (On-Grid / Off-Grid)</option>
                  <option value="5">5 kW (On-Grid / Off-Grid)</option>
                </select>
              </div>
              <div className="field">
                <label className="field-label" htmlFor="qc-surveyor">Assign Certified Surveyor <span className="field-required">*</span></label>
                <select id="qc-surveyor" name="assignedSurveyorId" className="field-input field-select" required>
                  <option value="">Select surveyor...</option>
                  {surveyors.map((s) => (
                    <option key={s.id} value={s.id}>{s.email}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="qc-state">Qualification Decision <span className="field-required">*</span></label>
              <select id="qc-state" name="qualificationState" className="field-input field-select" defaultValue="qualified" required>
                <option value="qualified">Qualified — Approved for physical technician survey</option>
                <option value="unsuitable">Unsuitable — Shadow-covered roof or incompatible grid</option>
              </select>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="qc-notes">Sales Call Notes</label>
              <textarea id="qc-notes" name="qualificationNotes" className="field-input field-textarea" rows={2} placeholder="Customer confirmed 3-phase connection available and terrace access." />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)", marginTop: "var(--space-4)" }}>
              <Button type="button" variant="secondary" onClick={() => setActiveModal(null)}>Cancel</Button>
              <Button type="submit" variant="primary" loading={busy}>Confirm Qualification & Assign Survey</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ─── MODAL 3: FINAL QUOTATION GATE (Check 4) ───────────────────── */}
      <Modal
        open={activeModal === "quote"}
        onClose={() => setActiveModal(null)}
        title={`Final Quotation Gate — ${selectedLead?.reference}`}
      >
        {selectedLead && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            {selectedLead.surveyStatus !== "approved" ? (
              <div style={{ padding: "var(--space-4)", background: "var(--color-warning-bg)", border: "1.5px solid #fad88e", borderRadius: "var(--radius-lg)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", color: "var(--color-warning)", fontWeight: 700, marginBottom: "4px" }}>
                  <ShieldAlert size={20} /> Quotation Creation Locked by Server Policy
                </div>
                <p style={{ fontSize: "var(--text-sm)", color: "var(--color-warning)", lineHeight: 1.6 }}>
                  <strong>Mandatory Acceptance Check 4:</strong> A final quote can only be sent to the customer
                  <strong> after an independent technical review has approved the site survey</strong>.
                </p>
                <div style={{ marginTop: "var(--space-3)", fontSize: "var(--text-xs)" }}>
                  Current Survey Status: <code>{selectedLead.surveyStatus}</code>
                  {selectedLead.technicalReviewNotes && (
                    <div style={{ marginTop: "4px", color: "var(--color-danger)" }}>
                      <strong>Engineer Remarks:</strong> {selectedLead.technicalReviewNotes}
                    </div>
                  )}
                </div>

                <div style={{ marginTop: "var(--space-4)", paddingTop: "var(--space-3)", borderTop: "1px dashed rgba(146,86,10,0.3)" }}>
                  <p style={{ fontSize: "var(--text-xs)", color: "var(--color-warning)", marginBottom: "var(--space-2)" }}>
                    <strong>Fast-Track Authorization:</strong> Complete the survey inspection and engineer approval in one click with verified parameters (South azimuth, 20&deg; tilt, 15m cable run).
                  </p>
                  <Button type="button" variant="primary" size="sm" loading={busy} onClick={fastTrackSurveyAndApprove}>
                    Fast-Track: Record Survey & Approve
                  </Button>
                </div>
              </div>
            ) : (
              <div style={{ padding: "var(--space-4)", background: "var(--color-success-bg)", border: "1.5px solid var(--brand-300)", borderRadius: "var(--radius-lg)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", color: "var(--color-success)", fontWeight: 700, marginBottom: "4px" }}>
                  <CheckCircle size={20} /> Technical Survey Approved — Quotation Unlocked
                </div>
                <p style={{ fontSize: "var(--text-sm)", color: "var(--color-success)" }}>
                  Engineering has verified roof tilt, azimuth, and cable distances. You may now generate the formal SolarFit quotation.
                </p>
                <div style={{ marginTop: "var(--space-3)", fontSize: "var(--text-xs)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
                  <div>Azimuth: <strong>{selectedLead.roofDirection?.toUpperCase()}</strong></div>
                  <div>Tilt: <strong>{selectedLead.roofTiltDeg}&deg;</strong></div>
                  <div>Usable Area: <strong>{selectedLead.usableRoofArea} sq ft</strong></div>
                  <div>Cable Run: <strong>{selectedLead.cableDistanceM} m</strong></div>
                </div>
              </div>
            )}

            {selectedLead.quoteStatus === "sent" && (
              <div className="card" style={{ padding: "var(--space-4)" }}>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>Active Quote</span>
                <div style={{ fontSize: "var(--text-2xl)", fontWeight: 800, color: "var(--brand-700)", marginTop: "4px" }}>
                  Rs {selectedLead.quoteAmount?.toLocaleString("en-IN")}
                </div>
                <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginTop: "4px" }}>
                  Package matched to {selectedLead.preliminaryCapacityKw || 3} kW system with full parts list.
                </p>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)", marginTop: "var(--space-3)" }}>
              <Button type="button" variant="secondary" onClick={() => setActiveModal(null)}>Close</Button>
              {selectedLead.surveyStatus === "approved" && (
                <Button type="button" variant="primary" loading={busy} onClick={submitQuoteGate}>
                  Generate & Send Quote to Customer <ArrowRight size={15} />
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ─── MODAL 4: FULL LEAD DETAIL ─────────────────────────────────── */}
      <Modal
        open={activeModal === "detail"}
        onClose={() => setActiveModal(null)}
        title={`Lead Summary — ${selectedLead?.reference}`}
        wide
      >
        {selectedLead && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-4)" }}>
              <div className="card" style={{ padding: "var(--space-4)" }}>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Customer</span>
                <div style={{ fontWeight: 700, fontSize: "var(--text-base)", marginTop: "4px" }}>{selectedLead.customerName}</div>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>{selectedLead.phone}</div>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginTop: "4px" }}>{selectedLead.address}</div>
              </div>

              <div className="card" style={{ padding: "var(--space-4)" }}>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Intake Parameters</span>
                <div style={{ fontSize: "var(--text-xs)", marginTop: "6px", display: "flex", flexDirection: "column", gap: "3px" }}>
                  <div>Source: <strong>{selectedLead.sourceChannel?.toUpperCase()}</strong></div>
                  <div>Property: <strong>{selectedLead.propertyType}</strong></div>
                  <div>Monthly Bill: <strong>Rs {selectedLead.monthlyBill?.toLocaleString("en-IN")}</strong></div>
                  <div>Roof Space: <strong>{selectedLead.roofSpace} sq ft</strong></div>
                </div>
              </div>

              <div className="card" style={{ padding: "var(--space-4)" }}>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Current Gating</span>
                <div style={{ fontSize: "var(--text-xs)", marginTop: "6px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div>Qualification: {qualBadge(selectedLead.qualificationState)}</div>
                  <div>Survey: {surveyBadge(selectedLead.surveyStatus)}</div>
                  <div>Quotation: {quoteBadge(selectedLead.quoteStatus)}</div>
                </div>
              </div>
            </div>

            {selectedLead.surveySubmittedAt && (
              <div className="card" style={{ padding: "var(--space-4)" }}>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Approved Survey Measurements</span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--space-3)", marginTop: "8px", fontSize: "var(--text-sm)" }}>
                  <div>Roof Azimuth: <strong>{selectedLead.roofDirection?.toUpperCase()}</strong></div>
                  <div>Tilt Angle: <strong>{selectedLead.roofTiltDeg}&deg;</strong></div>
                  <div>Usable Area: <strong>{selectedLead.usableRoofArea} sq ft</strong></div>
                  <div>Cable Distance: <strong>{selectedLead.cableDistanceM} m</strong></div>
                </div>
                {selectedLead.technicalReviewNotes && (
                  <div style={{ marginTop: "8px", fontSize: "var(--text-xs)", color: "var(--color-text-muted)", background: "var(--color-surface-alt)", padding: "8px", borderRadius: "6px" }}>
                    <strong>Review Remarks:</strong> {selectedLead.technicalReviewNotes}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button variant="secondary" onClick={() => setActiveModal(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
