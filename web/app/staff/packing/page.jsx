"use client";
/* Warehouse Dispatch & Serial Scanner (Scope 3) */
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Package, QrCode, CheckCircle, Truck, RefreshCw, Barcode } from "lucide-react";
import { Button, Card, Badge, Alert, Spinner, DataTable, Modal } from "../../../components/ui";

export default function PackingPage() {
  const dispatch = usePathname() === "/staff/dispatch";
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanModal, setScanModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  function getAuthHeader() {
    const token = typeof window !== "undefined" ? sessionStorage.getItem("photonix_token") : "";
    return { Authorization: `Bearer ${token}` };
  }

  async function loadPacking() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/warehouse/packing", { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Could not load warehouse items");
      const list = await res.json();
      setItems(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPacking();
  }, []);

  async function handleScan(e) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const payload = {
        serialNumber: String(fd.get("serialNumber")).trim(),
        productType: fd.get("productType"),
        modelName: String(fd.get("modelName")).trim(),
        customerName: String(fd.get("customerName")).trim(),
      };

      const res = await fetch("/api/warehouse/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Could not record serial scan");
      }

      const out = await res.json();
      setNotice(`Serial ${payload.serialNumber} scanned & dispatched. 20-year / 2-year warranty clock started automatically.`);
      setScanModal(false);
      await loadPacking();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const columns = [
    { key: "serial_number", label: "Serial #", render: (r) => <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>{r.serial_number}</span> },
    { key: "product_type", label: "Product", render: (r) => <strong style={{ textTransform: "capitalize" }}>{r.product_type}</strong> },
    { key: "model_name", label: "Model", render: (r) => r.model_name },
    { key: "customer_name", label: "Assigned Customer", render: (r) => r.customer_name || "Unassigned" },
    { key: "status", label: "Status", render: (r) => <Badge variant={r.status === "installed" ? "success" : r.status === "dispatched" ? "warning" : "neutral"}>{r.status}</Badge> },
    { key: "warranty_years", label: "Warranty Term", render: (r) => `${r.warranty_years} Years` },
    { key: "dispatched_at", label: "Dispatched Date", render: (r) => r.dispatched_at ? new Date(r.dispatched_at).toLocaleDateString("en-IN") : "In Warehouse" },
  ];

  return (
    <>
      <div className="queue-header">
        <div className="queue-header-left">
          <h1 className="queue-title">{dispatch ? "Warehouse dispatch" : "Warehouse Packing & Serial Registry"}</h1>
          <p className="queue-subtitle">
            Scan and bind every inverter, battery, charge controller, and solar panel serial number before dispatch. Auto-starts warranty upon delivery.
          </p>
        </div>
        <div className="queue-toolbar">
          <Button variant="primary" size="md" onClick={() => setScanModal(true)}>
            <Barcode size={16} /> Scan Equipment Serial
          </Button>
          <Button variant="secondary" size="md" onClick={loadPacking} disabled={loading}>
            <RefreshCw size={15} /> Refresh
          </Button>
        </div>
      </div>

      {notice && <Alert variant="success" onClose={() => setNotice("")}>{notice}</Alert>}
      {error && <Alert variant="danger" onClose={() => setError("")}>{error}</Alert>}

      <DataTable
        columns={columns}
        rows={dispatch ? items.filter(item => item.dispatched_at) : items}
        loading={loading}
        getRowKey={(r) => r.id}
        emptyTitle={dispatch ? "No equipment dispatched yet" : "No equipment in warehouse registry"}
      />

      <Modal open={scanModal} onClose={() => setScanModal(false)} title="Scan & Dispatch Equipment Serial">
        <form onSubmit={handleScan} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div className="field">
            <label className="field-label" htmlFor="scan-serial">Barcode / Serial Number <span className="field-required">*</span></label>
            <input
              id="scan-serial"
              name="serialNumber"
              required
              className="field-input"
              style={{ fontFamily: "var(--font-mono)", letterSpacing: ".05em" }}
              placeholder="e.g. INV-2026-9042 or PAN-2026-1184"
              autoFocus
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
            <div className="field">
              <label className="field-label" htmlFor="scan-type">Equipment Category <span className="field-required">*</span></label>
              <select id="scan-type" name="productType" className="field-input field-select" defaultValue="inverter" required>
                <option value="inverter">Solar String Inverter (2 Yr Warranty)</option>
                <option value="battery">Solar Battery Bank (2 Yr Warranty)</option>
                <option value="panel">Solar Photovoltaic Panel (20 Yr Warranty)</option>
                <option value="charge_controller">MPPT Charge Controller (2 Yr Warranty)</option>
                <option value="mounting_structure">Galvanised Structure</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label" htmlFor="scan-model">Model Specification <span className="field-required">*</span></label>
              <input id="scan-model" name="modelName" required className="field-input" defaultValue="3kW Pure Sine Grid Inverter" />
            </div>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="scan-cust">Assign to Customer Name <span className="field-required">*</span></label>
            <input id="scan-cust" name="customerName" required className="field-input" placeholder="e.g. Rajesh Kumar (PX-000012)" />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)", marginTop: "var(--space-3)" }}>
            <Button type="button" variant="secondary" onClick={() => setScanModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={busy}>
              <CheckCircle size={15} /> Confirm Serial & Dispatch
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
