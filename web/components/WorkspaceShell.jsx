"use client";
/* Staff workspace shell — sidebar, topbar, role-based nav */
import { useState, useEffect, useCallback, createContext, useContext } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LogOut, Users, ClipboardList, Briefcase, Package, Wrench,
  LayoutDashboard, AlertTriangle, FileText, Settings, ChevronDown, Bell
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export const ROLE_NAV = {
  sales: [
    { label: "Dashboard", href: "/staff/dashboard", icon: LayoutDashboard },
    { label: "My enquiries", href: "/staff/enquiries", icon: ClipboardList },
  ],
  surveyor: [
    { label: "Site visits", href: "/staff/site-visits", icon: Briefcase },
  ],
  technical_reviewer: [
    { label: "Survey approvals", href: "/staff/survey-approvals", icon: FileText },
  ],
  warehouse: [
    { label: "Dashboard", href: "/staff/dashboard", icon: LayoutDashboard },
    { label: "Packing list", href: "/staff/packing", icon: Package },
    { label: "Dispatch", href: "/staff/dispatch", icon: Package },
  ],
  installer: [
    { label: "My jobs", href: "/staff/installations", icon: Wrench },
  ],
  support: [
    { label: "Support tickets", href: "/staff/complaints", icon: AlertTriangle },
  ],
  director: [
    { label: "Dashboard", href: "/staff/dashboard", icon: LayoutDashboard },
    { label: "All enquiries", href: "/staff/enquiries", icon: ClipboardList },
    { label: "Installations", href: "/staff/installations", icon: Wrench },
    { label: "Finance", href: "/staff/finance", icon: FileText },
    { label: "Staff", href: "/staff/users", icon: Users },
    { label: "Transactions", href: "/staff/transactions", icon: FileText },
  ],
  admin: [
    { label: "Dashboard", href: "/staff/dashboard", icon: LayoutDashboard },
    { label: "Staff applications", href: "/staff/admissions", icon: Users },
    { label: "Staff directory", href: "/staff/users", icon: Users },
    { label: "Settings", href: "/staff/settings", icon: Settings },
    { label: "Transactions", href: "/staff/transactions", icon: FileText },
  ],
  verifier: [
    { label: "Identity checks", href: "/staff/identity-checks", icon: Users },
  ],
  manager: [
    { label: "Dashboard", href: "/staff/dashboard", icon: LayoutDashboard },
    { label: "Enquiries & Quotes", href: "/staff/enquiries", icon: ClipboardList },
    { label: "Transactions", href: "/staff/transactions", icon: FileText },
  ],
  finance: [
    { label: "Dashboard", href: "/staff/dashboard", icon: LayoutDashboard },
    { label: "Financial Ledger", href: "/staff/finance", icon: FileText },
    { label: "Transactions", href: "/staff/transactions", icon: FileText },
  ],
};

function NavItem({ item, active }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={`ws-nav-link${active ? " ws-nav-link-active" : ""}`}
    >
      <Icon size={16} strokeWidth={2} />
      {item.label}
    </Link>
  );
}

export function WorkspaceSidebar({ session, onSignOut }) {
  const pathname = usePathname();
  const nav = ROLE_NAV[session?.role] ?? [];
  const initials = (session?.email ?? "?").slice(0, 2).toUpperCase();

  return (
    <aside className="ws-sidebar">
      <div className="ws-sidebar-brand">
        <img className="photonix-mark" src="/brand/photonix-emblem.webp" width="36" height="36" alt="" />
        <span className="ws-sidebar-brand-name">Photonix</span>
      </div>

      <nav className="ws-sidebar-nav" aria-label="Staff workspace navigation">
        {nav.map((item) => (
          <NavItem key={item.href} item={item} active={pathname?.startsWith(item.href)} />
        ))}

        {/* Common links */}
        <div style={{ marginTop: "auto" }}>
          <NavItem item={{ label: "Settings", href: "/staff/settings", icon: Settings }} active={pathname === "/staff/settings"} />
        </div>
      </nav>

      <div className="ws-sidebar-user">
        <div className="ws-user-avatar" aria-hidden="true">{initials}</div>
        <div className="ws-user-info">
          <div className="ws-user-email">{session?.email}</div>
          <div className="ws-user-role">{session?.role?.replace("_", " ")}</div>
        </div>
        <button className="ws-signout" onClick={onSignOut} title="Sign out" aria-label="Sign out">
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  );
}

export function WorkspaceTopbar({ title, actions }) {
  const [open,setOpen]=useState(false);
  const [alerts,setAlerts]=useState(null);
  const [failed,setFailed]=useState(false);
  useEffect(()=>{
    if (!open) return;
    const controller=new AbortController();
    async function update(){
      try{
        const res=await fetch("/api/notifications",{signal:controller.signal,headers:{Authorization:"Bearer "+sessionStorage.getItem("photonix_token")}});
        if(!res.ok) throw Error();
        setAlerts(await res.json());setFailed(false);
      }catch{if(!controller.signal.aborted)setFailed(true);}
    }
    update();const timer=setInterval(update,15000);
    return ()=>{controller.abort();clearInterval(timer)};
  },[open]);
  return (
    <div className="ws-topbar">
      <span className="ws-topbar-title">{title}</span>
      <div className="ws-topbar-actions">
        {actions}
        <ThemeToggle />
        <div style={{position:"relative"}}><button className="btn btn-secondary btn-sm" aria-label="Notifications" aria-expanded={open} onClick={()=>setOpen(!open)}>
          <Bell size={15} /></button>
          {open && <section aria-label="Work notifications" style={{position:"absolute",zIndex:20,right:0,top:"110%",width:"min(18rem,85vw)",padding:"1rem",background:"var(--color-surface)",border:"1px solid var(--color-border)",borderRadius:12,boxShadow:"var(--shadow-lg)"}}>
            <strong>Notifications</strong>{failed?<p>Could not load notifications.</p>:alerts===null?<p>Loading…</p>:alerts.length?alerts.map(a=><p key={a.href}><Link href={a.href} onClick={()=>setOpen(false)}>{a.label} · {a.count}</Link></p>):<p>No current alerts.</p>}
          </section>}</div>
      </div>
    </div>
  );
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);

  const signIn = useCallback((s) => setSession(s), []);
  const signOut = useCallback(() => setSession(null), []);

  return (
    <AuthCtx.Provider value={{ session, signIn, signOut }}>
      {children}
    </AuthCtx.Provider>
  );
}
