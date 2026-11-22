"use client";
/* Finance Workspace: Invoices, Revenue Ledger, Milestone Cashflows, and Subsidy Claims */
import Billing from "./billing";
import { useEffect, useState, useMemo } from "react";
import {
  Search, Download, RefreshCw, FileText, CheckCircle2, Clock, AlertCircle,
  TrendingUp, ArrowUpRight, DollarSign, Shield
} from "lucide-react";
import { Button, Badge, Card, Spinner, Alert, DataTable } from "../../../components/ui";

export default function FinancePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  function getAuthHeader() {
    const token = typeof window !== "undefined" ? sessionStorage.getItem("photonix_token") : "";
    return { Authorization: `Bearer ${token}` };
  }

  async function loadFinance() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/finance/overview", { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Could not load finance ledger.");
      setData(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFinance();
  }, []);

  const invoices = data?.invoices ?? [];

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch =
        !search ||
        inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
        inv.customerName.toLowerCase().includes(search.toLowerCase()) ||
        inv.jobNumber.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = filterStatus === "all" || inv.paymentStatus === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, search, filterStatus]);

  function exportCSV() {
    const headers = ["Invoice #", "Job #", "Customer", "Capacity kW", "Contract Amount (Rs)", "Invoice Total (Rs)", "Payments Received (Rs)", "Balance Due (Rs)", "Profit (Rs)", "Margin %", "Payment Status", "Subsidy Claim (Rs)"];
    const rows = filtered.map(i => [
      i.invoiceNumber,
      i.jobNumber,
      `"${i.customerName}"`,
      i.systemCapacityKw,
      i.contractAmount,
      i.invoiceAmount,
      i.collected,
      i.balanceDue,
      i.profit,
      i.marginPercent + "%",
      i.paymentStatus,
      i.subsidyEstimate
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `photonix_financial_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const columns = [
    {
      key: "invoiceNumber",
      label: "Invoice #",
      render: (r) => (
        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--brand-700)" }}>
          {r.invoiceNumber}
        </span>
      ),
    },
    {
      key: "customerName",
      label: "Customer & Job",
      render: (r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.customerName}</div>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
            {r.jobNumber} &middot; {r.systemCapacityKw} kW ({r.systemType === "on_grid" ? "On-Grid" : "Off-Grid"})
          </div>
        </div>
      ),
    },
    {
      key: "contractAmount",
      label: "Contract Value",
      render: (r) => (
        <span style={{ fontWeight: 700 }}>Rs {r.contractAmount.toLocaleString("en-IN")}</span>
      ),
    },
    {
      key: "milestonePayments",
      label: "Collected / Balance",
      render: (r) => {
        const collected = r.collected;
        return (
          <div style={{ fontSize: "var(--text-xs)" }}>
            <span style={{ color: "var(--color-success)", fontWeight: 600 }}>Rs {collected.toLocaleString("en-IN")}</span>
            <span style={{ color: "var(--color-text-muted)" }}> / </span>
            <span style={{ color: r.balanceDue > 0 ? "var(--color-warning)" : "var(--color-text-muted)" }}>
              Rs {r.balanceDue.toLocaleString("en-IN")} due
            </span>
          </div>
        );
      },
    },
    {
      key: "profitMargin",
      label: "Profit / Margin",
      render: (r) => (
        <div>
          <span style={{ fontWeight: 700, color: "var(--brand-700)" }}>Rs {r.profit.toLocaleString("en-IN")}</span>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>{r.marginPercent}%</div>
        </div>
      ),
    },
    {
      key: "paymentStatus",
      label: "Payment Status",
      render: (r) => {
        const badgeMap = {
          unbilled: { variant: "neutral", label: "Unbilled" },
          paid_in_full: { variant: "success", label: "Paid in Full" },
          partial: { variant: "warning", label: "Partially paid" },
          pending: { variant: "neutral", label: "Pending" },
        };
        const b = badgeMap[r.paymentStatus] || badgeMap.pending;
        return <Badge variant={b.variant}>{b.label}</Badge>;
      },
    },
    {
      key: "subsidy",
      label: "Central Subsidy",
      render: (r) => (
        <div style={{ fontSize: "var(--text-xs)" }}>
          <div style={{ fontWeight: 600 }}>Rs {r.subsidyEstimate.toLocaleString("en-IN")}</div>
          <span style={{ color: r.subsidyStatus === "disbursed" ? "var(--color-success)" : "var(--color-text-muted)" }}>
            {r.subsidyStatus === "disbursed" ? "Disbursed" : "In Process"}
          </span>
        </div>
      ),
    },
  ];

  if (loading && !data) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-16)" }}>
        <Spinner size={32} />
      </div>
    );
  }

  const s = data?.summary;

  return (
    <>
      <div className="queue-header">
        <div className="queue-header-left">
          <h1 className="queue-title">Finance & Billing Ledger</h1>
          <p className="queue-subtitle">
            Track customer invoicing, advance receipts, milestone collections, equipment costs, and subsidy claims.
          </p>
        </div>
        <div className="queue-toolbar">
          <Button variant="secondary" size="md" onClick={loadFinance}>
            <RefreshCw size={15} /> Refresh
          </Button>
          <Button variant="secondary" size="md" onClick={exportCSV}>
            <Download size={15} /> Export CSV
          </Button>
        </div>
      </div>

      {error && <Alert variant="danger" onClose={() => setError("")}>{error}</Alert>}

      <Billing jobs={invoices} canWrite={data?.canWrite} onRefresh={loadFinance} />
      {/* Summary KPI Cards */}
      {s && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
          <Card>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>
              Total invoiced
            </span>
            <div style={{ fontSize: "var(--text-2xl)", fontWeight: 800, color: "var(--brand-700)", marginTop: "4px" }}>
              Rs {s.billed?.toLocaleString("en-IN")}
            </div>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginTop: "4px" }}>
              Across {s.totalJobsCount} contracted projects
            </div>
          </Card>

          <Card>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>
              Total Equipment Cost
            </span>
            <div style={{ fontSize: "var(--text-2xl)", fontWeight: 800, color: "var(--color-text)", marginTop: "4px" }}>
              Rs {s.totalEquipment?.toLocaleString("en-IN")}
            </div>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginTop: "4px" }}>
              Modules, inverters, structures
            </div>
          </Card>

          <Card>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>
              Labour & Installation
            </span>
            <div style={{ fontSize: "var(--text-2xl)", fontWeight: 800, color: "var(--color-text)", marginTop: "4px" }}>
              Rs {s.totalLabour?.toLocaleString("en-IN")}
            </div>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginTop: "4px" }}>
              Technician payouts & wiring
            </div>
          </Card>

          <Card>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>
              Estimated job contribution
            </span>
            <div style={{ fontSize: "var(--text-2xl)", fontWeight: 800, color: "var(--color-success)", marginTop: "4px" }}>
              Rs {s.netProfit?.toLocaleString("en-IN")}
            </div>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--color-success)", marginTop: "4px", fontWeight: 600 }}>
              {s.overallMargin}% blended margin
            </div>
          </Card>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-4)", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 240px", maxWidth: 360 }}>
          <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-faint)" }} />
          <input
            type="search"
            className="field-input"
            style={{ paddingLeft: "2rem" }}
            placeholder="Search invoice, job #, or customer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="field-input field-select"
          style={{ width: "auto" }}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">All Payment Statuses</option>
          <option value="paid_in_full">Paid in Full</option>
          <option value="partial">Partially paid</option>
          <option value="unbilled">Unbilled</option>
          <option value="pending">Pending Payment</option>
        </select>
      </div>

      {/* Invoices Table */}
      <DataTable
        columns={columns}
        rows={filtered}
        emptyMessage="No financial invoice records found matching your filters."
      />
    </>
  );
}
