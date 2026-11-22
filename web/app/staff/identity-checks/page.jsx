"use client";
/* Identity Verifier Evidence Recording & Verification */
import { useEffect, useState } from "react";
import { ShieldCheck, UserX, RefreshCw } from "lucide-react";
import { Button, Alert, Spinner, DataTable, Card, Badge } from "../../../components/ui";

export default function IdentityChecksPage() {
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
      if (!res.ok) throw new Error("Could not load identity checks queue");
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

  async function verify(id, decision) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/staff/applications/${id}/decisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ decision, evidenceReference: "Identity and background documents verified" }),
      });
      if (!res.ok) throw new Error("Could not record verification decision");
      setNotice(`Applicant credentials ${decision === "verify" ? "verified" : "rejected"}.`);
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
    { key: "state", label: "State", render: (r) => <Badge variant="warning">{r.state}</Badge> },
    { key: "actions", label: "Verification Action", render: (r) => (
      <div style={{ display: "flex", gap: "6px" }}>
        <Button variant="primary" size="sm" loading={busy} onClick={() => verify(r.id, "verify")}>
          <ShieldCheck size={14} /> Verify Evidence
        </Button>
        <Button variant="danger" size="sm" loading={busy} onClick={() => verify(r.id, "reject")}>
          <UserX size={14} /> Reject
        </Button>
      </div>
    )},
  ];

  return (
    <>
      <div className="queue-header">
        <div className="queue-header-left">
          <h1 className="queue-title">Identity & Credential Verification</h1>
          <p className="queue-subtitle">
            Verifier work queue. Perform independent verification of employee identity and evidence reference before forwarding to administrator admission.
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
        emptyTitle="No pending staff applications waiting for verification"
      />
    </>
  );
}
