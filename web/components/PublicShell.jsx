"use client";
/* Public website shell: Header and Footer */
import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import "../app/components.css";

const NAV = [
  { label: "Solutions",      href: "/solutions" },
  { label: "Subsidy guide",  href: "/subsidy-guide" },
  { label: "Track project",  href: "/track" },
  { label: "Warranty check", href: "/warranty" },
  { label: "Contact",        href: "/contact" },
];

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="pub-header">
      <div className="container pub-header-inner">
        {/* Logo */}
        <Link href="/" className="pub-logo" aria-label="Photonix Solar — home">
          <img className="photonix-mark" src="/brand/photonix-emblem.webp" width="36" height="36" alt="" />
          Photonix
        </Link>

        {/* Desktop nav */}
        <nav className="pub-nav" aria-label="Main navigation">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="pub-navlink">
              {n.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="pub-header-actions">
          <ThemeToggle />
          <Link href="/enquiry" className="btn btn-primary btn-sm">
            Get a quote
          </Link>
          <Link href="/customer/login" className="pub-staff-link" style={{ fontWeight: 600 }}>
            Customer portal
          </Link>
          <Link href="/staff" className="pub-staff-link">
            Staff sign in
          </Link>
          <button
            className="pub-menu-btn"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {open && (
        <nav className="pub-mobile-nav" aria-label="Mobile navigation">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="pub-mobile-link"
              onClick={() => setOpen(false)}
            >
              {n.label}
            </Link>
          ))}
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", margin: "0.5rem 0" }}>
            <span style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>Theme:</span>
            <ThemeToggle />
          </div>
          <Link href="/enquiry" className="btn btn-primary btn-md" onClick={() => setOpen(false)}>
            Get a quote
          </Link>
          <Link href="/customer/login" className="pub-staff-link" onClick={() => setOpen(false)} style={{ fontWeight: 600 }}>
            Customer portal
          </Link>
          <Link href="/staff" className="pub-staff-link" onClick={() => setOpen(false)}>
            Staff sign in
          </Link>
        </nav>
      )}
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="pub-footer">
      <div className="container pub-footer-inner">
        <div className="pub-footer-brand">
          <Link href="/" className="pub-logo pub-logo-sm">
            <img className="photonix-mark" src="/brand/photonix-emblem.webp" width="36" height="36" alt="" />
            Photonix Solar
          </Link>
          <p className="pub-footer-tagline">
            Professional rooftop solar installation across India.
          </p>
        </div>

        <div className="pub-footer-links">
          <div className="pub-footer-col">
            <span className="pub-footer-heading">Services</span>
            <Link href="/solutions">On-grid systems</Link>
            <Link href="/solutions">Off-grid systems</Link>
            <Link href="/subsidy-guide">PM Surya Ghar subsidy</Link>
          </div>
          <div className="pub-footer-col">
            <span className="pub-footer-heading">Support</span>
            <Link href="/warranty">Warranty check</Link>
            <Link href="/track">Track project</Link>
            <Link href="/contact">Contact us</Link>
          </div>
          <div className="pub-footer-col">
            <span className="pub-footer-heading">Legal</span>
            <Link href="/privacy">Privacy policy</Link>
            <Link href="/terms">Terms of service</Link>
            <Link href="/refund">Refund policy</Link>
          </div>
        </div>
      </div>

      <div className="pub-footer-bottom container">
        <p>
          &copy; {new Date().getFullYear()} Photonix Solar Installations. All rights reserved.
        </p>
        <p className="pub-footer-disclaimer">
          Subsidy figures shown are based on government scheme guidelines. Verify current amounts
          at{" "}
          <a
            href="https://pmsuryaghar.gov.in"
            target="_blank"
            rel="noopener noreferrer"
          >
            pmsuryaghar.gov.in
          </a>{" "}
          before applying.
        </p>
      </div>
    </footer>
  );
}
