"use client";
/* Director & Management Performance Dashboard (Scope 6) */
import { useEffect, useRef, useState } from "react";
import {
  TrendingUp, DollarSign, Wrench, Package, ShieldCheck, AlertTriangle,
  RefreshCw, CheckCircle2, Clock, Users, ArrowUpRight
} from "lucide-react";
import { ROLE_NAV } from "../../../components/WorkspaceShell";
import { Button, Card, Badge, Alert, Spinner, DataTable } from "../../../components/ui";

function signInAgain(){
  sessionStorage.removeItem("photonix_token");
  sessionStorage.removeItem("photonix_account");
  window.location.replace("/staff");
}

export default function StaffDashboard(){
  const [account,setAccount]=useState(null);
  const [message,setMessage]=useState("");
  useEffect(()=>{
    const controller=new AbortController();
    async function load(){
      try{
        const response=await fetch("/api/me",{headers:{Authorization:"Bearer "+sessionStorage.getItem("photonix_token")},signal:controller.signal});
        if(response.status===401){signInAgain();return;}
        if(!response.ok)throw Error();
        setAccount(await response.json());
      }catch{if(!controller.signal.aborted)setMessage("Could not reach your workspace. Refresh this page to retry.");}
    }
    load();return ()=>controller.abort();
  },[]);
  if(message)return <Alert variant="danger">{message}</Alert>;
  if(!account)return <Spinner/>;
  if(["director","manager","admin"].includes(account.role))return <DirectorDashboard/>;
  return <section><h1 className="queue-title">{account.role.replaceAll("_"," ")} dashboard</h1>
    <nav aria-label="Your workspace" style={{display:"flex",flexWrap:"wrap",gap:12,marginTop:20}}>
    {(ROLE_NAV[account.role]||[]).filter(item=>item.href!=="/staff/dashboard").map(item=><a key={item.href} className="btn btn-secondary" href={item.href}>{item.label}</a>)}
    <a className="btn btn-secondary" href="/staff/settings">Account settings</a></nav></section>;
}

