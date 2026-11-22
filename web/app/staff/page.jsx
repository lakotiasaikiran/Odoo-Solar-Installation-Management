"use client";
/* Staff sign-in page — split layout with demo accounts panel */
import { useState, useRef } from "react";
import { ChevronDown, ChevronUp, Eye, EyeOff, Key } from "lucide-react";
import { Button, Alert } from "../../components/ui";
import { ThemeToggle } from "../../components/ThemeToggle";
import "../components.css";
import "../public.css";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

const ROLE_LABELS = {
  admin: "Administrator",
  verifier: "Identity verifier",
  sales: "Sales adviser",
  surveyor: "Site surveyor",
  technical_reviewer: "Technical reviewer",
  warehouse: "Warehouse operator",
  installer: "Installation crew",
  support: "Support agent",
  director: "Director",
  manager: "Quote manager",
  finance: "Finance",
};

export default function StaffSignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [demoOpen, setDemoOpen] = useState(false);
  const [demoAccounts, setDemoAccounts] = useState(null);

  async function loadDemoAccounts() {
    if (demoAccounts) { setDemoOpen(v => !v); return; }
    try {
      const r = await fetch("/api/demo-accounts");
      if (r.ok) setDemoAccounts(await r.json());
    } catch {}
    setDemoOpen(true);
  }

  async function handleLogin(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      if (!res.ok) {
        throw new Error(
          res.status === 401 ? "Sign-in failed. Check your email and password, and that your account is active." :
          res.status === 429 ? "Too many sign-in attempts. Please wait and try again." :
          "Sign-in service unavailable. Please try again."
        );
      }
      const { accessToken } = await res.json();
      const meRes = await fetch("/api/me", { headers: { Authorization: "Bearer " + accessToken } });
      if (!meRes.ok) throw new Error("Could not load your account. Please sign in again.");
      const account = await meRes.json();

      // Store token in sessionStorage (never localStorage — short-lived JWT)
      sessionStorage.setItem("photonix_token", accessToken);
      sessionStorage.setItem("photonix_account", JSON.stringify(account));

      // Role-based redirect
      const redirects = {
        sales: "/staff/enquiries", surveyor: "/staff/site-visits",
        technical_reviewer: "/staff/survey-approvals", warehouse: "/staff/packing",
        installer: "/staff/installations", support: "/staff/complaints",
        director: "/staff/dashboard", manager: "/staff/dashboard",
        admin: "/staff/admissions", verifier: "/staff/identity-checks",
        finance: "/staff/finance",
      };
      window.location.href = redirects[account.role] ?? "/staff/enquiries";
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  function fillDemo(acc) {
    setEmail(acc.email);
    setPassword(acc.password);
    setDemoOpen(false);
  }

  return (
    <div className="signin-layout" style={{ minHeight: "100vh" }}>
      {/* Left visual */}
      <div className="signin-visual">
        <div className="signin-visual-content">
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "2.5rem" }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img className="photonix-mark" src="/brand/photonix-emblem.webp" width="32" height="32" alt="" />
            </div>
            <span style={{ fontWeight: 750, fontSize: "1rem", color: "#fff", letterSpacing: "-.02em" }}>Photonix Solar</span>
          </div>
          <h1 className="signin-visual-title">
            Solar installation management, from enquiry to warranty.
          </h1>
          <p className="signin-visual-desc">
            Role-based workspace for sales advisers, surveyors, engineers, warehouse operators, installers, and directors.
          </p>
        </div>
      </div>

      {/* Right sign-in panel */}
      <div className="signin-panel">
        <div style={{ position: "absolute", top: "1.25rem", right: "1.25rem" }}>
          <ThemeToggle />
        </div>
        <div className="signin-box"><a className="signin-home" href="/">← Photonix home</a>
          <h2 className="signin-heading">Staff sign in</h2>
          <p className="signin-subheading">Enter your work email and password to access your workspace.</p>

          <form className="signin-form" onSubmit={handleLogin}>
            <div className="field">
              <label className="field-label" htmlFor="email">Email address</label>
              <input
                id="email" type="email" className="field-input"
                required autoComplete="email" maxLength={254}
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@photonix.com"
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="password">Password</label>
              <div style={{ position: "relative" }}>
                <input
                  id="password" type={showPw ? "text" : "password"} className="field-input"
                  required autoComplete="current-password"
                  value={password} onChange={e => setPassword(e.target.value)}
                  style={{ paddingRight: "2.5rem" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  style={{ position: "absolute", right: ".625rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-faint)", padding: "2px" }}
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && <Alert variant="danger" onClose={() => setError("")}>{error}</Alert>}

            <Button type="submit" variant="primary" size="lg" loading={busy} style={{ width: "100%", justifyContent: "center" }}>
              Sign in
            </Button>
          </form>

          {DEMO_MODE && (
            <div className="demo-accounts" style={{ marginTop: "2rem" }}>
              <button className="demo-accounts-trigger" onClick={loadDemoAccounts}>
                <span>Demo accounts (all use: Photonix@123)</span>
                {demoOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {demoOpen && (
                <div className="demo-account-list">
                  <div style={{
                    padding: "0.5rem 0.75rem",
                    background: "var(--color-surface-alt)",
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    color: "var(--color-text-muted)",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginBottom: "0.5rem"
                  }}>
                    <Key size={13} style={{ flexShrink: 0 }} />
                    <span>Universal Password: <strong>Photonix@123</strong></span>
                  </div>
                  {demoAccounts ? demoAccounts.map(acc => (
                    <button key={acc.email} className="demo-account-btn" onClick={() => fillDemo(acc)}>
                      <span className="demo-account-role">{ROLE_LABELS[acc.role] ?? acc.role}</span>
                      <span className="demo-account-email">{acc.email}</span>
                    </button>
                  )) : (
                    <div style={{ padding: "1rem", fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>Loading demo accounts…</div>
                  )}
                </div>
              )}
            </div>
          )}

          <p style={{ marginTop: "1.5rem", fontSize: "0.8125rem", color: "var(--color-text-muted)", textAlign: "center" }}>
            Need access?{" "}
            <a href="/staff/apply" className="signin-home">Apply for a staff account</a>
          </p>
        </div>
      </div>
    </div>
  );
}
