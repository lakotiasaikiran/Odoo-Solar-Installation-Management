"use client";
/* Photonix Design System — shared primitive components
   Rules: no emojis, Lucide icons only where genuinely helpful,
   every component connects to real state (no decorative dead controls). */

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";

/* ─── Button ─────────────────────────────────────────────────── */
export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  children,
  className = "",
  ...rest
}) {
  const base = "btn";
  const v = `btn-${variant}`;
  const s = `btn-${size}`;
  return (
    <button
      className={`${base} ${v} ${s} ${className}`.trim()}
      disabled={disabled || loading}
      aria-busy={loading}
      {...rest}
    >
      {loading ? <span className="btn-spinner" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

/* ─── Badge ──────────────────────────────────────────────────── */
export function Badge({ variant = "neutral", children, className = "" }) {
  return <span className={`badge badge-${variant} ${className}`.trim()}>{children}</span>;
}

/* ─── Input ──────────────────────────────────────────────────── */
export function Input({ label, error, hint, className = "", required, ...props }) {
  const id = useRef("inp-" + Math.random().toString(36).slice(2));
  return (
    <div className={`field ${className}`.trim()}>
      {label && (
        <label className="field-label" htmlFor={id.current}>
          {label}
          {required && <span className="field-required" aria-hidden="true"> *</span>}
        </label>
      )}
      <input
        id={id.current}
        className={`field-input${error ? " field-input-error" : ""}`}
        required={required}
        aria-describedby={error ? id.current + "-err" : hint ? id.current + "-hint" : undefined}
        aria-invalid={error ? "true" : undefined}
        {...props}
      />
      {hint && !error && <p id={id.current + "-hint"} className="field-hint">{hint}</p>}
      {error && <p id={id.current + "-err"} role="alert" className="field-error">{error}</p>}
    </div>
  );
}

/* ─── Textarea ───────────────────────────────────────────────── */
export function Textarea({ label, error, hint, className = "", required, rows = 3, ...props }) {
  const id = useRef("ta-" + Math.random().toString(36).slice(2));
  return (
    <div className={`field ${className}`.trim()}>
      {label && (
        <label className="field-label" htmlFor={id.current}>
          {label}
          {required && <span className="field-required" aria-hidden="true"> *</span>}
        </label>
      )}
      <textarea
        id={id.current}
        rows={rows}
        className={`field-input field-textarea${error ? " field-input-error" : ""}`}
        required={required}
        aria-describedby={error ? id.current + "-err" : undefined}
        aria-invalid={error ? "true" : undefined}
        {...props}
      />
      {hint && !error && <p className="field-hint">{hint}</p>}
      {error && <p id={id.current + "-err"} role="alert" className="field-error">{error}</p>}
    </div>
  );
}

/* ─── Select ─────────────────────────────────────────────────── */
export function Select({ label, error, hint, className = "", required, children, ...props }) {
  const id = useRef("sel-" + Math.random().toString(36).slice(2));
  return (
    <div className={`field ${className}`.trim()}>
      {label && (
        <label className="field-label" htmlFor={id.current}>
          {label}
          {required && <span className="field-required" aria-hidden="true"> *</span>}
        </label>
      )}
      <select
        id={id.current}
        className={`field-input field-select${error ? " field-input-error" : ""}`}
        required={required}
        {...props}
      >
        {children}
      </select>
      {hint && !error && <p className="field-hint">{hint}</p>}
      {error && <p role="alert" className="field-error">{error}</p>}
    </div>
  );
}

/* ─── Card ───────────────────────────────────────────────────── */
export function Card({ children, className = "", padding = true, ...rest }) {
  return (
    <div className={`card${padding ? "" : " card-no-pad"} ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}

/* ─── Alert / Toast ──────────────────────────────────────────── */
export function Alert({ variant = "info", children, className = "", onClose }) {
  return (
    <div role="alert" className={`alert alert-${variant} ${className}`.trim()}>
      <span className="alert-body">{children}</span>
      {onClose && (
        <button className="alert-close" onClick={onClose} aria-label="Dismiss">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      )}
    </div>
  );
}

/* ─── Spinner ────────────────────────────────────────────────── */
export function Spinner({ size = 20, className = "" }) {
  return (
    <svg
      className={`spinner ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  );
}

/* ─── Empty State ────────────────────────────────────────────── */
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="empty-state">
      {Icon && <div className="empty-state-icon"><Icon size={40} strokeWidth={1.5} /></div>}
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-desc">{description}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}

/* ─── Modal ──────────────────────────────────────────────────── */
export function Modal({ open, onClose, title, children, footer, wide = false }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    ref.current?.focus();
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className={`modal-panel${wide ? " modal-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        ref={ref}
      >
        <div className="modal-header">
          <h2 id="modal-title" className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close dialog">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

/* ─── Stage Bar ──────────────────────────────────────────────── */
export function StageBar({ stages, current }) {
  const ci = stages.findIndex((s) => s.key === current);
  return (
    <nav aria-label="Progress" className="stage-bar">
      <ol className="stage-bar-list">
        {stages.map((s, i) => {
          const done = i < ci;
          const active = i === ci;
          return (
            <li key={s.key} className={`stage-item${done ? " stage-done" : active ? " stage-active" : ""}`}>
              <span className="stage-dot" aria-hidden="true">{done ? <Check size={14} /> : i + 1}</span>
              <span className="stage-label">{s.label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ─── Data Table ─────────────────────────────────────────────── */
export function DataTable({ columns, rows, loading, emptyTitle = "No records", emptyDesc, onRowClick, getRowKey }) {
  if (loading) {
    return (
      <div className="table-loading" aria-label="Loading">
        <Spinner size={28} />
      </div>
    );
  }
  if (!rows?.length) {
    return <EmptyState title={emptyTitle} description={emptyDesc} />;
  }
  return (
    <div className="table-wrap" role="region" aria-label="Data table" tabIndex={0}>
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" style={c.width ? { width: c.width } : undefined}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={getRowKey ? getRowKey(row) : ri}
              className={onRowClick ? "table-row-clickable" : ""}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onKeyDown={onRowClick ? (e) => e.key === "Enter" && onRowClick(row) : undefined}
            >
              {columns.map((c) => (
                <td key={c.key}>{c.render ? c.render(row) : row[c.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Status Badge helpers ───────────────────────────────────── */
export function surveyBadge(status) {
  const map = {
    unassigned: ["neutral", "Unassigned"],
    assigned:   ["info", "Assigned"],
    submitted:  ["warning", "Survey submitted"],
    changes_requested: ["danger", "Changes requested"],
    approved:   ["success", "Approved"],
  };
  const [v, l] = map[status] ?? ["neutral", status];
  return <Badge variant={v}>{l}</Badge>;
}

export function quoteBadge(status) {
  const map = {
    locked:  ["neutral", "Locked"],
    draft:   ["warning", "Draft"],
    sent:    ["success", "Sent"],
    accepted:["success", "Accepted"],
  };
  const [v, l] = map[status] ?? ["neutral", status];
  return <Badge variant={v}>{l}</Badge>;
}

export function qualBadge(state) {
  const map = {
    new:        ["neutral", "New"],
    qualified:  ["success", "Qualified"],
    unsuitable: ["danger", "Unsuitable"],
  };
  const [v, l] = map[state] ?? ["neutral", state];
  return <Badge variant={v}>{l}</Badge>;
}
