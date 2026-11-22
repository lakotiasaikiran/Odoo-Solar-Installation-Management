"use client";
/* Staff Directory & Personnel Access Management */
import { useEffect, useState, useMemo } from "react";
import {
  Users, UserPlus, Shield, CheckCircle, XCircle, Search, RefreshCw, Download,
  Mail, Key, UserCheck, AlertTriangle
} from "lucide-react";
import { Button, Badge, Card, Spinner, Alert, Modal, DataTable } from "../../../components/ui";

const ROLE_LABELS = {
  director: "Director / Management",
  sales: "Sales Adviser",
  surveyor: "Site Surveyor",
  technical_reviewer: "Technical Reviewer",
  warehouse: "Warehouse Operator",
  installer: "Installation Crew",
  support: "Support Agent",
  finance: "Finance Specialist",
  admin: "System Administrator",
  verifier: "Identity Verifier",
};

export default function StaffUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [addModal, setAddModal] = useState(false);

  function getAuthHeader() {
    const token = typeof window !== "undefined" ? sessionStorage.getItem("photonix_token") : "";
    return { Authorization: `Bearer ${token}` };
  }

  async function loadUsers() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/staff/users", { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Could not load staff directory.");
      setUsers(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        !search ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.role.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  async function handleAddUser(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/staff/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({
          email: fd.get("email"),
          role: fd.get("role"),
          password: fd.get("password"),
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to create staff account.");
      }

      setNotice("New staff member account created and activated.");
      setAddModal(false);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(u) {
    const nextState = u.state === "active" ? "suspended" : "active";
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/staff/users/${u.id}/state`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ state: nextState }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Could not update user status.");
      }

      setNotice(`Account ${u.email} is now ${nextState}.`);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function exportCSV() {
    const headers = ["ID", "Email", "Role", "Status", "Created At"];
    const rows = filtered.map(u => [u.id, u.email, u.role, u.state, u.created_at]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `photonix_staff_roster_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const columns = [
    {
      key: "email",
      label: "Staff Member",
      render: (r) => (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%", background: "var(--brand-100)",
            color: "var(--brand-800)", display: "flex", alignItems: "center",
            justifyContent: "center", fontWeight: 700, fontSize: "var(--text-xs)"
          }}>
            {r.email.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>{r.email}</div>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-faint)", fontFamily: "var(--font-mono)" }}>
              ID: {r.id.slice(0, 8)}…
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      label: "Assigned Role",
      render: (r) => (
        <div>
          <span style={{ fontWeight: 600 }}>{ROLE_LABELS[r.role] || r.role}</span>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
            <code>{r.role}</code>
          </div>
        </div>
      ),
    },
    {
      key: "state",
      label: "Account Status",
      render: (r) => (
        <Badge variant={r.state === "active" ? "success" : r.state === "pending" ? "warning" : "danger"}>
          {r.state.toUpperCase()}
        </Badge>
      ),
    },
    {
      key: "created_at",
      label: "Registered",
      render: (r) => (
        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
          {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Management",
      render: (r) => (
        <Button
          variant={r.state === "active" ? "danger" : "secondary"}
          size="sm"
          disabled={busy}
          onClick={() => toggleStatus(r)}
        >
          {r.state === "active" ? "Suspend" : "Activate"}
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-16)" }}>
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <>
      <div className="queue-header">
        <div className="queue-header-left">
          <h1 className="queue-title">Staff & Personnel Directory</h1>
          <p className="queue-subtitle">
            Manage authenticated company accounts, role delegations, and active personnel access.
          </p>
        </div>
        <div className="queue-toolbar">
          <Button variant="primary" size="md" onClick={() => { setError(""); setAddModal(true); }}>
            <UserPlus size={16} /> Add staff member
          </Button>
          <Button variant="secondary" size="md" onClick={loadUsers}>
            <RefreshCw size={15} /> Refresh
          </Button>
          <Button variant="secondary" size="md" onClick={exportCSV}>
            <Download size={15} /> Export CSV
          </Button>
        </div>
      </div>

      {notice && <Alert variant="success" onClose={() => setNotice("")}>{notice}</Alert>}
      {error && !addModal && <Alert variant="danger" onClose={() => setError("")}>{error}</Alert>}

      {/* Filter and Search Bar */}
      <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-4)", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 240px", maxWidth: 360 }}>
          <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-faint)" }} />
          <input
            type="search"
            className="field-input"
            style={{ paddingLeft: "2rem" }}
            placeholder="Search email or role…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="field-input field-select"
          style={{ width: "auto" }}
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="all">All Roles</option>
          {Object.entries(ROLE_LABELS).map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
      </div>

      <div className="staff-directory-table"><DataTable
        columns={columns}
        rows={filtered}
        emptyMessage="No staff accounts match your current filters."
      /></div>

      {/* Add Staff Modal */}
      <Modal
        open={addModal}
        onClose={() => setAddModal(false)}
        title="Add New Staff Member"
      >
        {error && <Alert variant="danger">{error}</Alert>}
        <form onSubmit={handleAddUser} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div className="field">
            <label className="field-label" htmlFor="staff-email">Work Email Address <span className="field-required">*</span></label>
            <input
              id="staff-email"
              name="email"
              type="email"
              className="field-input"
              required
              placeholder="e.g. technician@photonix.com"
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="staff-role">Assigned Profession / Role <span className="field-required">*</span></label>
            <select id="staff-role" name="role" className="field-input field-select" required defaultValue="installer">
              {Object.entries(ROLE_LABELS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="staff-password">Initial Password</label>
            <input
              id="staff-password"
              name="password"
              type="password"
              className="field-input"
              required minLength={12} autoComplete="new-password"
            />
            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginTop: "4px" }}>
              Use at least 12 characters.
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)", marginTop: "var(--space-4)" }}>
            <Button type="button" variant="secondary" onClick={() => setAddModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={busy}>Create & Activate Account</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
