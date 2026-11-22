"use client";
/* Workspace layout — left sidebar, topbar, auth state, and command palette */
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { WorkspaceSidebar, WorkspaceTopbar } from "../../components/WorkspaceShell";
import { Spinner } from "../../components/ui";
import "../components.css";
import "../public.css";

export default function StaffLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If on sign-in page, don't wrap with workspace shell
    if (["/staff","/staff/apply"].includes(pathname)) {
      setLoading(false);
      return;
    }

    const token = sessionStorage.getItem("photonix_token");
    const stored = sessionStorage.getItem("photonix_account");

    if (!token || !stored) {
      router.replace("/staff");
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      setSession({ ...parsed, token });
    } catch {
      router.replace("/staff");
    } finally {
      setLoading(false);
    }
  }, [pathname, router]);

  function handleSignOut() {
    sessionStorage.removeItem("photonix_token");
    sessionStorage.removeItem("photonix_account");
    setSession(null);
    router.replace("/staff");
  }

  if (["/staff","/staff/apply"].includes(pathname)) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <Spinner size={32} />
      </div>
    );
  }

  const titleMap = {
    "/staff/enquiries": "Solar Enquiries & Quotations",
    "/staff/site-visits": "Site Survey Visits",
    "/staff/survey-approvals": "Technical Survey Verification",
    "/staff/dashboard": "Business Performance & Job Profitability",
    "/staff/dispatch": "Warehouse dispatch",
    "/staff/packing": "Warehouse Packing & Serial Registry",
    "/staff/installations": "Field Installation Completion",
    "/staff/complaints": "Support & Warranty Service Tickets",
    "/staff/admissions": "Staff Applications & Admissions",
    "/staff/identity-checks": "Identity & Evidence Verification",
    "/staff/finance": "Financial Billing & Milestone Invoices",
    "/staff/users": "Staff Personnel Directory & Permissions",
    "/staff/settings": "Workspace Settings & Profile Security",
  };

  const pageTitle = titleMap[pathname] || "Workspace";

  return (
    <div className="ws-layout">
      <WorkspaceSidebar session={session} onSignOut={handleSignOut} />
      <div className="ws-main">
        <WorkspaceTopbar title={pageTitle} />
        <main className="ws-content">{children}</main>
      </div>
    </div>
  );
}
