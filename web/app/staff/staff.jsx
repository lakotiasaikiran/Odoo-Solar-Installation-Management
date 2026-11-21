"use client";
import { useEffect, useRef, useState } from "react";
import { Header } from "../shell";

export default function Staff() {
  const [session, setSession] = useState(null);
  const [rows, setRows] = useState([]);
  const [surveyors, setSurveyors] = useState([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Modals state
  const [activeModal, setActiveModal] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);

  const generation = useRef(0);

  function signOut(message = "") {
    generation.current++;
    setSession(null);
    setRows([]);
    setSurveyors([]);
    setReady(false);
    setBusy(false);
    setError(message);
    setNotice("");
    setActiveModal(null);
    setSelectedLead(null);
  }

  async function loadQueue(token, role, ticket) {
    const response = await fetch("/api/enquiries", {
      headers: { Authorization: "Bearer " + token },
      cache: "no-store",
      signal: AbortSignal.timeout(20000)
    });
    if (generation.current !== ticket) return;
    if (response.status === 401 || response.status === 403) {
      signOut("Your session has expired. Please sign in again.");
      return;
    }
    if (!response.ok) throw new Error("Queue unavailable. Try refreshing.");
    const list = await response.json();
    if (!Array.isArray(list)) throw new Error("The queue could not be read. Try refreshing.");
    if (generation.current === ticket) {
      setRows(list);
      setReady(true);
    }

    // If sales role, load active surveyors for assignment dropdown
    if (role === "sales") {
      try {
        const survRes = await fetch("/api/enquiries/surveyors/list", {
          headers: { Authorization: "Bearer " + token },
          cache: "no-store"
        });
        if (survRes.ok) {
          const survList = await survRes.json();
          if (Array.isArray(survList) && generation.current === ticket) {
            setSurveyors(survList);
          }
        }
      } catch {}
    }
  }

  async function loginWithCredentials(email, password) {
    const ticket = ++generation.current;
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        signal: AbortSignal.timeout(20000)
      });
      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? "Sign-in failed. Check your email, password, and active account status."
            : response.status === 429
            ? "Too many sign-in attempts. Try again later."
            : "Sign-in is unavailable. Please try again."
        );
      }
      const { accessToken } = await response.json();
      const meRes = await fetch("/api/me", {
        headers: { Authorization: "Bearer " + accessToken },
        cache: "no-store",
        signal: AbortSignal.timeout(20000)
      });
      if (!meRes.ok) throw new Error("Your session could not be verified. Please sign in again.");
      const account = await meRes.json();
      if (generation.current !== ticket) return;
      setSession({ id: account.id, role: account.role, workspace: account.workspace, token: accessToken, email });
      await loadQueue(accessToken, account.role, ticket);
    } catch (e) {
      if (generation.current === ticket) setError(e.message || "Connection unavailable.");
    } finally {
      if (generation.current === ticket) setBusy(false);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await loginWithCredentials(String(form.get("email")).trim(), String(form.get("password")));
  }

  async function refresh() {
    if (!session || busy) return;
    const ticket = ++generation.current;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await loadQueue(session.token, session.role, ticket);
    } catch {
      if (generation.current === ticket) setError("Queue unavailable. Please try refreshing.");
    } finally {
      if (generation.current === ticket) setBusy(false);
    }
  }

  // --- ACTIONS ---

  // 1. Assisted Intake (Sales)
  async function submitAssistedIntake(e) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const payload = {
        customerName: String(data.get("customerName") ?? "").trim(),
        phone: String(data.get("phone") ?? "").trim(),
        address: String(data.get("address") ?? "").trim(),
        requirement: String(data.get("requirement") ?? "").trim(),
        sourceChannel: String(data.get("sourceChannel") ?? "call"),
        propertyType: String(data.get("propertyType") ?? "residential"),
        monthlyBill: Number(data.get("monthlyBill")) || 0,
        roofSpace: Number(data.get("roofSpace")) || 0,
        backupRequired: String(data.get("backupRequired") ?? "essential"),
        subsidyRequested: data.get("subsidyRequested") === "true",
        idempotencyKey: crypto.randomUUID()
      };
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.token },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to record assisted intake");
      }
      const created = await res.json();
      setNotice(`Assisted enquiry ${created.reference} logged. Give the customer their private tracking code: ${created.reference}.${created.trackingCode}`);
      setActiveModal(null);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // 2. Qualification Call (Check 2 - Sales)
  async function submitQualification(e) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const body = {
        gridSuitability: String(data.get("gridSuitability")),
        monthlyBill: Number(data.get("monthlyBill")) || 0,
        roofSpace: Number(data.get("roofSpace")) || 0,
        preliminaryCapacityKw: Number(data.get("preliminaryCapacityKw")) || 0,
        qualificationNotes: String(data.get("qualificationNotes") ?? "").trim(),
        qualificationState: String(data.get("qualificationState") ?? "qualified"),
        assignedSurveyorId: data.get("assignedSurveyorId") ? String(data.get("assignedSurveyorId")) : null
      };
      const res = await fetch(`/api/enquiries/${selectedLead.id}/qualify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.token },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save qualification");
      }
      setNotice(`Qualification call recorded for ${selectedLead.reference}.`);
      setActiveModal(null);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // 3. Physical Survey Findings (Check 3 - Surveyor)
  async function submitSurvey(e) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const body = {
        roofDirection: String(data.get("roofDirection")),
        roofTiltDeg: Number(data.get("roofTiltDeg")),
        usableRoofArea: Number(data.get("usableRoofArea")),
        cableDistanceM: Number(data.get("cableDistanceM")),
        roofType: String(data.get("roofType") ?? "rcc_flat"),
        surveyNotes: String(data.get("surveyNotes") ?? "").trim()
      };
      const res = await fetch(`/api/enquiries/${selectedLead.id}/survey`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.token },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit survey");
      }
      setNotice(`Survey findings for ${selectedLead.reference} submitted for Technical Review.`);
      setActiveModal(null);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // 4. Technical Review Decision (Check 4 - Technical Reviewer)
  async function submitReview(decision) {
    const notesInput = document.getElementById("reviewNotesInput");
    const notes = notesInput ? notesInput.value.trim() : "";
    if (decision === "return" && !notes) {
      alert("Please provide detailed correction notes when returning a survey.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/enquiries/${selectedLead.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.token },
        body: JSON.stringify({ decision, reviewNotes: notes })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Review decision failed");
      }
      setNotice(
        decision === "approve"
          ? `✓ Survey for ${selectedLead.reference} approved! Quotation gate is now UNLOCKED.`
          : `Survey for ${selectedLead.reference} returned to surveyor for corrections.`
      );
      setActiveModal(null);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // 5. Final Quotation Gate (Check 4 - Sales)
  async function generateFinalQuote() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/enquiries/${selectedLead.id}/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.token },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate quotation.");
      }
      setNotice(`✓ Final quote created and sent to customer for ${selectedLead.reference}!`);
      setActiveModal(null);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Header staff />
      <main className="staff">
        {!session ? (
          <section className="login sheet">
            <h1>Staff Sign In</h1>
            <p>Access your role-specific queue with server-enforced permissions.</p>

            {/* Quick Demo Sign In for Judges */}
            <div className="demo-pills" role="region" aria-label="Demo Role Switcher">
              <span className="demo-label">Judge / Demo Quick Login:</span>
              <div className="pill-group">
                <button
                  type="button"
                  className="role-pill"
                  disabled={busy}
                  onClick={() => loginWithCredentials("sales@photonix.example.test", "817c066fc0164ce88597866820f54f1fddca779386e847238f6c60fcb75371c2")}
                >
                  👤 Sales Adviser
                </button>
                <button
                  type="button"
                  className="role-pill"
                  disabled={busy}
                  onClick={() => loginWithCredentials("surveyor@photonix.example.test", "2c52a3a589934076acea58065b92d98799d7952ced984f219d3902a1fc205123")}
                >
                  📐 Site Surveyor
                </button>
                <button
                  type="button"
                  className="role-pill"
                  disabled={busy}
                  onClick={() => loginWithCredentials("technical_reviewer@photonix.example.test", "09538f8946804ad08504e48fc08b298acb313f5422614cb5acf389f6b58b9348")}
                >
                  🔍 Technical Reviewer
                </button>
              </div>
            </div>

            <form onSubmit={handleLogin}>
              <label>
                Work Email
                <input name="email" type="email" autoComplete="username" required placeholder="name@photonix.example.test" />
              </label>
              <label>
                Password
                <input name="password" type="password" autoComplete="current-password" required />
              </label>
              {error && <p role="alert" className="alert">{error}</p>}
              <button className="primary" disabled={busy}>
                {busy ? "Signing in…" : "Sign In with Credentials"} <span aria-hidden="true">→</span>
              </button>
            </form>
          </section>
        ) : (
          <section className="queue">
            <div className="queue-head">
              <div>
                <div className="badge-row">
                  <span className={`role-badge role-${session.role}`}>
                    {session.role === "sales" ? "Sales Adviser" : session.role === "surveyor" ? "Survey Technician" : session.role === "technical_reviewer" ? "Technical Reviewer" : session.role}
                  </span>
                  <span className="workspace-badge">{session.workspace}</span>
                </div>
                <h1>
                  {session.role === "sales"
                    ? "Sales Lead Pipeline"
                    : session.role === "surveyor"
                    ? "Assigned Site Visits"
                    : session.role === "technical_reviewer"
                    ? "Technical Survey Approvals"
                    : "Staff Workspace"}
                </h1>
                <p>
                  {session.role === "sales"
                    ? "Enquiries received from Web, WhatsApp, Phone Calls and Walk-ins."
                    : session.role === "surveyor"
                    ? "Physical roof surveys assigned to you for inspection and measurement."
                    : session.role === "technical_reviewer"
                    ? "Review roof measurements, cable runs, and enforce the final quotation gate."
                    : `Signed in to ${session.workspace}`}
                </p>
              </div>
              <div className="head-actions">
                {session.role === "sales" && (
                  <button className="primary" onClick={() => setActiveModal("assistedIntake")}>
                    + Assisted Intake
                  </button>
                )}
                <button className="secondary" onClick={() => signOut()}>
                  Sign Out
                </button>
              </div>
            </div>

            {notice && <p role="status" className="notice-banner">{notice}</p>}
            {error && <p role="alert" className="alert">{error}</p>}

            <div className="queue-panel">
              <div className="toolbar">
                <h2>
                  {ready ? `Queue Items (${rows.length})` : "Queue Items"}
                </h2>
                <button className="secondary" onClick={refresh} disabled={busy}>
                  {busy ? "Loading…" : "Refresh"}
                </button>
              </div>

              {ready && rows.length === 0 && (
                <p className="empty">No records currently assigned in this queue.</p>
              )}

              {rows.length > 0 && (
                <ul className="leads">
                  {rows.map(row => (
                    <li key={row.id ?? row.reference} className="lead-card">
                      <div className="lead-title">
                        <div className="title-left">
                          <strong>{row.customerName}</strong>
                          <code>{row.reference}</code>
                          <span className={`channel-badge ch-${row.sourceChannel}`}>
                            {row.sourceChannel.toUpperCase()}
                          </span>
                        </div>
                        <div className="status-badges">
                          <span className={`status-pill status-${row.qualificationState}`}>
                            Qual: {row.qualificationState}
                          </span>
                          <span className={`status-pill status-${row.surveyStatus}`}>
                            Survey: {row.surveyStatus}
                          </span>
                          <span className={`status-pill status-${row.quoteStatus}`}>
                            Quote: {row.quoteStatus}
                          </span>
                        </div>
                      </div>

                      <dl>
                        <div>
                          <dt>Phone</dt>
                          <dd>{row.phone}</dd>
                        </div>
                        <div>
                          <dt>Address</dt>
                          <dd>{row.address}</dd>
                        </div>
                        <div>
                          <dt>Monthly Bill & Roof</dt>
                          <dd>₹{row.monthlyBill?.toLocaleString("en-IN")} | {row.roofSpace} sq ft</dd>
                        </div>
                        <div>
                          <dt>Property & Backup</dt>
                          <dd>{row.propertyType} | {row.backupRequired}</dd>
                        </div>
                        {row.preliminaryCapacityKw > 0 && (
                          <div>
                            <dt>Prelim Capacity</dt>
                            <dd><strong>{row.preliminaryCapacityKw} kW</strong></dd>
                          </div>
                        )}
                        {row.surveyStatus === "approved" && (
                          <div className="approved-measurements">
                            <dt>Approved Measurements</dt>
                            <dd>
                              Dir: {row.roofDirection?.toUpperCase()} | Tilt: {row.roofTiltDeg}° | Area: {row.usableRoofArea} sq ft | Cable: {row.cableDistanceM}m
                            </dd>
                          </div>
                        )}
                        {row.technicalReviewNotes && (
                          <div className="need">
                            <dt>Engineer Review Notes</dt>
                            <dd className="review-quote">"{row.technicalReviewNotes}"</dd>
                          </div>
                        )}
                        <div className="need">
                          <dt>Requirement</dt>
                          <dd>{row.requirement}</dd>
                        </div>
                      </dl>

                      {/* Role Actions */}
                      <div className="card-actions">
                        {session.role === "sales" && (
                          <>
                            <button
                              className="secondary"
                              onClick={() => {
                                setSelectedLead(row);
                                setActiveModal("qualify");
                              }}
                            >
                              📞 Qualification Call (Check 2)
                            </button>
                            <button
                              className={row.surveyStatus === "approved" ? "primary" : "secondary"}
                              onClick={() => {
                                setSelectedLead(row);
                                setActiveModal("quoteGate");
                              }}
                            >
                              {row.surveyStatus === "approved" ? "✓ Final Quote (Unlocked)" : "🔒 Final Quote Gate (Check 4)"}
                            </button>
                          </>
                        )}

                        {session.role === "surveyor" && (
                          <button
                            className="primary"
                            onClick={() => {
                              setSelectedLead(row);
                              setActiveModal("surveyForm");
                            }}
                          >
                            📐 Record Survey Findings (Check 3)
                          </button>
                        )}

                        {session.role === "technical_reviewer" && (
                          <button
                            className="primary"
                            onClick={() => {
                              setSelectedLead(row);
                              setActiveModal("reviewModal");
                            }}
                          >
                            🔍 Technical Decision (Check 4)
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        {/* --- MODALS --- */}

        {/* 1. Assisted Intake Modal */}
        {activeModal === "assistedIntake" && (
          <div className="modal-backdrop">
            <div className="modal sheet">
              <div className="modal-head">
                <h2>Assisted Customer Intake</h2>
                <button className="close-btn" onClick={() => setActiveModal(null)}>✕</button>
              </div>
              <p>Record an enquiry on behalf of a customer calling, messaging on WhatsApp, or visiting.</p>
              <form onSubmit={submitAssistedIntake}>
                <div className="pair">
                  <label>
                    Intake Channel *
                    <select name="sourceChannel" defaultValue="call">
                      <option value="call">Phone Call</option>
                      <option value="whatsapp">WhatsApp Message</option>
                      <option value="walkin">Physical Walk-in</option>
                    </select>
                  </label>
                  <label>
                    Full Name *
                    <input name="customerName" required maxLength={120} placeholder="Customer name" />
                  </label>
                </div>
                <div className="pair">
                  <label>
                    Phone Number *
                    <input name="phone" type="tel" required maxLength={24} placeholder="10-digit mobile" />
                  </label>
                  <label>
                    Property Type
                    <select name="propertyType" defaultValue="residential">
                      <option value="residential">Residential</option>
                      <option value="commercial">Commercial</option>
                    </select>
                  </label>
                </div>
                <label>
                  Site Address *
                  <textarea name="address" rows="2" required minLength={3} maxLength={500} placeholder="Complete site address" />
                </label>
                <div className="pair">
                  <label>
                    Monthly Bill (₹)
                    <input name="monthlyBill" type="number" defaultValue="3000" min="0" />
                  </label>
                  <label>
                    Estimated Roof Area (sq ft)
                    <input name="roofSpace" type="number" defaultValue="400" min="0" />
                  </label>
                </div>
                <div className="pair">
                  <label>
                    Backup Required
                    <select name="backupRequired" defaultValue="essential">
                      <option value="none">None (Grid-tied)</option>
                      <option value="essential">Essential</option>
                      <option value="full">Full Backup</option>
                    </select>
                  </label>
                  <label>
                    Subsidy Interested?
                    <select name="subsidyRequested" defaultValue="true">
                      <option value="true">Yes (PM Surya Ghar)</option>
                      <option value="false">No</option>
                    </select>
                  </label>
                </div>
                <label>
                  Customer Notes & Requirement *
                  <textarea name="requirement" rows="2" required minLength={3} maxLength={2000} placeholder="Notes from conversation..." />
                </label>
                <div className="modal-actions">
                  <button type="button" className="secondary" onClick={() => setActiveModal(null)}>Cancel</button>
                  <button type="submit" className="primary" disabled={busy}>Record Enquiry</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 2. Qualification Call Modal (Check 2) */}
        {activeModal === "qualify" && selectedLead && (
          <div className="modal-backdrop">
            <div className="modal sheet">
              <div className="modal-head">
                <h2>Record Qualification Call</h2>
                <button className="close-btn" onClick={() => setActiveModal(null)}>✕</button>
              </div>
              <p>Qualify shadow-free roof area, monthly electricity bill, and grid suitability for <strong>{selectedLead.reference}</strong>.</p>
              <form onSubmit={submitQualification}>
                <div className="pair">
                  <label>
                    Grid Suitability * (Check 2)
                    <select name="gridSuitability" defaultValue={selectedLead.gridSuitability || "suitable"} required>
                      <option value="suitable">Grid Suitable (Stable AC voltage & frequency)</option>
                      <option value="voltage_unstable">Voltage Fluctuation (Needs AVR / stabilizer)</option>
                      <option value="upgrade_needed">Requires Sanction Load Upgrade from DISCOM</option>
                      <option value="unsuitable">Grid Unsuitable (No DISCOM connection / remote)</option>
                    </select>
                  </label>
                  <label>
                    Qualification Decision
                    <select name="qualificationState" defaultValue="qualified">
                      <option value="qualified">Qualified (Proceed to Technical Survey)</option>
                      <option value="unsuitable">Unsuitable / Disqualified</option>
                    </select>
                  </label>
                </div>

                <div className="pair">
                  <label>
                    Verified Shadow-Free Roof Space (sq ft)
                    <input name="roofSpace" type="number" defaultValue={selectedLead.roofSpace || 350} min="0" required />
                  </label>
                  <label>
                    Verified Monthly Electricity Bill (₹)
                    <input name="monthlyBill" type="number" defaultValue={selectedLead.monthlyBill || 2800} min="0" required />
                  </label>
                </div>

                <div className="pair">
                  <label>
                    Preliminary Sizing Recommendation (kW)
                    <input name="preliminaryCapacityKw" type="number" step="0.5" min="1" max="5" defaultValue={selectedLead.preliminaryCapacityKw || 3} required />
                  </label>
                  <label>
                    Assign Survey Technician
                    <select name="assignedSurveyorId" defaultValue={surveyors[0]?.id || ""}>
                      <option value="">-- Select Surveyor --</option>
                      {surveyors.map(s => (
                        <option key={s.id} value={s.id}>{s.email}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <label>
                  Qualification Call Notes
                  <textarea name="qualificationNotes" rows="2" defaultValue={selectedLead.qualificationNotes || ""} placeholder="Customer confirms southern unshaded terrace, DISCOM 3-phase connection..." />
                </label>

                <div className="modal-actions">
                  <button type="button" className="secondary" onClick={() => setActiveModal(null)}>Cancel</button>
                  <button type="submit" className="primary" disabled={busy}>Save Qualification & Assign Survey</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 3. Surveyor Measurement Form Modal (Check 3) */}
        {activeModal === "surveyForm" && selectedLead && (
          <div className="modal-backdrop">
            <div className="modal sheet">
              <div className="modal-head">
                <h2>Physical Survey Findings</h2>
                <button className="close-btn" onClick={() => setActiveModal(null)}>✕</button>
              </div>
              <p>Record on-site findings for roof direction, tilt, usable space, and cable run for <strong>{selectedLead.reference}</strong>.</p>
              <form onSubmit={submitSurvey}>
                <div className="pair">
                  <label>
                    Roof Direction * (Check 3)
                    <select name="roofDirection" defaultValue={selectedLead.roofDirection || "south"} required>
                      <option value="south">South (Optimal azimuth 180°)</option>
                      <option value="south_west">South-West</option>
                      <option value="south_east">South-East</option>
                      <option value="east">East</option>
                      <option value="west">West</option>
                      <option value="north">North (Sub-optimal)</option>
                    </select>
                  </label>
                  <label>
                    Roof Tilt Angle (Degrees) * (Check 3)
                    <input name="roofTiltDeg" type="number" step="1" min="0" max="90" defaultValue={selectedLead.roofTiltDeg || 22} required />
                  </label>
                </div>

                <div className="pair">
                  <label>
                    Usable Measured Roof Area (sq ft) *
                    <input name="usableRoofArea" type="number" min="10" defaultValue={selectedLead.usableRoofArea || selectedLead.roofSpace || 320} required />
                  </label>
                  <label>
                    Cable Run Distance to Inverter/Meter (m) * (Check 3)
                    <input name="cableDistanceM" type="number" step="0.5" min="1" max="200" defaultValue={selectedLead.cableDistanceM || 18} required />
                  </label>
                </div>

                <label>
                  Roof Structure / Material
                  <select name="roofType" defaultValue={selectedLead.roofType || "rcc_flat"}>
                    <option value="rcc_flat">RCC Concrete Flat Roof</option>
                    <option value="tin_shed">Industrial Tin / Metal Sheet</option>
                    <option value="tiled_pitched">Clay Tiled Pitched Roof</option>
                    <option value="asbestos">Asbestos Sheet</option>
                    <option value="other">Other</option>
                  </select>
                </label>

                <label>
                  Shading Obstructions & Notes
                  <textarea name="surveyNotes" rows="2" defaultValue={selectedLead.surveyNotes || ""} placeholder="Parapet wall 3 ft on north side. No chimney or tree shadow. Standard earthing pit feasible in backyard." />
                </label>

                <div className="modal-actions">
                  <button type="button" className="secondary" onClick={() => setActiveModal(null)}>Cancel</button>
                  <button type="submit" className="primary" disabled={busy}>Submit for Technical Review</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 4. Technical Review Decision Modal (Check 4) */}
        {activeModal === "reviewModal" && selectedLead && (
          <div className="modal-backdrop">
            <div className="modal sheet">
              <div className="modal-head">
                <h2>Technical Survey Review & Gate Decision</h2>
                <button className="close-btn" onClick={() => setActiveModal(null)}>✕</button>
              </div>
              <p>Review the surveyor's physical measurements for <strong>{selectedLead.reference}</strong>.</p>

              <div className="review-findings-card">
                <h3>Surveyor's Submitted Findings:</h3>
                <div className="findings-grid">
                  <div><small>Roof Direction:</small> <strong>{selectedLead.roofDirection?.toUpperCase() || "N/A"}</strong></div>
                  <div><small>Roof Tilt:</small> <strong>{selectedLead.roofTiltDeg}°</strong></div>
                  <div><small>Measured Usable Area:</small> <strong>{selectedLead.usableRoofArea} sq ft</strong></div>
                  <div><small>Cable Distance:</small> <strong>{selectedLead.cableDistanceM} meters</strong></div>
                  <div><small>Roof Type:</small> <span>{selectedLead.roofType}</span></div>
                  <div><small>Survey Notes:</small> <span>{selectedLead.surveyNotes || "None"}</span></div>
                </div>
              </div>

              <label style={{ marginTop: "16px" }}>
                Engineer Review Remarks / Reason for Return:
                <textarea
                  id="reviewNotesInput"
                  rows="2"
                  defaultValue={selectedLead.technicalReviewNotes || ""}
                  placeholder="Approve: 'Verified azimuth and tilt. Cable run within acceptable DC voltage drop.' Or Return: 'Cable distance seems low for 4-story building, please re-measure.'"
                />
              </label>

              <div className="review-action-buttons">
                <button
                  type="button"
                  className="secondary danger-btn"
                  disabled={busy}
                  onClick={() => submitReview("return")}
                >
                  ↩ Return for Correction
                </button>
                <button
                  type="button"
                  className="primary"
                  disabled={busy}
                  onClick={() => submitReview("approve")}
                >
                  ✓ Approve Survey (Unlock Quote Gate)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 5. Final Quotation Gate Modal (Check 4) */}
        {activeModal === "quoteGate" && selectedLead && (
          <div className="modal-backdrop">
            <div className="modal sheet">
              <div className="modal-head">
                <h2>Final Quotation Gate (Acceptance Check 4)</h2>
                <button className="close-btn" onClick={() => setActiveModal(null)}>✕</button>
              </div>

              {selectedLead.surveyStatus !== "approved" ? (
                <div className="gate-locked-banner" role="alert">
                  <div className="lock-icon">🔒</div>
                  <div>
                    <h3>Quotation Creation Locked by Server Policy</h3>
                    <p>
                      <strong>Acceptance Check 4 Rule:</strong> A quote can be created and sent to the customer
                      <strong> only after technical survey approval</strong>.
                    </p>
                    <p className="gate-state-info">
                      Current Survey Status: <code>{selectedLead.surveyStatus}</code>
                    </p>
                    {selectedLead.surveyStatus === "changes_requested" && (
                      <p className="return-note">
                        ⚠️ <strong>Engineer Reason:</strong> "{selectedLead.technicalReviewNotes}"
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="gate-unlocked-banner">
                  <div className="unlocked-icon">✓</div>
                  <div>
                    <h3>Survey Approved — Quotation Unlocked</h3>
                    <p>
                      Technical findings approved by engineering. You may now generate and send the final quote.
                    </p>
                  </div>
                </div>
              )}

              {selectedLead.surveyStatus === "approved" && (
                <div className="quote-preview-card">
                  <h3>SolarFit quotation</h3>
                  <p>The approved roof measurements and electricity bill determine the eligible packages. Demo catalogue prices apply.</p>
                  {selectedLead.quoteDetails && <p>{selectedLead.quoteDetails.packageId} · ₹{selectedLead.quoteDetails.grossPrice?.toLocaleString("en-IN")} before estimated subsidy</p>}
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="secondary" onClick={() => setActiveModal(null)}>Close</button>
                {selectedLead.surveyStatus === "approved" && (
                  <button type="button" className="primary" disabled={busy} onClick={generateFinalQuote}>
                    Generate & Send Quote to Customer →
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
