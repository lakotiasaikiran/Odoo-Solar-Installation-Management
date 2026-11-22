"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User, Phone, LogOut, CheckCircle2, Clock, AlertCircle,
  FileText, Download, Printer, CreditCard, Shield, ChevronRight,
  Zap, ArrowRight, X, Building, Check, RefreshCw
} from "lucide-react";
import "../../globals.css";
import "../../components.css";
import "../../public.css";

const money = (n) => "INR " + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export default function CustomerPortalPage() {
  const router = useRouter();
  const [customer, setCustomer] = useState(null);
  const [projects, setProjects] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview"); // 'overview' | 'quotation' | 'invoices'

  // Modals
  const [selectedQuoteDoc, setSelectedQuoteDoc] = useState(null);
  const [selectedInvoiceDoc, setSelectedInvoiceDoc] = useState(null);
  const [paymentModalInvoice, setPaymentModalInvoice] = useState(null);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [actionNotice, setActionNotice] = useState("");

  useEffect(() => {
    const token = sessionStorage.getItem("photonix_customer_token");
    if (!token) {
      router.push("/customer/login");
      return;
    }
    loadData(token);
  }, [router]);

  async function loadData(token) {
    setLoading(true);
    setError("");
    try {
      const authHeader = { Authorization: "Bearer " + token };

      // Load profile
      const profRes = await fetch("/api/customer/me", { headers: authHeader });
      if (!profRes.ok) {
        if (profRes.status === 401) {
          sessionStorage.removeItem("photonix_customer_token");
          router.push("/customer/login");
          return;
        }
        throw new Error("Could not load customer profile");
      }
      const profData = await profRes.json();
      setCustomer(profData);

      // Load customer projects & invoices
      const projRes = await fetch("/api/customer/projects", { headers: authHeader });
      if (!projRes.ok) throw new Error("Could not load customer projects");
      const projData = await projRes.json();
      setProjects(projData.projects || []);
      setJobs(projData.jobs || []);
      setInvoices(projData.invoices || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    sessionStorage.removeItem("photonix_customer_token");
    sessionStorage.removeItem("photonix_customer_profile");
    router.push("/customer/login");
  }

  // Generate Advance Tax Invoice (Customer Scoped)
  async function handleCreateInvoice(ref) {
    const token = sessionStorage.getItem("photonix_customer_token");
    if (!token) return;
    setCreatingInvoice(true);
    setActionNotice("");
    try {
      const res = await fetch("/api/customer/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ reference: ref, milestone: "advance_20" }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invoice generation rejected");
      }

      setActionNotice(`Tax Invoice ${data.invoice.invoice_number} created successfully.`);
      await loadData(token);
      setActiveTab("invoices");
    } catch (err) {
      setError(err.message);
    } finally {
      setCreatingInvoice(false);
    }
  }

  // Open Quotation Document
  async function handleViewQuotation(ref) {
    const token = sessionStorage.getItem("photonix_customer_token");
    if (!token) return;
    try {
      const res = await fetch(`/api/customer/quotes/${encodeURIComponent(ref)}`, {
        headers: { Authorization: "Bearer " + token },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not retrieve quotation document");
      setSelectedQuoteDoc(data);
    } catch (err) {
      alert(err.message);
    }
  }

  // Pay Invoice Simulation
  async function handleConfirmPayment(invoiceId, method = "upi") {
    const token = sessionStorage.getItem("photonix_customer_token");
    if (!token) return;
    setPaymentBusy(true);
    try {
      const res = await fetch(`/api/customer/invoices/${invoiceId}/pay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          method,
          reference: "UPI/" + Date.now().toString().slice(-8),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Payment recording failed");
      
      setPaymentModalInvoice(null);
      setActionNotice("Payment confirmed. Milestone 1 booking is marked as paid.");
      await loadData(token);
    } catch (err) {
      alert(err.message);
    } finally {
      setPaymentBusy(false);
    }
  }

  const primaryLead = projects[0] || null;
  const quoteCleared = primaryLead && ["sent", "accepted"].includes(primaryLead.quoteStatus);

  if (loading) {
    return (
      <div className="pub-section" style={{ minHeight: "80vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <RefreshCw size={28} className="animate-spin" style={{ margin: "0 auto 1rem auto", color: "var(--color-primary)" }} />
          <div style={{ fontSize: "1rem", color: "var(--color-text-muted)" }}>Loading your solar project records...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "90vh", background: "var(--color-bg)", paddingBottom: "4rem" }}>
      
      {/* Header Profile Bar */}
      <div style={{ background: "var(--color-bg-secondary)", borderBottom: "1px solid var(--color-border)", padding: "1.5rem 0" }}>
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.8125rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-primary)", fontWeight: "600" }}>
                Customer Portal
              </span>
              <span style={{ padding: "0.15rem 0.5rem", borderRadius: "9999px", background: "var(--color-primary-light, #e0f2fe)", color: "var(--color-primary)", fontSize: "0.75rem", fontWeight: "600" }}>
                Verified Account
              </span>
            </div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: "700", margin: "0.25rem 0 0.1rem 0" }}>
              Welcome, {customer?.name || "Customer"}
            </h1>
            <div style={{ display: "flex", gap: "1.25rem", fontSize: "0.875rem", color: "var(--color-text-muted)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Phone size={14} /> +91 {customer?.phone}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Shield size={14} /> Scoped Customer Session
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <button
              onClick={() => loadData(sessionStorage.getItem("photonix_customer_token"))}
              className="btn btn-secondary btn-sm"
              style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
            >
              <RefreshCw size={14} />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleLogout}
              className="btn btn-secondary btn-sm"
              style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#dc2626" }}
            >
              <LogOut size={14} />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="container" style={{ marginTop: "1.5rem" }}>
        
        {actionNotice && (
          <div style={{ padding: "0.85rem 1.25rem", borderRadius: "0.5rem", background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <CheckCircle2 size={18} />
              <span>{actionNotice}</span>
            </div>
            <button onClick={() => setActionNotice("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#166534" }}>
              <X size={16} />
            </button>
          </div>
        )}

        {error && (
          <div style={{ padding: "0.85rem 1.25rem", borderRadius: "0.5rem", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", marginBottom: "1.5rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid var(--color-border)", marginBottom: "2rem" }}>
          <button
            onClick={() => setActiveTab("overview")}
            style={{
              padding: "0.75rem 1.25rem",
              fontSize: "0.9375rem",
              fontWeight: activeTab === "overview" ? "600" : "500",
              color: activeTab === "overview" ? "var(--color-primary)" : "var(--color-text-muted)",
              borderBottom: activeTab === "overview" ? "2px solid var(--color-primary)" : "2px solid transparent",
              background: "transparent",
              borderTop: "none",
              borderLeft: "none",
              borderRight: "none",
              cursor: "pointer"
            }}
          >
            Project Status ({projects.length})
          </button>
          <button
            onClick={() => setActiveTab("quotation")}
            style={{
              padding: "0.75rem 1.25rem",
              fontSize: "0.9375rem",
              fontWeight: activeTab === "quotation" ? "600" : "500",
              color: activeTab === "quotation" ? "var(--color-primary)" : "var(--color-text-muted)",
              borderBottom: activeTab === "quotation" ? "2px solid var(--color-primary)" : "2px solid transparent",
              background: "transparent",
              borderTop: "none",
              borderLeft: "none",
              borderRight: "none",
              cursor: "pointer"
            }}
          >
            Quotation & System Specs
          </button>
          <button
            onClick={() => setActiveTab("invoices")}
            style={{
              padding: "0.75rem 1.25rem",
              fontSize: "0.9375rem",
              fontWeight: activeTab === "invoices" ? "600" : "500",
              color: activeTab === "invoices" ? "var(--color-primary)" : "var(--color-text-muted)",
              borderBottom: activeTab === "invoices" ? "2px solid var(--color-primary)" : "2px solid transparent",
              background: "transparent",
              borderTop: "none",
              borderLeft: "none",
              borderRight: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem"
            }}
          >
            <span>My Invoices</span>
            {invoices.length > 0 && (
              <span style={{ padding: "0.1rem 0.45rem", borderRadius: "9999px", background: "var(--color-primary-light, #e0f2fe)", color: "var(--color-primary)", fontSize: "0.75rem", fontWeight: "700" }}>
                {invoices.length}
              </span>
            )}
          </button>
        </div>

        {/* ─── TAB 1: OVERVIEW & MILESTONES ───────────────────────────────── */}
        {activeTab === "overview" && (
          <div>
            {projects.length === 0 ? (
              <div style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: "0.75rem", padding: "3rem", textAlign: "center" }}>
                <FileText size={40} style={{ margin: "0 auto 1rem auto", color: "var(--color-text-muted)" }} />
                <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "0.5rem" }}>No Solar Projects Found</h3>
                <p style={{ color: "var(--color-text-muted)", maxWidth: "500px", margin: "0 auto 1.5rem auto" }}>
                  There is currently no enquiry or installation record associated with mobile number +91 {customer?.phone}.
                </p>
                <Link href="/enquiry" className="btn btn-primary">
                  Submit Rooftop Solar Enquiry
                </Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                {projects.map((p) => {
                  const qual = p.qualificationState;
                  const surv = p.surveyStatus;
                  const qStatus = p.quoteStatus;
                  const isAccepted = qStatus === "accepted";

                  return (
                    <div key={p.reference} style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: "1rem", padding: "1.75rem", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                      
                      {/* Project Header */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem", paddingBottom: "1.25rem", borderBottom: "1px solid var(--color-border)" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                            <span style={{ fontSize: "1.25rem", fontWeight: "700" }}>Project Reference: {p.reference}</span>
                            <span style={{ padding: "0.2rem 0.6rem", borderRadius: "0.35rem", fontSize: "0.75rem", fontWeight: "600", textTransform: "uppercase", background: qStatus === "sent" || qStatus === "accepted" ? "#dcfce7" : "#fef3c7", color: qStatus === "sent" || qStatus === "accepted" ? "#166534" : "#92400e" }}>
                              {qStatus === "accepted" ? "Quote Accepted & Invoiced" : qStatus === "sent" ? "Quotation Approved" : surv === "approved" ? "Survey Verified" : "In Progress"}
                            </span>
                          </div>
                          <div style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", marginTop: "0.35rem" }}>
                            {p.address} | Property: {p.propertyType} | Sanctioned System: {p.preliminaryCapacityKw || 3.0} kW
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          {["sent", "accepted"].includes(qStatus) && (
                            <button
                              onClick={() => handleViewQuotation(p.reference)}
                              className="btn btn-secondary btn-sm"
                              style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
                            >
                              <FileText size={16} />
                              <span>View & Download Quotation</span>
                            </button>
                          )}
                          {["sent", "accepted"].includes(qStatus) && invoices.length === 0 && (
                            <button
                              onClick={() => handleCreateInvoice(p.reference)}
                              disabled={creatingInvoice}
                              className="btn btn-primary btn-sm"
                              style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
                            >
                              <CreditCard size={16} />
                              <span>{creatingInvoice ? "Generating..." : "Generate 20% Advance Invoice"}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Milestone Progression Bar */}
                      <div>
                        <div style={{ fontSize: "0.875rem", fontWeight: "600", marginBottom: "1rem", textTransform: "uppercase", letterSpacing: "0.03em", color: "var(--color-text-muted)" }}>
                          Installation Engineering Progression
                        </div>
                        
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
                          
                          {/* Step 1: Intake */}
                          <div style={{ padding: "1rem", borderRadius: "0.5rem", background: "var(--color-bg-secondary)", border: "1px solid #bbf7d0" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#166534", fontWeight: "600", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
                              <CheckCircle2 size={16} />
                              <span>1. Enquiry Intake</span>
                            </div>
                            <div style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
                              Channel: {(p.sourceChannel || "web").toUpperCase()}
                            </div>
                          </div>

                          {/* Step 2: Qualification */}
                          <div style={{ padding: "1rem", borderRadius: "0.5rem", background: "var(--color-bg-secondary)", border: qual === "qualified" ? "1px solid #bbf7d0" : "1px solid var(--color-border)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: qual === "qualified" ? "#166534" : "var(--color-text)", fontWeight: "600", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
                              {qual === "qualified" ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                              <span>2. Sales Call</span>
                            </div>
                            <div style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
                              {qual === "qualified" ? `Qualified for ${p.preliminaryCapacityKw || 3} kW` : "Pending qualification"}
                            </div>
                          </div>

                          {/* Step 3: Site Survey */}
                          <div style={{ padding: "1rem", borderRadius: "0.5rem", background: "var(--color-bg-secondary)", border: surv === "approved" || surv === "submitted" ? "1px solid #bbf7d0" : "1px solid var(--color-border)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: surv === "approved" || surv === "submitted" ? "#166534" : "var(--color-text)", fontWeight: "600", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
                              {surv === "approved" ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                              <span>3. Rooftop Survey</span>
                            </div>
                            <div style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
                              {surv === "approved" ? "Physical survey verified" : surv === "submitted" ? "Measurements submitted" : "Awaiting site visit"}
                            </div>
                          </div>

                          {/* Step 4: Technical Review */}
                          <div style={{ padding: "1rem", borderRadius: "0.5rem", background: "var(--color-bg-secondary)", border: surv === "approved" ? "1px solid #bbf7d0" : "1px solid var(--color-border)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: surv === "approved" ? "#166534" : "var(--color-text)", fontWeight: "600", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
                              {surv === "approved" ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                              <span>4. Engineering Check</span>
                            </div>
                            <div style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
                              {surv === "approved" ? "Survey cleared by engineer" : "Awaiting approval"}
                            </div>
                          </div>

                          {/* Step 5: Quotation */}
                          <div style={{ padding: "1rem", borderRadius: "0.5rem", background: "var(--color-bg-secondary)", border: ["sent", "accepted"].includes(qStatus) ? "1px solid #bbf7d0" : "1px solid var(--color-border)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: ["sent", "accepted"].includes(qStatus) ? "#166534" : "var(--color-text)", fontWeight: "600", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
                              {["sent", "accepted"].includes(qStatus) ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                              <span>5. Formal Quote</span>
                            </div>
                            <div style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
                              {["sent", "accepted"].includes(qStatus) ? `${money(p.quoteAmount)} net` : "Locked pending survey"}
                            </div>
                          </div>

                          {/* Step 6: Invoicing & Booking */}
                          <div style={{ padding: "1rem", borderRadius: "0.5rem", background: "var(--color-bg-secondary)", border: invoices.length > 0 ? "1px solid #bbf7d0" : "1px solid var(--color-border)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: invoices.length > 0 ? "#166534" : "var(--color-text)", fontWeight: "600", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
                              {invoices.length > 0 ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                              <span>6. Advance Invoice</span>
                            </div>
                            <div style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
                              {invoices.length > 0 ? `${invoices[0].invoice_number} issued` : "Ready to create"}
                            </div>
                          </div>

                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: QUOTATION & SYSTEM SPECS ────────────────────────────── */}
        {activeTab === "quotation" && (
          <div>
            {!quoteCleared ? (
              <div style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: "0.75rem", padding: "3rem", textAlign: "center" }}>
                <Clock size={40} style={{ margin: "0 auto 1rem auto", color: "var(--color-text-muted)" }} />
                <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "0.5rem" }}>Quotation In Progress</h3>
                <p style={{ color: "var(--color-text-muted)", maxWidth: "500px", margin: "0 auto" }}>
                  Your formal engineering quotation will be released as soon as the site surveyor submits shadow-analysis measurements and the lead engineer verifies roof suitability.
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "2rem" }}>
                
                {/* Left: Detailed Quotation Card */}
                <div style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: "1rem", padding: "2rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", borderBottom: "1px solid var(--color-border)", paddingBottom: "1.25rem" }}>
                    <div>
                      <div style={{ fontSize: "0.8125rem", color: "var(--color-primary)", fontWeight: "600", textTransform: "uppercase" }}>
                        Approved System Specification
                      </div>
                      <h2 style={{ fontSize: "1.5rem", fontWeight: "700" }}>
                        {primaryLead?.preliminaryCapacityKw || 3.0} kW On-Grid Rooftop Solar System
                      </h2>
                      <div style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
                        Reference: {primaryLead?.reference} | Client: {primaryLead?.customerName}
                      </div>
                    </div>

                    <button
                      onClick={() => handleViewQuotation(primaryLead.reference)}
                      className="btn btn-secondary"
                      style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
                    >
                      <Download size={16} />
                      <span>Download Official Quotation</span>
                    </button>
                  </div>

                  {/* Sizing & Components Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
                    
                    <div style={{ padding: "1.25rem", borderRadius: "0.75rem", background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)" }}>
                      <div style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginBottom: "0.35rem" }}>Solar PV Modules</div>
                      <div style={{ fontWeight: "600", fontSize: "1.05rem" }}>Tier-1 TopCon Bi-facial 550Wp</div>
                      <div style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
                        Count: {primaryLead?.quoteDetails?.panelCount || Math.ceil(((primaryLead?.preliminaryCapacityKw || 3) * 1000) / 550)} Modules | 25-Year Performance Guarantee
                      </div>
                    </div>

                    <div style={{ padding: "1.25rem", borderRadius: "0.75rem", background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)" }}>
                      <div style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginBottom: "0.35rem" }}>Grid-Tie Inverter</div>
                      <div style={{ fontWeight: "600", fontSize: "1.05rem" }}>{primaryLead?.preliminaryCapacityKw || 3.0} kW Smart MPPT Inverter</div>
                      <div style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
                        IP65 Outdoor Rated | 10-Year Full Replacement Warranty
                      </div>
                    </div>

                    <div style={{ padding: "1.25rem", borderRadius: "0.75rem", background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)" }}>
                      <div style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginBottom: "0.35rem" }}>Mounting Structure</div>
                      <div style={{ fontWeight: "600", fontSize: "1.05rem" }}>HDGI Pre-Galvanized Dual-Post</div>
                      <div style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
                        Corrosion resistant, engineered for 150 km/h wind loads.
                      </div>
                    </div>

                    <div style={{ padding: "1.25rem", borderRadius: "0.75rem", background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)" }}>
                      <div style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginBottom: "0.35rem" }}>DISCOM Interconnection</div>
                      <div style={{ fontWeight: "600", fontSize: "1.05rem" }}>Net-Metering Liaison & Approvals</div>
                      <div style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
                        End-to-end documentation with state DISCOM included.
                      </div>
                    </div>

                  </div>

                  {/* Warranties & Coverage */}
                  <h4 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "0.75rem" }}>
                    Warranty & Workmanship Guarantees
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.875rem" }}>
                      <CheckCircle2 size={16} style={{ color: "#166534" }} />
                      <span><strong>25-Year Linear Performance Warranty:</strong> Guaranteed minimum 84.8% power output at Year 25.</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.875rem" }}>
                      <CheckCircle2 size={16} style={{ color: "#166534" }} />
                      <span><strong>10-Year Inverter Warranty:</strong> Comprehensive manufacturer replacement.</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.875rem" }}>
                      <CheckCircle2 size={16} style={{ color: "#166534" }} />
                      <span><strong>5-Year Installation Workmanship:</strong> Rooftop weatherproofing and electrical integrity.</span>
                    </div>
                  </div>

                </div>

                {/* Right: Commercial Summary Card & Invoice Trigger */}
                <div style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: "1rem", padding: "1.75rem", height: "fit-content" }}>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "1.25rem" }}>Commercial Summary</h3>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginBottom: "1.5rem", borderBottom: "1px solid var(--color-border)", paddingBottom: "1.25rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9375rem" }}>
                      <span style={{ color: "var(--color-text-muted)" }}>Gross Installation Price:</span>
                      <span style={{ fontWeight: "600" }}>{money(primaryLead?.quoteDetails?.grossPrice || (primaryLead?.preliminaryCapacityKw * 60000))}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9375rem", color: "#166534" }}>
                      <span>PM Surya Ghar Central Subsidy:</span>
                      <span style={{ fontWeight: "700" }}>-{money(primaryLead?.quoteDetails?.estimatedSubsidy || 78000)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.1rem", fontWeight: "700", paddingTop: "0.5rem", borderTop: "1px dashed var(--color-border)" }}>
                      <span>Net Customer Investment:</span>
                      <span style={{ color: "var(--color-primary)" }}>{money(primaryLead?.quoteAmount)}</span>
                    </div>
                  </div>

                  <div style={{ marginBottom: "1.5rem" }}>
                    <div style={{ fontSize: "0.8125rem", fontWeight: "600", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: "0.5rem" }}>
                      Milestone Schedule
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.8125rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>20% Advance Booking:</span>
                        <strong>{money(Math.round((primaryLead?.quoteAmount || 102000) * 0.20))}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "var(--color-text-muted)" }}>
                        <span>70% On Material Dispatch:</span>
                        <span>{money(Math.round((primaryLead?.quoteAmount || 102000) * 0.70))}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "var(--color-text-muted)" }}>
                        <span>10% Post Net-Metering:</span>
                        <span>{money(Math.round((primaryLead?.quoteAmount || 102000) * 0.10))}</span>
                      </div>
                    </div>
                  </div>

                  {/* Create Invoice Action */}
                  {invoices.length === 0 ? (
                    <button
                      onClick={() => handleCreateInvoice(primaryLead.reference)}
                      disabled={creatingInvoice}
                      className="btn btn-primary"
                      style={{ width: "100%", padding: "0.85rem", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem" }}
                    >
                      <CreditCard size={18} />
                      <span>{creatingInvoice ? "Creating Tax Invoice..." : `Create 20% Advance Invoice (${money(Math.round((primaryLead?.quoteAmount || 102000) * 0.20))})`}</span>
                    </button>
                  ) : (
                    <div style={{ padding: "0.85rem", borderRadius: "0.5rem", background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", fontSize: "0.875rem", textAlign: "center" }}>
                      <CheckCircle2 size={18} style={{ margin: "0 auto 0.25rem auto" }} />
                      <div>Advance Tax Invoice Issued</div>
                      <button
                        onClick={() => setActiveTab("invoices")}
                        style={{ marginTop: "0.5rem", background: "none", border: "none", color: "var(--color-primary)", fontWeight: "600", cursor: "pointer", textDecoration: "underline", fontSize: "0.8125rem" }}
                      >
                        View in Invoices Tab
                      </button>
                    </div>
                  )}

                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "1rem", textAlign: "center" }}>
                    Invoices are strictly scoped to your project and legally compliant with Indian GST laws.
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* ─── TAB 3: INVOICES & PAYMENTS ─────────────────────────────────── */}
        {activeTab === "invoices" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "700" }}>Customer Tax Invoices</h3>
                <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
                  All invoices generated strictly for customer {customer?.name} (+91 {customer?.phone}).
                </p>
              </div>

              {primaryLead && quoteCleared && (
                <button
                  onClick={() => handleCreateInvoice(primaryLead.reference)}
                  disabled={creatingInvoice}
                  className="btn btn-primary btn-sm"
                  style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
                >
                  <CreditCard size={16} />
                  <span>{creatingInvoice ? "Processing..." : "Generate Advance Invoice"}</span>
                </button>
              )}
            </div>

            {invoices.length === 0 ? (
              <div style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: "0.75rem", padding: "3rem", textAlign: "center" }}>
                <CreditCard size={40} style={{ margin: "0 auto 1rem auto", color: "var(--color-text-muted)" }} />
                <h4 style={{ fontSize: "1.15rem", fontWeight: "600", marginBottom: "0.5rem" }}>No Invoices Generated Yet</h4>
                <p style={{ color: "var(--color-text-muted)", maxWidth: "450px", margin: "0 auto 1.5rem auto", fontSize: "0.875rem" }}>
                  Once your formal quotation is approved, you can create the 20% milestone advance booking tax invoice here.
                </p>
                {primaryLead && quoteCleared && (
                  <button
                    onClick={() => handleCreateInvoice(primaryLead.reference)}
                    disabled={creatingInvoice}
                    className="btn btn-primary"
                  >
                    Create 20% Advance Booking Invoice
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {invoices.map((inv) => (
                  <div
                    key={inv.id}
                    style={{
                      background: "var(--color-bg)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "0.75rem",
                      padding: "1.5rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "1rem"
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <span style={{ fontWeight: "700", fontSize: "1.1rem" }}>{inv.invoice_number}</span>
                        <span
                          style={{
                            padding: "0.15rem 0.5rem",
                            borderRadius: "0.25rem",
                            fontSize: "0.75rem",
                            fontWeight: "600",
                            textTransform: "uppercase",
                            background: inv.status === "paid" ? "#dcfce7" : "#fee2e2",
                            color: inv.status === "paid" ? "#166534" : "#b91c1c"
                          }}
                        >
                          {inv.status === "paid" ? "Paid" : "Payment Due"}
                        </span>
                      </div>
                      
                      <div style={{ fontSize: "0.875rem", color: "var(--color-text)", marginTop: "0.35rem" }}>
                        {inv.milestone_label} — {inv.system_capacity_kw} kW System
                      </div>
                      
                      <div style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
                        Ref: {inv.enquiry_reference} | Date: {new Date(inv.created_at).toLocaleDateString("en-IN")} | Taxable: {money(inv.invoice_taxable_amount)} + GST (13.8%): {money(inv.tax_amount)}
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>Total Payable</div>
                        <div style={{ fontSize: "1.35rem", fontWeight: "700", color: "var(--color-primary)" }}>
                          {money(inv.total_invoice_amount)}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          onClick={() => setSelectedInvoiceDoc(inv)}
                          className="btn btn-secondary btn-sm"
                          style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
                        >
                          <Printer size={15} />
                          <span>View & Print Tax Invoice</span>
                        </button>

                        {inv.status !== "paid" && (
                          <button
                            onClick={() => setPaymentModalInvoice(inv)}
                            className="btn btn-primary btn-sm"
                            style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
                          >
                            <CreditCard size={15} />
                            <span>Pay Milestone</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ─── MODAL 1: FORMAL QUOTATION DOCUMENT ─────────────────────────── */}
      {selectedQuoteDoc && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "center", padding: "1.5rem" }}>
          <div style={{ background: "white", color: "#111827", borderRadius: "1rem", maxWidth: "850px", width: "100%", maxHeight: "90vh", overflowY: "auto", padding: "2.5rem", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
            
            {/* Modal Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e5e7eb", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "0.875rem", fontWeight: "600", color: "#4b5563" }}>
                Official Rooftop Solar Installation Quotation
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={() => window.print()}
                  className="btn btn-primary btn-sm"
                  style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
                >
                  <Printer size={15} />
                  <span>Print Document</span>
                </button>
                <button
                  onClick={() => setSelectedQuoteDoc(null)}
                  className="btn btn-secondary btn-sm"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Document Letterhead */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
              <div>
                <h2 style={{ fontSize: "1.5rem", fontWeight: "800", color: "#0284c7", margin: 0 }}>PHOTONIX SOLAR ENERGY SOLUTIONS</h2>
                <div style={{ fontSize: "0.8125rem", color: "#4b5563", marginTop: "0.25rem" }}>
                  CIN: {selectedQuoteDoc.company.cin} | GSTIN: {selectedQuoteDoc.company.gstin}
                </div>
                <div style={{ fontSize: "0.8125rem", color: "#4b5563" }}>
                  {selectedQuoteDoc.company.registeredOffice}
                </div>
                <div style={{ fontSize: "0.8125rem", color: "#4b5563" }}>
                  Contact: {selectedQuoteDoc.company.contactPhone} | {selectedQuoteDoc.company.contactEmail}
                </div>
              </div>

              <div style={{ textAlign: "right", background: "#f3f4f6", padding: "0.75rem 1rem", borderRadius: "0.5rem" }}>
                <div style={{ fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase" }}>Quotation Ref</div>
                <div style={{ fontSize: "1.2rem", fontWeight: "800" }}>{selectedQuoteDoc.reference}</div>
                <div style={{ fontSize: "0.8125rem", color: "#4b5563", marginTop: "0.2rem" }}>
                  Date: {new Date(selectedQuoteDoc.date).toLocaleDateString("en-IN")}
                </div>
              </div>
            </div>

            {/* Customer Details */}
            <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "0.5rem", padding: "1rem", marginBottom: "1.75rem" }}>
              <div style={{ fontSize: "0.8125rem", fontWeight: "700", textTransform: "uppercase", color: "#6b7280", marginBottom: "0.5rem" }}>
                Issued To (Client Information)
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", fontSize: "0.875rem" }}>
                <div><strong>Client Name:</strong> {selectedQuoteDoc.customer.name}</div>
                <div><strong>Mobile Phone:</strong> +91 {selectedQuoteDoc.customer.phone}</div>
                <div style={{ gridColumn: "span 2" }}><strong>Site Address:</strong> {selectedQuoteDoc.customer.address}</div>
              </div>
            </div>

            {/* Bill of Quantities & Technical Specs */}
            <div style={{ marginBottom: "1.75rem" }}>
              <div style={{ fontSize: "0.9375rem", fontWeight: "700", borderBottom: "2px solid #e5e7eb", paddingBottom: "0.5rem", marginBottom: "0.75rem" }}>
                1. Technical Sizing & Bill of Materials ({selectedQuoteDoc.system.capacityKw} kW System)
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ background: "#f3f4f6", textAlign: "left" }}>
                    <th style={{ padding: "0.6rem", border: "1px solid #e5e7eb" }}>Item Description</th>
                    <th style={{ padding: "0.6rem", border: "1px solid #e5e7eb", width: "120px" }}>Qty / Rating</th>
                    <th style={{ padding: "0.6rem", border: "1px solid #e5e7eb", width: "140px" }}>Warranty</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: "0.6rem", border: "1px solid #e5e7eb" }}>{selectedQuoteDoc.system.panelModel}</td>
                    <td style={{ padding: "0.6rem", border: "1px solid #e5e7eb" }}>{selectedQuoteDoc.system.panelCount} Nos.</td>
                    <td style={{ padding: "0.6rem", border: "1px solid #e5e7eb" }}>25 Years (Linear)</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "0.6rem", border: "1px solid #e5e7eb" }}>{selectedQuoteDoc.system.inverterModel}</td>
                    <td style={{ padding: "0.6rem", border: "1px solid #e5e7eb" }}>1 Unit</td>
                    <td style={{ padding: "0.6rem", border: "1px solid #e5e7eb" }}>10 Years Full</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "0.6rem", border: "1px solid #e5e7eb" }}>{selectedQuoteDoc.system.mountingStructure}</td>
                    <td style={{ padding: "0.6rem", border: "1px solid #e5e7eb" }}>Complete Set</td>
                    <td style={{ padding: "0.6rem", border: "1px solid #e5e7eb" }}>10 Years</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "0.6rem", border: "1px solid #e5e7eb" }}>{selectedQuoteDoc.system.cablesAndBos}</td>
                    <td style={{ padding: "0.6rem", border: "1px solid #e5e7eb" }}>Site Specific</td>
                    <td style={{ padding: "0.6rem", border: "1px solid #e5e7eb" }}>5 Years</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "0.6rem", border: "1px solid #e5e7eb" }}>{selectedQuoteDoc.system.netMeteringInterconnection}</td>
                    <td style={{ padding: "0.6rem", border: "1px solid #e5e7eb" }}>1 Connection</td>
                    <td style={{ padding: "0.6rem", border: "1px solid #e5e7eb" }}>DISCOM Std.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Financial Breakdown Table */}
            <div style={{ marginBottom: "1.75rem" }}>
              <div style={{ fontSize: "0.9375rem", fontWeight: "700", borderBottom: "2px solid #e5e7eb", paddingBottom: "0.5rem", marginBottom: "0.75rem" }}>
                2. Commercial & Central Subsidy Summary
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "0.6rem", border: "1px solid #e5e7eb" }}>Gross Turnkey Installation Cost</td>
                    <td style={{ padding: "0.6rem", border: "1px solid #e5e7eb", textAlign: "right", fontWeight: "600" }}>
                      {money(selectedQuoteDoc.commercials.grossContractAmount)}
                    </td>
                  </tr>
                  <tr style={{ color: "#166534" }}>
                    <td style={{ padding: "0.6rem", border: "1px solid #e5e7eb" }}>PM Surya Ghar Muft Bijli Yojana Central Subsidy</td>
                    <td style={{ padding: "0.6rem", border: "1px solid #e5e7eb", textAlign: "right", fontWeight: "700" }}>
                      -{money(selectedQuoteDoc.commercials.centralSubsidyPmSuryaGhar)}
                    </td>
                  </tr>
                  <tr style={{ background: "#f3f4f6", fontSize: "1rem", fontWeight: "800" }}>
                    <td style={{ padding: "0.75rem", border: "1px solid #e5e7eb" }}>Net Effective Customer Investment</td>
                    <td style={{ padding: "0.75rem", border: "1px solid #e5e7eb", textAlign: "right", color: "#0284c7" }}>
                      {money(selectedQuoteDoc.commercials.netCustomerInvestment)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Terms and Signature */}
            <div style={{ fontSize: "0.8125rem", color: "#6b7280", marginBottom: "2rem" }}>
              <strong>Terms:</strong> {selectedQuoteDoc.termsAndConditions[0]}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingTop: "1.5rem", borderTop: "1px solid #e5e7eb" }}>
              <div>
                <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Authorized Signatory</div>
                <div style={{ fontWeight: "700", fontSize: "0.9375rem" }}>Photonix Technical Operations</div>
                <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Document Verifiable under Hash ID: {selectedQuoteDoc.reference}-SIGNED</div>
              </div>
              <button onClick={() => setSelectedQuoteDoc(null)} className="btn btn-secondary btn-sm">
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ─── MODAL 2: OFFICIAL TAX INVOICE DOCUMENT ─────────────────────── */}
      {selectedInvoiceDoc && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "center", padding: "1.5rem" }}>
          <div style={{ background: "white", color: "#111827", borderRadius: "1rem", maxWidth: "800px", width: "100%", maxHeight: "90vh", overflowY: "auto", padding: "2.5rem", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
            
            {/* Modal Controls */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e5e7eb", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "0.875rem", fontWeight: "700", color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Tax Invoice (Under Section 31 of CGST Act, 2017)
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={() => window.print()}
                  className="btn btn-primary btn-sm"
                  style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
                >
                  <Printer size={15} />
                  <span>Print Invoice</span>
                </button>
                <button
                  onClick={() => setSelectedInvoiceDoc(null)}
                  className="btn btn-secondary btn-sm"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Header Details */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.75rem" }}>
              <div>
                <h3 style={{ fontSize: "1.35rem", fontWeight: "800", color: "#0284c7", margin: 0 }}>PHOTONIX SOLAR ENERGY SOLUTIONS</h3>
                <div style={{ fontSize: "0.8125rem", color: "#4b5563", marginTop: "0.2rem" }}>
                  CIN: U40106MH2026PTC392811 | GSTIN: 27AABCP8921M1Z4
                </div>
                <div style={{ fontSize: "0.8125rem", color: "#4b5563" }}>
                  Plot 48, Photonix Tech Park, Baner-Pashan Link Road, Pune 411045
                </div>
                <div style={{ fontSize: "0.8125rem", color: "#4b5563" }}>
                  State Code: 27 (Maharashtra)
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "1.2rem", fontWeight: "800" }}>{selectedInvoiceDoc.invoice_number}</div>
                <div style={{ fontSize: "0.8125rem", color: "#4b5563", marginTop: "0.2rem" }}>
                  Invoice Date: {new Date(selectedInvoiceDoc.created_at).toLocaleDateString("en-IN")}
                </div>
                <div style={{ fontSize: "0.8125rem", color: "#4b5563" }}>
                  Due Date: {new Date(selectedInvoiceDoc.due_date).toLocaleDateString("en-IN")}
                </div>
                <span
                  style={{
                    display: "inline-block",
                    marginTop: "0.4rem",
                    padding: "0.2rem 0.6rem",
                    borderRadius: "0.25rem",
                    fontSize: "0.75rem",
                    fontWeight: "700",
                    textTransform: "uppercase",
                    background: selectedInvoiceDoc.status === "paid" ? "#dcfce7" : "#fee2e2",
                    color: selectedInvoiceDoc.status === "paid" ? "#166534" : "#b91c1c"
                  }}
                >
                  {selectedInvoiceDoc.status === "paid" ? "PAID" : "PAYMENT DUE"}
                </span>
              </div>
            </div>

            {/* Buyer Details */}
            <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "0.5rem", padding: "1rem", marginBottom: "1.75rem" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", color: "#6b7280", marginBottom: "0.4rem" }}>
                Billed To (Customer)
              </div>
              <div style={{ fontSize: "0.875rem" }}>
                <div><strong>{selectedInvoiceDoc.customer_name}</strong></div>
                <div style={{ color: "#4b5563" }}>Mobile: +91 {selectedInvoiceDoc.customer_phone}</div>
                <div style={{ color: "#4b5563" }}>Site: {selectedInvoiceDoc.customer_address}</div>
                <div style={{ color: "#4b5563" }}>Project Reference: {selectedInvoiceDoc.enquiry_reference}</div>
              </div>
            </div>

            {/* Line Items Table */}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", marginBottom: "1.75rem" }}>
              <thead>
                <tr style={{ background: "#f3f4f6", textAlign: "left" }}>
                  <th style={{ padding: "0.6rem", border: "1px solid #e5e7eb" }}>Description of Goods / Services</th>
                  <th style={{ padding: "0.6rem", border: "1px solid #e5e7eb", width: "100px" }}>HSN/SAC</th>
                  <th style={{ padding: "0.6rem", border: "1px solid #e5e7eb", width: "120px", textAlign: "right" }}>Taxable Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: "0.75rem", border: "1px solid #e5e7eb" }}>
                    <strong>{selectedInvoiceDoc.milestone_label}</strong>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.2rem" }}>
                      Installation & commissioning of {selectedInvoiceDoc.system_capacity_kw} kW Rooftop Solar PV System.
                    </div>
                  </td>
                  <td style={{ padding: "0.75rem", border: "1px solid #e5e7eb" }}>8461 / 9954</td>
                  <td style={{ padding: "0.75rem", border: "1px solid #e5e7eb", textAlign: "right" }}>
                    {money(selectedInvoiceDoc.invoice_taxable_amount)}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="2" style={{ padding: "0.6rem", border: "1px solid #e5e7eb", textAlign: "right", fontWeight: "600" }}>
                    CGST (6.90%):
                  </td>
                  <td style={{ padding: "0.6rem", border: "1px solid #e5e7eb", textAlign: "right" }}>
                    {money(Number(selectedInvoiceDoc.tax_amount) / 2)}
                  </td>
                </tr>
                <tr>
                  <td colSpan="2" style={{ padding: "0.6rem", border: "1px solid #e5e7eb", textAlign: "right", fontWeight: "600" }}>
                    SGST (6.90%):
                  </td>
                  <td style={{ padding: "0.6rem", border: "1px solid #e5e7eb", textAlign: "right" }}>
                    {money(Number(selectedInvoiceDoc.tax_amount) / 2)}
                  </td>
                </tr>
                <tr style={{ background: "#f3f4f6", fontSize: "1.05rem", fontWeight: "800" }}>
                  <td colSpan="2" style={{ padding: "0.75rem", border: "1px solid #e5e7eb", textAlign: "right" }}>
                    Total Invoice Value (INR):
                  </td>
                  <td style={{ padding: "0.75rem", border: "1px solid #e5e7eb", textAlign: "right", color: "#0284c7" }}>
                    {money(selectedInvoiceDoc.total_invoice_amount)}
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Bank Payment Instructions */}
            <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "0.5rem", padding: "1rem", marginBottom: "1.75rem" }}>
              <div style={{ fontSize: "0.8125rem", fontWeight: "700", textTransform: "uppercase", color: "#374151", marginBottom: "0.4rem" }}>
                Direct Bank Transfer & UPI Details
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.8125rem", color: "#4b5563" }}>
                <div><strong>Bank Name:</strong> State Bank of India</div>
                <div><strong>Account Name:</strong> Photonix Solar Energy Solutions Pvt Ltd</div>
                <div><strong>Account No:</strong> 41289012345</div>
                <div><strong>IFSC Code:</strong> SBIN0001234</div>
                <div style={{ gridColumn: "span 2" }}><strong>UPI VPA:</strong> photonix.solar@sbi</div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                System generated legal invoice. Strictly scoped to registered project owner.
              </div>
              <button onClick={() => setSelectedInvoiceDoc(null)} className="btn btn-secondary btn-sm">
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ─── MODAL 3: INSTANT PAYMENT SIMULATION ─────────────────────────── */}
      {paymentModalInvoice && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "center", padding: "1.5rem" }}>
          <div style={{ background: "var(--color-bg)", borderRadius: "1rem", maxWidth: "450px", width: "100%", padding: "2rem", border: "1px solid var(--color-border)", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.5rem" }}>Complete Milestone Payment</h3>
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
              Invoice {paymentModalInvoice.invoice_number} for {paymentModalInvoice.milestone_label}.
            </p>

            <div style={{ background: "var(--color-bg-secondary)", padding: "1rem", borderRadius: "0.5rem", marginBottom: "1.5rem", textAlign: "center" }}>
              <div style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>Total Amount Payable</div>
              <div style={{ fontSize: "1.75rem", fontWeight: "800", color: "var(--color-primary)", marginTop: "0.25rem" }}>
                {money(paymentModalInvoice.total_invoice_amount)}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <button
                disabled={paymentBusy}
                onClick={() => handleConfirmPayment(paymentModalInvoice.id, "upi")}
                className="btn btn-primary"
                style={{ width: "100%", padding: "0.75rem", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem" }}
              >
                <Zap size={16} />
                <span>Simulate UPI Payment (Instant)</span>
              </button>
              <button
                disabled={paymentBusy}
                onClick={() => handleConfirmPayment(paymentModalInvoice.id, "bank_transfer")}
                className="btn btn-secondary"
                style={{ width: "100%", padding: "0.75rem" }}
              >
                Record Bank NEFT / RTGS Transfer
              </button>
            </div>

            <button
              onClick={() => setPaymentModalInvoice(null)}
              className="btn btn-secondary btn-sm"
              style={{ width: "100%" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
