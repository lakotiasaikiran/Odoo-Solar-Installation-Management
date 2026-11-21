"use client";
import { useState } from "react";
import Intake from "./intake";
import { Header } from "./shell";

export default function Home() {
  const [activeTab, setActiveTab] = useState("intake");
  const [searchRef, setSearchRef] = useState("");
  const [trackingData, setTrackingData] = useState(null);
  const [trackError, setTrackError] = useState("");
  const [trackBusy, setTrackBusy] = useState(false);

  async function handleTrack(ref) {
    const target = (ref || searchRef).trim().toUpperCase();
    if (!target) return;
    setTrackBusy(true);
    setTrackError("");
    setTrackingData(null);
    try {
      const [reference,code]=target.split('.');
      const res=await fetch('/api/enquiries/track/'+encodeURIComponent(reference),{headers:{'X-Tracking-Code':code||''}});
      if (!res.ok) {
        throw new Error(res.status === 404 ? "Enquiry reference not found. Check the reference code." : "Tracking service temporarily unavailable.");
      }
      const data = await res.json();
      setTrackingData(data);
      setActiveTab("track");
    } catch (e) {
      setTrackError(e.message);
      setActiveTab("track");
    } finally {
      setTrackBusy(false);
    }
  }

  return (
    <>
      <div className="home-tabs-bar">
        <div className="tabs-container">
          <button
            className={`tab-btn ${activeTab === "intake" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("intake")}
          >
            ☀️ Solar Enquiry
          </button>
          <button
            className={`tab-btn ${activeTab === "track" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("track")}
          >
            🔍 Track Installation
          </button>
          <button
            className={`tab-btn ${activeTab === "guide" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("guide")}
          >
            📖 PM Surya Ghar & Solar Guide
          </button>
        </div>
      </div>

      {activeTab === "intake" && (
        <Intake
          onTrackReference={ref => {
            setSearchRef(ref);
            handleTrack(ref);
          }}
        />
      )}

      {activeTab === "track" && (
        <>
          <Header />
          <main className="customer" style={{ display: "block" }}>
            <section className="sheet tracker-card">
              <h2>Track Your Solar Installation</h2>
              <p>Paste the full private tracking code from your enquiry receipt.</p>

              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleTrack(searchRef);
                }}
                className="track-form"
              >
                <input
                  value={searchRef}
                  onChange={e => setSearchRef(e.target.value.toUpperCase())}
                  placeholder="Private tracking code"
                  required
                  maxLength={64}
                />
                <button className="primary" disabled={trackBusy}>
                  {trackBusy ? "Searching…" : "Track Progress"}
                </button>
              </form>

              {trackError && <p role="alert" className="alert" style={{ marginTop: "16px" }}>{trackError}</p>}

              {trackingData && (
                <div className="track-result" style={{ marginTop: "28px" }}>
                  <div className="track-head">
                    <div>
                      <small>Booking Reference</small>
                      <h3>{trackingData.reference}</h3>
                    </div>
                    <span className="customer-tag">{trackingData.customerName}</span>
                  </div>

                  {/* Visual Progress Stepper */}
                  <div className="stepper">
                    <div className="step-item step-done">
                      <div className="step-circle">✓</div>
                      <div className="step-label">Enquiry Logged</div>
                      <small>Received via {trackingData.sourceChannel?.toUpperCase()}</small>
                    </div>

                    <div className={`step-item ${trackingData.qualificationState === "qualified" ? "step-done" : trackingData.qualificationState === "unsuitable" ? "step-fail" : "step-active"}`}>
                      <div className="step-circle">{trackingData.qualificationState === "qualified" ? "✓" : trackingData.qualificationState === "unsuitable" ? "✕" : "2"}</div>
                      <div className="step-label">Sales Qualified</div>
                      <small>{trackingData.qualificationState === "qualified" ? `Approved (~${trackingData.preliminaryCapacityKw || 3} kW)` : trackingData.qualificationState === "unsuitable" ? "Site Unsuitable" : "Call In Progress"}</small>
                    </div>

                    <div className={`step-item ${["submitted", "approved"].includes(trackingData.surveyStatus) ? "step-done" : trackingData.surveyStatus === "assigned" ? "step-active" : "step-pending"}`}>
                      <div className="step-circle">{["submitted", "approved"].includes(trackingData.surveyStatus) ? "✓" : "3"}</div>
                      <div className="step-label">Site Survey</div>
                      <small>{trackingData.surveyStatus === "approved" ? "Survey Completed" : trackingData.surveyStatus === "submitted" ? "Findings Recorded" : trackingData.surveyStatus === "assigned" ? "Technician Assigned" : "Pending"}</small>
                    </div>

                    <div className={`step-item ${trackingData.surveyStatus === "approved" ? "step-done" : trackingData.surveyStatus === "changes_requested" ? "step-warn" : "step-pending"}`}>
                      <div className="step-circle">{trackingData.surveyStatus === "approved" ? "✓" : "4"}</div>
                      <div className="step-label">Engineer Approval</div>
                      <small>{trackingData.surveyStatus === "approved" ? "Approved by Reviewer" : trackingData.surveyStatus === "changes_requested" ? "Re-inspection Needed" : "Awaiting Review"}</small>
                    </div>

                    <div className={`step-item ${trackingData.quoteStatus === "sent" ? "step-done" : trackingData.quoteStatus === "draft" ? "step-active" : "step-pending"}`}>
                      <div className="step-circle">{trackingData.quoteStatus === "sent" ? "✓" : "5"}</div>
                      <div className="step-label">Final Quotation</div>
                      <small>{trackingData.quoteStatus === "sent" ? "Quote Dispatched" : trackingData.quoteStatus === "draft" ? "Ready for Release" : "Locked (Survey Pending)"}</small>
                    </div>
                  </div>

                  {/* Quotation Details if Sent */}
                  {trackingData.quoteStatus === "sent" && trackingData.quoteDetails && (
                    <div className="customer-quote-card">
                      <h3>Your Custom Rooftop Solar Proposal</h3>
                      <p>Capacity: <strong>{trackingData.quoteDetails.capacityKw} kW System</strong> ({trackingData.quoteDetails.panelCount} Solar Panels)</p>
                      <div className="pricing-table">
                        <div className="price-item">
                          <span>Gross Installation Price:</span>
                          <strong>₹{trackingData.quoteDetails.grossPrice?.toLocaleString("en-IN")}</strong>
                        </div>
                        <div className="price-item subsidy-item">
                          <span>PM Surya Ghar Direct Subsidy:</span>
                          <strong>- ₹{trackingData.quoteDetails.estimatedSubsidy?.toLocaleString("en-IN")}</strong>
                        </div>
                        <hr />
                        <div className="price-item final-item">
                          <span>Your Effective Payable Amount:</span>
                          <strong className="final-price">₹{trackingData.quoteDetails.netEffectiveCost?.toLocaleString("en-IN")}</strong>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="track-details">
                    <p><strong>Installation Address:</strong> {trackingData.address}</p>
                    <p><strong>Your Requirement:</strong> {trackingData.requirement}</p>
                  </div>
                </div>
              )}
            </section>
          </main>
        </>
      )}

      {activeTab === "guide" && (
        <>
          <Header />
          <main className="customer" style={{ display: "block" }}>
            <section className="sheet guide-card">
              <h2>PM Surya Ghar Muft Bijli Yojana & Solar Guide</h2>
              <p>Government of India initiative providing up to <strong>₹78,000 direct bank transfer subsidy</strong> for residential rooftop solar installations.</p>

              <div className="subsidy-tiers">
                <h3>Official Residential Subsidy Structure</h3>
                <div className="tiers-grid">
                  <div className="tier-card">
                    <h4>1 kW System</h4>
                    <div className="tier-subsidy">₹30,000 Subsidy</div>
                    <p>Ideal for 1-2 BHK with ~120 units monthly consumption.</p>
                    <ul>
                      <li>Required Roof: ~100 sq ft</li>
                      <li>Monthly Savings: ~₹960</li>
                    </ul>
                  </div>
                  <div className="tier-card">
                    <h4>2 kW System</h4>
                    <div className="tier-subsidy">₹60,000 Subsidy</div>
                    <p>Ideal for 2-3 BHK with ~240 units monthly consumption.</p>
                    <ul>
                      <li>Required Roof: ~200 sq ft</li>
                      <li>Monthly Savings: ~₹1,920</li>
                    </ul>
                  </div>
                  <div className="tier-card tier-highlight">
                    <div className="badge-pop">Most Popular</div>
                    <h4>3 kW to 5 kW</h4>
                    <div className="tier-subsidy">₹78,000 Max Subsidy</div>
                    <p>Zero electricity bills for homes with air conditioning and refrigerators.</p>
                    <ul>
                      <li>Required Roof: ~300+ sq ft</li>
                      <li>Monthly Savings: ~₹2,880 - ₹4,800</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="tech-comparison" style={{ marginTop: "32px" }}>
                <h3>On-Grid vs Off-Grid Systems: Understanding the Difference</h3>
                <div className="pair">
                  <div className="system-box">
                    <h4>On-Grid (Grid-Tied) System</h4>
                    <p>Connected directly to your local electricity grid (DISCOM) via a bi-directional Net Meter.</p>
                    <ul>
                      <li><strong>Pros:</strong> Highest return on investment, lowest cost, eligible for maximum government subsidies. Surplus solar energy exported to grid reduces bill to zero.</li>
                      <li><strong>Cons:</strong> Automatically powers off during grid power cuts for worker safety (anti-islanding).</li>
                      <li><strong>Best For:</strong> Areas with reliable grid supply wanting minimum power bills.</li>
                    </ul>
                  </div>
                  <div className="system-box">
                    <h4>Off-Grid (Battery Storage) System</h4>
                    <p>Stores generated solar electricity in high-capacity solar batteries for 24/7 backup power.</p>
                    <ul>
                      <li><strong>Pros:</strong> Independent power supply even during prolonged grid blackouts. Powers essential appliances day and night.</li>
                      <li><strong>Cons:</strong> Higher upfront cost due to battery bank; batteries need replacement after 5-8 years.</li>
                      <li><strong>Best For:</strong> Locations with frequent load shedding or rural installations.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>
          </main>
        </>
      )}
    </>
  );
}
