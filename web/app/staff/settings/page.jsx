"use client";
/* Workspace Settings, Administrator Profile, Role Permissions & Policy Configuration */
import { useEffect, useState } from "react";
import { Button, Card, Badge, Alert, Spinner } from "../../../components/ui";
export default function SettingsPage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Change password state
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  function getAuthHeader() {
    const token = typeof window !== "undefined" ? sessionStorage.getItem("photonix_token") : "";
    return { Authorization: `Bearer ${token}` };
  }

  async function loadSettings() {
    setLoading(true);
    try {
      // 1. Load active profile
      const meRes = await fetch("/api/me", { headers: getAuthHeader() });
      if (meRes.ok) {
        const me = await meRes.json();
        setProfile(me);
        sessionStorage.setItem("photonix_account", JSON.stringify(me));
      }

      if (!meRes.ok) throw Error("Could not load your account.");
    } catch (err) {setError(err.message);}
    finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  async function handlePasswordChange(e) {
    e.preventDefault();
    if (newPw !== confirmPw) {
      setError("New password and confirmation do not match.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/me/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update password.");
      setNotice("Password changed successfully.");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

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
          <h1 className="queue-title">Account settings</h1>
          <p className="queue-subtitle">
            View your work account and update your password.
          </p>
        </div>
      </div>

      {notice && <Alert variant="success" onClose={() => setNotice("")}>{notice}</Alert>}
      {error && <Alert variant="danger" onClose={() => setError("")}>{error}</Alert>}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", marginTop: "var(--space-2)" }}>
        {/* Section 1: Active User Profile & Theme Preferences */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(0, 1fr))", gap: "var(--space-4)" }}>
          <Card>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
              <div style={{
                width: 44, height: 44, borderRadius: "50%", background: "var(--brand-100)",
                color: "var(--brand-800)", display: "flex", alignItems: "center",
                justifyContent: "center", fontWeight: 800, fontSize: "var(--text-lg)"
              }}>
                {(profile?.email || "?").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h2 style={{ fontSize: "var(--text-base)", fontWeight: 750, margin: 0 }}>
                  {profile?.email || "Authenticated Staff"}
                </h2>
                <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", marginTop: "2px" }}>
                  <Badge variant="success">Active</Badge>
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
                    Role: <strong>{profile?.role?.toUpperCase()}</strong>
                  </span>
                </div>
              </div>
            </div>

            <div style={{ fontSize: "var(--text-xs)", display: "flex", flexDirection: "column", gap: "var(--space-2)", borderTop: "1px solid var(--color-border)", paddingTop: "var(--space-3)" }}>
              <div>Member since {profile && new Date(profile.created_at).toLocaleDateString("en-IN")}</div>
            </div>
          </Card>
        </div>
        {/* Section 2: Change Password Card */}
        <Card>
          <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 750, marginBottom: "var(--space-2)" }}>
            Change password
          </h2>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-4)" }}>
            Enter your current password to choose a new one.
          </p>

          <form onSubmit={handlePasswordChange} style={{ maxWidth: 480, display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div className="field">
              <label className="field-label" htmlFor="cur-pw">Current Password <span className="field-required">*</span></label>
              <input
                id="cur-pw"
                type="password"
                className="field-input"
                required
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="Current password"
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="new-pw">New Password <span className="field-required">*</span></label>
              <input
                id="new-pw"
                type="password"
                className="field-input"
                required
                minLength={8}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="At least 8 characters"
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="cfm-pw">Confirm New Password <span className="field-required">*</span></label>
              <input
                id="cfm-pw"
                type="password"
                className="field-input"
                required
                minLength={8}
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Re-enter new password"
              />
            </div>
            <div style={{ marginTop: "var(--space-2)" }}>
              <Button type="submit" variant="primary" loading={busy}>
                Update Password
              </Button>
            </div>
          </form>
        </Card>

      </div>
    </>
  );
}
