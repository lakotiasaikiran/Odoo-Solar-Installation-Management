"use client";
/* Support & Warranty Service Tickets with Automatic Cost Billing (Scope 5) */
import { useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, Plus, CheckCircle2, RefreshCw, AlertCircle } from "lucide-react";
import { Button, Card, Badge, Alert, Spinner, DataTable, Modal } from "../../../components/ui";

export default function ComplaintsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTicketModal, setNewTicketModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  function getAuthHeader() {
    const token = typeof window !== "undefined" ? sessionStorage.getItem("photonix_token") : "";
    return { Authorization: `Bearer ${token}` };
  }

  async function loadTickets() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/support/tickets", { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Could not load support tickets");
      const list = await res.json();
      setTickets(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTickets();
  }, []);

  async function handleCreateTicket(e) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const payload = {
        serialNumber: String(fd.get("serialNumber")).trim(),
        customerName: String(fd.get("customerName")).trim(),
        customerPhone: String(fd.get("customerPhone")).trim(),
        issueDescription: String(fd.get("issueDescription")).trim(),
      };

      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Could not log service ticket");
      }

      const out = await res.json();
      setNotice(out.message || "Service ticket opened.");
      setNewTicketModal(false);
      await loadTickets();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmTicket(confirmCustomer) {
    if (!selectedTicket) return;
    setBusy(true);
    setError("");
    try {
      const notes = document.getElementById("st-res-notes")?.value || "Service completed and verified.";
      const res = await fetch(`/api/support/tickets/${selectedTicket.id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({
          technicianNotes: notes,
          customerConfirmed: confirmCustomer,
        }),
      });

      if (!res.ok) throw new Error("Could not update ticket resolution");
      setNotice(confirmCustomer ? "Customer confirmed system is working. Ticket closed." : "Ticket marked as resolved.");
      setSelectedTicket(null);
      await loadTickets();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const columns = [
    { key: "ticket_number", label: "Ticket #", render: (r) => <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>{r.ticket_number}</span> },
    { key: "serial_number", label: "Equipment Serial", render: (r) => (
      <div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)" }}>{r.serial_number}</span>
        <div style={{ fontSize: "10px", color: "var(--color-text-muted)", textTransform: "capitalize" }}>{r.product_type}</div>
      </div>
    )},
    { key: "customer_name", label: "Customer", render: (r) => (
      <div>
        <div style={{ fontWeight: 600 }}>{r.customer_name}</div>
        <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>{r.customer_phone}</div>
      </div>
    )},
    { key: "in_warranty", label: "Warranty Gating", render: (r) => (
      r.in_warranty ? (
        <Badge variant="success">In Warranty (Rs 0 Free Repair)</Badge>
      ) : (
        <Badge variant="danger">Out of Warranty (Billed: Rs {Number(r.parts_cost) + Number(r.labour_cost)})</Badge>
      )
    )},
    { key: "issue_description", label: "Reported Breakdown", render: (r) => (
      <span style={{ fontSize: "var(--text-xs)", maxWidth: "240px", display: "inline-block" }}>{r.issue_description}</span>
    )},
    { key: "status", label: "Status", render: (r) => (
      <Badge variant={r.status === "customer_confirmed" ? "success" : r.status === "resolved" ? "info" : "warning"}>
        {r.status === "customer_confirmed" ? "Customer Confirmed (Closed)" : r.status}
      </Badge>
    )},
    { key: "actions", label: "Actions", render: (r) => (
      r.status !== "customer_confirmed" ? (
        <Button variant="secondary" size="sm" onClick={() => setSelectedTicket(r)}>
          Update / Resolve
        </Button>
      ) : (
        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-success)", fontWeight: 600 }}>Resolved</span>
      )
    )},
  ];

  return (
    <>
      <div className="queue-header">
        <div className="queue-header-left">
          <h1 className="queue-title">Support & Breakdown Service Tickets</h1>
          <p className="queue-subtitle">
            Serial lookup, automated warranty entitlement check, free warranty repairs, and automatic billing for out-of-warranty replacements. Tickets remain open until customer confirmation.
          </p>
        </div>
        <div className="queue-toolbar">
          <Button variant="primary" size="md" onClick={() => setNewTicketModal(true)}>
            <Plus size={16} /> Open Service Ticket
          </Button>
          <Button variant="secondary" size="md" onClick={loadTickets} disabled={loading}>
            <RefreshCw size={15} /> Refresh
          </Button>
        </div>
      </div>

      {notice && <Alert variant="success" onClose={() => setNotice("")}>{notice}</Alert>}
      {error && <Alert variant="danger" onClose={() => setError("")}>{error}</Alert>}

      <DataTable
        columns={columns}
        rows={tickets}
        loading={loading}
        getRowKey={(r) => r.id}
        emptyTitle="No open service tickets"
      />

      {/* ─── CREATE TICKET MODAL ─────────────────────────────────────── */}
      <Modal open={newTicketModal} onClose={() => setNewTicketModal(false)} title="Open Customer Support / Service Ticket">
        <form onSubmit={handleCreateTicket} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div className="field">
            <label className="field-label" htmlFor="st-serial">Equipment Serial Number <span className="field-required">*</span></label>
            <input
              id="st-serial"
              name="serialNumber"
              required
              className="field-input"
              style={{ fontFamily: "var(--font-mono)" }}
              placeholder="e.g. INV-2026-1002 or PAN-2026-5012"
              autoFocus
            />
            <span className="field-hint">The system automatically verifies whether this unit is within its 2-yr or 20-yr warranty term.</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
            <div className="field">
              <label className="field-label" htmlFor="st-cust">Customer Full Name <span className="field-required">*</span></label>
              <input id="st-cust" name="customerName" required className="field-input" placeholder="e.g. Rajesh Kumar" />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="st-phone">Customer Phone Number <span className="field-required">*</span></label>
              <input id="st-phone" name="customerPhone" required className="field-input" placeholder="e.g. 9876543210" />
            </div>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="st-issue">Reported Breakdown / Fault Symptoms <span className="field-required">*</span></label>
            <textarea
              id="st-issue"
              name="issueDescription"
              required
              className="field-input field-textarea"
              rows={3}
              placeholder="e.g. Inverter display showing error code 04 (DC Overvoltage) after grid surge. Generation stopped."
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)", marginTop: "var(--space-3)" }}>
            <Button type="button" variant="secondary" onClick={() => setNewTicketModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={busy}>
              Verify Serial & Log Ticket
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── RESOLVE & CUSTOMER CONFIRMATION MODAL ───────────────────── */}
      <Modal open={Boolean(selectedTicket)} onClose={() => setSelectedTicket(null)} title={`Resolve Ticket — ${selectedTicket?.ticket_number}`}>
        {selectedTicket && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div style={{ background: "var(--color-surface-alt)", padding: "var(--space-4)", borderRadius: "var(--radius-md)", fontSize: "var(--text-xs)" }}>
              <div><strong>Customer:</strong> {selectedTicket.customer_name} &middot; {selectedTicket.customer_phone}</div>
              <div><strong>Serial Number:</strong> {selectedTicket.serial_number} ({selectedTicket.product_type})</div>
              <div><strong>Warranty Status:</strong> {selectedTicket.in_warranty ? "In Warranty (Free Repair)" : `Out of Warranty (Parts: Rs ${selectedTicket.parts_cost}, Labour: Rs ${selectedTicket.labour_cost})`}</div>
              <div style={{ marginTop: "4px" }}><strong>Issue:</strong> {selectedTicket.issue_description}</div>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="st-res-notes">Technician Service & Resolution Remarks</label>
              <textarea
                id="st-res-notes"
                className="field-input field-textarea"
                rows={3}
                defaultValue={selectedTicket.technician_notes || "Inspected unit. Replaced blown fuse and tested output. Output normal at 2850W."}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-3)", marginTop: "var(--space-3)" }}>
              <Button type="button" variant="secondary" onClick={() => setSelectedTicket(null)}>Cancel</Button>
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                <Button type="button" variant="secondary" loading={busy} onClick={() => handleConfirmTicket(false)}>
                  Mark Resolved (Pending Customer)
                </Button>
                <Button type="button" variant="primary" loading={busy} onClick={() => handleConfirmTicket(true)}>
                  <CheckCircle2 size={15} /> Customer Confirmed Working (Close Ticket)
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
