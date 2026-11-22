"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Phone, Lock, FileText, ArrowRight, ShieldCheck, 
  CheckCircle2, User, HelpCircle, Sun, AlertCircle
} from "lucide-react";
import "../../globals.css";
import "../../components.css";
import "../../public.css";

export default function CustomerLoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState("reference"); // 'reference' | 'password' | 'register'
  
  // Form fields
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [reference, setReference] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [demoCustomers, setDemoCustomers] = useState([]);

  useEffect(() => {
    // If already logged in, redirect to portal
    const existing = sessionStorage.getItem("photonix_customer_token");
    if (existing) {
      router.push("/customer/portal");
      return;
    }

    // Load available demo customers
    fetch("/api/customer/demo-customers")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setDemoCustomers(data);
      })
      .catch(() => {});
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let endpoint = "/api/customer/login";
      let payload = { phone };

      if (tab === "register") {
        endpoint = "/api/customer/register";
        payload = { phone, name, email, password };
      } else if (tab === "reference") {
        payload = { phone, reference };
      } else {
        payload = { phone, password };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      // Store customer session
      sessionStorage.setItem("photonix_customer_token", data.token);
      sessionStorage.setItem("photonix_customer_profile", JSON.stringify(data.customer));
      
      router.push("/customer/portal");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleQuickFill(demo) {
    setPhone(demo.phone);
    if (tab === "reference") {
      setReference(demo.reference);
    } else {
      setPassword("Photonix@123");
    }
    setError("");
  }

  return (
    <div className="pub-section" style={{ minHeight: "85vh", display: "flex", alignItems: "center" }}>
      <div className="container" style={{ maxWidth: "1000px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem", alignItems: "center" }}>
          
          {/* Left Column: Context & Guarantees */}
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.25rem 0.75rem", borderRadius: "9999px", background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", fontSize: "0.8125rem", color: "var(--color-text-muted)", marginBottom: "1rem" }}>
              <Sun size={14} className="text-primary" />
              <span>Customer Self-Service Portal</span>
            </div>
            
            <h1 style={{ fontSize: "2.25rem", fontWeight: "700", lineHeight: "1.2", marginBottom: "1rem", letterSpacing: "-0.02em" }}>
              Track your solar installation and manage invoices
            </h1>
            
            <p style={{ color: "var(--color-text-muted)", fontSize: "1rem", lineHeight: "1.6", marginBottom: "2rem" }}>
              Sign in with your mobile number to view real-time site engineering milestones, download formal solar quotations, and generate tax invoices strictly scoped to your project.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                <div style={{ marginTop: "0.2rem", color: "var(--color-primary)" }}>
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: "600", fontSize: "0.9375rem" }}>Strict Customer Isolation</div>
                  <div style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
                    Your system sizing, quotation, and invoices are strictly isolated and never shared with other customers.
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                <div style={{ marginTop: "0.2rem", color: "var(--color-primary)" }}>
                  <FileText size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: "600", fontSize: "0.9375rem" }}>Formal Quotation Download</div>
                  <div style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
                    Download complete bill of quantities, 25-year module warranties, and central PM Surya Ghar subsidy details.
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                <div style={{ marginTop: "0.2rem", color: "var(--color-primary)" }}>
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: "600", fontSize: "0.9375rem" }}>Milestone Tax Invoicing</div>
                  <div style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
                    Generate your 20% advance booking GST invoice with verifiable bank and UPI payment details.
                  </div>
                </div>
              </div>
            </div>

            {/* Demo Quick-Fill Section */}
            {demoCustomers.length > 0 && (
              <div style={{ marginTop: "2.5rem", padding: "1.25rem", borderRadius: "0.75rem", background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)" }}>
                <div style={{ fontSize: "0.8125rem", fontWeight: "600", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>
                  Demo Project Accounts (One-Click Test)
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {demoCustomers.map((d) => (
                    <button
                      key={d.phone}
                      type="button"
                      onClick={() => handleQuickFill(d)}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.6rem 0.85rem",
                        borderRadius: "0.5rem",
                        background: phone === d.phone ? "var(--color-primary-light, #e0f2fe)" : "var(--color-bg)",
                        border: `1px solid ${phone === d.phone ? "var(--color-primary)" : "var(--color-border)"}`,
                        cursor: "pointer",
                        textAlign: "left"
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: "600", fontSize: "0.875rem" }}>{d.name}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                          Ref: {d.reference} | {d.capacityKw} kW | Phone: {d.phone}
                        </div>
                      </div>
                      <span style={{ fontSize: "0.75rem", color: "var(--color-primary)", fontWeight: "600" }}>
                        Fill
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Sign In Card */}
          <div style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: "1rem", padding: "2rem", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)" }}>
            
            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--color-border)", marginBottom: "1.75rem", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={() => { setTab("reference"); setError(""); }}
                style={{
                  padding: "0.6rem 0.75rem",
                  fontSize: "0.875rem",
                  fontWeight: tab === "reference" ? "600" : "500",
                  color: tab === "reference" ? "var(--color-primary)" : "var(--color-text-muted)",
                  borderBottom: tab === "reference" ? "2px solid var(--color-primary)" : "2px solid transparent",
                  background: "transparent",
                  borderTop: "none",
                  borderLeft: "none",
                  borderRight: "none",
                  cursor: "pointer"
                }}
              >
                Project Reference
              </button>
              <button
                type="button"
                onClick={() => { setTab("password"); setError(""); }}
                style={{
                  padding: "0.6rem 0.75rem",
                  fontSize: "0.875rem",
                  fontWeight: tab === "password" ? "600" : "500",
                  color: tab === "password" ? "var(--color-primary)" : "var(--color-text-muted)",
                  borderBottom: tab === "password" ? "2px solid var(--color-primary)" : "2px solid transparent",
                  background: "transparent",
                  borderTop: "none",
                  borderLeft: "none",
                  borderRight: "none",
                  cursor: "pointer"
                }}
              >
                Password Sign In
              </button>
              <button
                type="button"
                onClick={() => { setTab("register"); setError(""); }}
                style={{
                  padding: "0.6rem 0.75rem",
                  fontSize: "0.875rem",
                  fontWeight: tab === "register" ? "600" : "500",
                  color: tab === "register" ? "var(--color-primary)" : "var(--color-text-muted)",
                  borderBottom: tab === "register" ? "2px solid var(--color-primary)" : "2px solid transparent",
                  background: "transparent",
                  borderTop: "none",
                  borderLeft: "none",
                  borderRight: "none",
                  cursor: "pointer"
                }}
              >
                Register New
              </button>
            </div>

            {error && (
              <div style={{ padding: "0.85rem", borderRadius: "0.5rem", background: "var(--color-danger-light, #fee2e2)", color: "#b91c1c", fontSize: "0.875rem", marginBottom: "1.25rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              
              {tab === "register" && (
                <div>
                  <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", marginBottom: "0.35rem" }}>
                    Full Name
                  </label>
                  <div style={{ position: "relative" }}>
                    <User size={18} style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }} />
                    <input
                      type="text"
                      className="field-input"
                      placeholder="e.g. Aarav Sharma"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      style={{ paddingLeft: "2.5rem", width: "100%" }}
                    />
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", marginBottom: "0.35rem" }}>
                  Registered Mobile Number
                </label>
                <div style={{ position: "relative" }}>
                  <Phone size={18} style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }} />
                  <input
                    type="tel"
                    className="field-input"
                    placeholder="10-digit mobile number, e.g. 9876543210"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{ paddingLeft: "2.5rem", width: "100%" }}
                  />
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
                  Must match the number given during enquiry or site survey.
                </div>
              </div>

              {tab === "reference" && (
                <div>
                  <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", marginBottom: "0.35rem" }}>
                    Enquiry Reference Number
                  </label>
                  <div style={{ position: "relative" }}>
                    <FileText size={18} style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }} />
                    <input
                      type="text"
                      className="field-input"
                      placeholder="e.g. PX-000001"
                      required
                      value={reference}
                      onChange={(e) => setReference(e.target.value.toUpperCase())}
                      style={{ paddingLeft: "2.5rem", width: "100%" }}
                    />
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
                    Found on your intake receipt or SMS confirmation.
                  </div>
                </div>
              )}

              {tab === "register" && (
                <div>
                  <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", marginBottom: "0.35rem" }}>
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    className="field-input"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ width: "100%" }}
                  />
                </div>
              )}

              {(tab === "password" || tab === "register") && (
                <div>
                  <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", marginBottom: "0.35rem" }}>
                    Password
                  </label>
                  <div style={{ position: "relative" }}>
                    <Lock size={18} style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }} />
                    <input
                      type="password"
                      className="field-input"
                      placeholder={tab === "register" ? "At least 6 characters" : "Enter account password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{ paddingLeft: "2.5rem", width: "100%" }}
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: "100%", padding: "0.75rem", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}
              >
                <span>{loading ? "Verifying..." : tab === "register" ? "Create Customer Account" : "Access Customer Portal"}</span>
                <ArrowRight size={18} />
              </button>
            </form>

            <div style={{ marginTop: "1.5rem", paddingTop: "1.25rem", borderTop: "1px solid var(--color-border)", textAlign: "center", fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
              Need assistance with your solar application? Call our customer desk at{" "}
              <a href="tel:+912049108800" style={{ color: "var(--color-primary)", textDecoration: "underline" }}>
                +91 20 4910 8800
              </a>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