function DirectorDashboard() {
  const [range, setRange] = useState("month"); // 'today' | 'week' | 'month' | 'all'
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function getAuthHeader() {
    const token = typeof window !== "undefined" ? sessionStorage.getItem("photonix_token") : "";
    return { Authorization: `Bearer ${token}` };
  }

  const latest=useRef(0);
  async function loadOverview(r = range) {
    const version=++latest.current;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/director/overview?range=${r}`, { headers: getAuthHeader() });
      if(res.status===401){signInAgain();return;}
      if (!res.ok) throw new Error("Could not load director metrics");
      const json = await res.json();
      if(version===latest.current)setData(json);
    } catch (err) {
      if(version===latest.current)setError(err.message);
    } finally {
      if(version===latest.current)setLoading(false);
    }
  }

  useEffect(() => {
    loadOverview(range);
    const timer=setInterval(()=>{if(!document.hidden)loadOverview(range)},15000);
    return ()=>{clearInterval(timer);latest.current++};
  }, [range]);

  const f = data?.financials;

  const jobColumns = [
    { key: "job_number", label: "Job #", render: (r) => <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>{r.job_number}</span> },
    { key: "customer_name", label: "Customer", render: (r) => <strong>{r.customer_name}</strong> },
    { key: "system_capacity_kw", label: "Size", render: (r) => `${r.system_capacity_kw} kW (${r.system_type === "on_grid" ? "On-Grid" : "Off-Grid"})` },
    { key: "status", label: "Stage", render: (r) => <Badge variant={r.status === "completed" ? "success" : r.status === "in_progress" ? "warning" : "neutral"}>{r.status}</Badge> },
    { key: "contract_amount", label: "Revenue", render: (r) => `Rs ${Number(r.contract_amount).toLocaleString("en-IN")}` },
    { key: "cost", label: "Cost (Equip + Lab)", render: (r) => `Rs ${(Number(r.equipment_cost) + Number(r.labour_cost)).toLocaleString("en-IN")}` },
    { key: "profit", label: "Profit", render: (r) => (
      <span style={{ fontWeight: 700, color: Number(r.profit) >= 0 ? "var(--color-success)" : "var(--color-danger)" }}>
        Rs {Number(r.profit).toLocaleString("en-IN")}
      </span>
    )},
    { key: "margin_pct", label: "Margin", render: (r) => (
      <span style={{ fontWeight: 600 }}>{r.margin_pct}%</span>
    )},
  ];

  const techColumns = [
    { key: "technician_name", label: "Technician", render: (r) => <strong>{r.technician_name}</strong> },
    { key: "jobs_completed", label: "Jobs Completed", render: (r) => r.jobs_completed },
    { key: "total_kw_installed", label: "Total kW Installed", render: (r) => `${r.total_kw_installed} kW` },
    { key: "total_pay", label: "Total Labour Pay", render: (r) => `Rs ${Number(r.total_pay).toLocaleString("en-IN")}` },
  ];

  const repairColumns = [
    { key: "ticket_number", label: "Ticket #", render: (r) => <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>{r.ticket_number}</span> },
    { key: "customer_name", label: "Customer", render: (r) => r.customer_name },
    { key: "product_type", label: "Equipment", render: (r) => r.product_type },
    { key: "in_warranty", label: "Warranty Status", render: (r) => <Badge variant={r.in_warranty ? "success" : "danger"}>{r.in_warranty ? "In Warranty (Free)" : "Out of Warranty (Billed)"}</Badge> },
    { key: "status", label: "Ticket Status", render: (r) => <Badge variant={r.status === "customer_confirmed" ? "success" : "warning"}>{r.status}</Badge> },
  ];

  return (
    <>
      <div className="queue-header">
        <div className="queue-header-left">
          <h1 className="queue-title">Executive Performance & Profitability</h1>
          {data && <a href="/staff/finance">Outstanding invoices across all dates · ₹{Number(data.outstandingInvoices).toLocaleString("en-IN")}</a>}
          <p className="queue-subtitle">
            Audited financial results, stage breakdown, technician compensation, and service metrics directly from real recorded transactions.
          </p>
        </div>
        <div className="queue-toolbar">
          <div style={{ display: "flex", background: "var(--color-surface-alt)", padding: "2px", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
            {["today", "week", "month", "all"].map((r) => (
              <button
                key={r}
                className={`btn btn-sm ${range === r ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setRange(r)}
                style={{ textTransform: "capitalize", padding: "4px 12px" }}
              >
                {r === "all" ? "All Time" : r}
              </button>
            ))}
          </div>
          <Button variant="secondary" size="md" onClick={() => loadOverview(range)} disabled={loading}>
            <RefreshCw size={15} /> Refresh
          </Button>
        </div>
      </div>

      {error && <Alert variant="danger" onClose={() => setError("")}>{error}</Alert>}

      {loading && !data ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-12)" }}>
          <Spinner size={32} />
        </div>
      ) : data ? (
        <>
          <nav aria-label="Project workspaces" style={{display:"flex",flexWrap:"wrap",gap:12,marginBottom:20}}>
            {([["Enquiries","enquiries"],["Site surveys","site-visits"],["Installations","installations"],["Invoice management","finance"],["Warranty service","complaints"]]).filter(([_,path])=>sessionStorage.getItem("photonix_account") && !(JSON.parse(sessionStorage.getItem("photonix_account")).role==="manager" && ["site-visits","complaints"].includes(path))).map(([label,path])=><a className="btn btn-secondary" key={path} href={"/staff/"+path}>{label}</a>)}
          </nav>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,280px),1fr))",gap:16,marginBottom:20}}>
          {[
            ["Installation workload",[["Scheduled",f.scheduledJobs],["In progress",f.inProgressJobs],["Completed",f.completedJobs]]],
            ["Completed project costs",[["Equipment",f.equipmentCost],["Labour",f.labourCost]]]
          ].map(([title,items])=><Card key={title}><h2>{title}</h2><small>Selected period · updates every 15 seconds</small>{items.map(([label,value])=><div key={label} style={{marginTop:12}}>{label} · {title.includes("costs")?"₹":""}{Number(value).toLocaleString("en-IN")}<progress aria-label={label} value={value} max={Math.max(1,...items.map(item=>item[1]))} style={{display:"block",width:"100%",accentColor:"var(--brand-500)"}}/></div>)}</Card>)}
          </div>
          {/* Top KPI Metric Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--space-4)" }}>
            <Card style={{ padding: "var(--space-5)" }}>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: ".06em" }}>
                Recorded Revenue
              </span>
              <div style={{ fontSize: "var(--text-3xl)", fontWeight: 800, marginTop: "4px", color: "var(--color-text)" }}>
                Rs {f?.totalRevenue?.toLocaleString("en-IN") || 0}
              </div>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginTop: "2px", display: "block" }}>
                {f?.completedJobs || 0} installations delivered
              </span>
            </Card>

            <Card style={{ padding: "var(--space-5)" }}>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: ".06em" }}>
                Net Contribution Profit
              </span>
              <div style={{ fontSize: "var(--text-3xl)", fontWeight: 800, marginTop: "4px", color: "var(--color-success)" }}>
                Rs {f?.netProfit?.toLocaleString("en-IN") || 0}
              </div>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginTop: "2px", display: "block" }}>
                Profit Margin: <strong>{f?.marginPct || 0}%</strong>
              </span>
            </Card>

            <Card style={{ padding: "var(--space-5)" }}>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: ".06em" }}>
                Cost Breakdown
              </span>
              <div style={{ fontSize: "var(--text-base)", fontWeight: 700, marginTop: "6px" }}>
                Equip: Rs {f?.equipmentCost?.toLocaleString("en-IN") || 0}
              </div>
              <div style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)", marginTop: "2px" }}>
                Labour: Rs {f?.labourCost?.toLocaleString("en-IN") || 0}
              </div>
            </Card>

            <Card style={{ padding: "var(--space-5)" }}>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: ".06em" }}>
                Job Pipeline by Stage
              </span>
              <div style={{ display: "flex", gap: "8px", marginTop: "8px", alignItems: "baseline" }}>
                <Badge variant="success">{f?.completedJobs || 0} Done</Badge>
                <Badge variant="warning">{f?.inProgressJobs || 0} In Progress</Badge>
                <Badge variant="neutral">{f?.scheduledJobs || 0} Scheduled</Badge>
              </div>
            </Card>
          </div>

          {/* Profit per Job Table */}
          <div style={{ marginTop: "var(--space-4)" }}>
            <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 750, marginBottom: "var(--space-3)" }}>
              Job Profitability Ledger (Recorded Transactions)
            </h2>
            <DataTable
              columns={jobColumns}
              rows={data.jobs || []}
              getRowKey={(r) => r.id}
              emptyTitle="No jobs recorded for this period"
            />
          </div>

          {/* Split View: Technician Pay & Open Repairs */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-6)", marginTop: "var(--space-4)" }}>
            <div>
              <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 750, marginBottom: "var(--space-3)" }}>
                Technician Work & Compensation
              </h2>
              <DataTable
                columns={techColumns}
                rows={data.technicianPay || []}
                getRowKey={(r) => r.technician_name}
                emptyTitle="No technician hours logged"
              />
            </div>

            <div>
              <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 750, marginBottom: "var(--space-3)" }}>
                Open Service Repairs & Warranties
              </h2>
              <DataTable
                columns={repairColumns}
                rows={data.repairs || []}
                getRowKey={(r) => r.ticket_number}
                emptyTitle="No open repair tickets"
              />
            </div>
          </div>

          <section style={{marginBlock:"2rem"}}><h2>Payment follow-up</h2><p>Review unpaid invoice balances and record incoming payments.</p><a href="/staff/finance">Open billing ledger →</a></section>
        </>
      ) : null}
    </>
  );
}
