"use client";
/* Administrator Staff Admissions Review & Approval */
import { useEffect, useState } from "react";
import { UserCheck, UserX, RefreshCw } from "lucide-react";
import { Button, Alert, Spinner, DataTable, Card, Badge } from "../../../components/ui";

export default function AdmissionsPage() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  function getAuthHeader() {
    const token = typeof window !== "undefined" ? sessionStorage.getItem("photonix_token") : "";
    return { Authorization: `Bearer ${token}` };
  }

  async function loadApps() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/staff/applications", { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Could not load admissions queue");
      const list = await res.json();
      setApps(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadApps();
  }, []);

  async function decide(id, decision) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/staff/applications/${id}/decisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ decision, evidenceReference: "Admin formal admission" }),
      });
      if (!res.ok) throw new Error("Could not record admission decision");
      setNotice(`Application ${decision === "admit" ? "admitted to active service" : "rejected"}.`);
      await loadApps();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const columns = [
    { key: "email", label: "Applicant Email", render: (r) => <strong>{r.email}</strong> },
    { key: "role", label: "Requested Role", render: (r) => <Badge variant="neutral">{r.role}</Badge> },
    { key: "state", label: "Current State", render: (r) => <Badge variant="info">{r.state}</Badge> },
    { key: "verification_reference", label: "Verifier Evidence", render: (r) => r.verification_reference || "Pending verifier check" },
    { key: "actions", label: "Admin Decision", render: (r) => (
      <div style={{ display: "flex", gap: "6px" }}>
        <Button variant="primary" size="sm" loading={busy} onClick={() => decide(r.id, "admit")}>
          <UserCheck size={14} /> Admit
        </Button>
        <Button variant="danger" size="sm" loading={busy} onClick={() => decide(r.id, "reject")}>
          <UserX size={14} /> Reject
        </Button>
      </div>
    )},
  ];

  return (
    <>
      <div className="queue-header">
        <div className="queue-header-left">
          <h1 className="queue-title">Staff Applications & Admissions</h1>
          <p className="queue-subtitle">
            Admin review queue. Enforces the two-person admission policy: only applications verified by an independent identity verifier can be admitted to active service.
          </p>
        </div>
        <div className="queue-toolbar">
          <Button variant="secondary" size="md" onClick={loadApps} disabled={loading}>
            <RefreshCw size={15} /> Refresh
          </Button>
        </div>
      </div>

      {notice && <Alert variant="success" onClose={() => setNotice("")}>{notice}</Alert>}
      {error && <Alert variant="danger" onClose={() => setError("")}>{error}</Alert>}

      <DataTable
        columns={columns}
        rows={apps}
        loading={loading}
        getRowKey={(r) => r.id}
        emptyTitle="No verified applications waiting for admission"
      />
    </>
  );
}
