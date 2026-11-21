"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import { Header } from "./shell";
import { requestKey, clearKey } from "../lib/receipt.mjs";

const copy = {
  en: {
    title: "Rooftop Solar Enquiry",
    intro: "Empowering homes and businesses across India with clean, affordable rooftop solar under PM Surya Ghar Muft Bijli Yojana.",
    flow: "Installation Journey",
    steps: [
      "1. Quick enquiry & solar sizing",
      "2. Sales qualification call",
      "3. Physical technical roof survey",
      "4. Independent engineer approval",
      "5. Transparent final quotation",
      "6. Subsidy filing & installation"
    ],
    details: "Your Property & Energy Needs",
    name: "Full Name",
    phone: "Phone Number (WhatsApp preferred)",
    address: "Installation Address & Pincode",
    propType: "Property Type",
    residential: "Residential Home",
    commercial: "Commercial / Industrial",
    bill: "Average Monthly Electricity Bill (₹)",
    roof: "Approximate Available Roof Space (sq ft)",
    backup: "Power Backup Requirement",
    backupNone: "Grid-tied only (No battery backup)",
    backupEssential: "Essential Backup (Fans, lights, Wi-Fi, fridge)",
    backupFull: "Full Backup (Air conditioners, water pumps)",
    subsidy: "Apply for PM Surya Ghar Govt Subsidy?",
    subsidyYes: "Yes, include PM Surya Ghar subsidy",
    subsidyNo: "No subsidy required",
    budget: "Estimated Budget (₹ optional)",
    payment: "Preferred Payment Method",
    payMilestone: "Milestone-based (Advance, Delivery, Commissioning)",
    payLoan: "Solar Bank Loan / Low-cost EMI",
    payCash: "Direct Upfront Payment",
    need: "Specific Requirements or Questions",
    prompt: "E.g., 3-story independent house in Pune, RCC roof with partial tree shade on eastern side.",
    submit: "Submit Solar Enquiry",
    wait: "Verifying & submitting…",
    next: "Submit Another Enquiry",
    success: "Enquiry Received Successfully!",
    ref: "Your Booking Reference",
    confirm: "Keep this reference. A dedicated Photonix solar advisor will call you within 2 business hours for technical qualification.",
    calcHeading: "Preliminary SolarFit Sizing",
    calcSize: "Recommended System Size",
    calcSavings: "Est. Monthly Electricity Savings",
    calcSubsidy: "Est. Govt Subsidy (PM Surya Ghar)",
    calcSpace: "Required Roof Space",
    error: "Your enquiry could not be confirmed. Check your connection and try again.",
    invalid: "Please check your full name, phone number (7-15 digits), address and requirements.",
    slow: "Too many requests. Please wait a moment before trying again.",
    trackBtn: "Track This Enquiry →"
  },
  hi: {
    title: "रूफटॉप सोलर पूछताछ",
    intro: "पीएम सूर्य घर मुफ़्त बिजली योजना के तहत स्वच्छ, सस्ती और भरोसेमंद सोलर ऊर्जा। अपनी बिजली का बिल शून्य करें।",
    flow: "सोलर स्थापना के चरण",
    steps: [
      "1. पूछताछ एवं सोलर क्षमता का अनुमान",
      "2. सलाहकार द्वारा तकनीकी योग्यता कॉल",
      "3. छत का भौतिक तकनीकी सर्वे",
      "4. स्वतंत्र इंजीनियर द्वारा सर्वे की मंजूरी",
      "5. पारदर्शी अंतिम कोटेशन",
      "6. सरकारी सब्सिडी एवं इंस्टॉलेशन"
    ],
    details: "आपकी संपत्ति और बिजली की आवश्यकता",
    name: "पूरा नाम",
    phone: "फ़ोन नंबर (व्हाट्सएप नंबर)",
    address: "स्थापना का पूरा पता और पिनकोड",
    propType: "संपत्ति का प्रकार",
    residential: "आवासीय मकान (घर)",
    commercial: "व्यावसायिक / दुकान / उद्योग",
    bill: "औसत मासिक बिजली का बिल (₹)",
    roof: "उपलब्ध छत का क्षेत्रफल (वर्ग फीट)",
    backup: "पावर बैकअप की आवश्यकता",
    backupNone: "केवल ऑन-ग्रिड (बैटरी की ज़रूरत नहीं)",
    backupEssential: "आवश्यक बैकअप (पंखा, लाइट, फ्रिज, टीवी)",
    backupFull: "पूरा बैकअप (एसी, सबमर्सिबल पंप आदि)",
    subsidy: "क्या पीएम सूर्य घर सरकारी सब्सिडी चाहिए?",
    subsidyYes: "हाँ, सरकारी सब्सिडी शामिल करें",
    subsidyNo: "सब्सिडी की आवश्यकता नहीं",
    budget: "अनुमानित बजट (₹ वैकल्पिक)",
    payment: "भुगतान का पसंदीदा तरीका",
    payMilestone: "चरणबद्ध भुगतान (अग्रिम, डिलीवरी, चालू होने पर)",
    payLoan: "सोलर बैंक लोन / आसान मासिक किस्त (EMI)",
    payCash: "एकमुश्त भुगतान",
    need: "अतिरिक्त जानकारी या प्रश्न",
    prompt: "उदाहरण: पुणे में 3 मंजिला स्वतंत्र मकान, आरसीसी छत, पूर्व दिशा में पेड़ की छाया।",
    submit: "पूछताछ दर्ज करें",
    wait: "सत्यापित किया जा रहा है…",
    next: "दूसरी पूछताछ भेजें",
    success: "पूछताछ सफलतापूर्वक दर्ज हुई!",
    ref: "आपका बुकिंग संदर्भ नंबर (Reference)",
    confirm: "यह संदर्भ नंबर सुरक्षित रखें। फोटोनिक्स का सोलर सलाहकार 2 कार्य घंटों के भीतर आपसे संपर्क करेगा।",
    calcHeading: "सोलरफिट प्रारंभिक क्षमता अनुमान",
    calcSize: "अनुशंसित सोलर क्षमता",
    calcSavings: "अनुमानित मासिक बिजली बचत",
    calcSubsidy: "अनुमानित सरकारी सब्सिडी (पीएम सूर्य घर)",
    calcSpace: "आवश्यक छत का क्षेत्रफल",
    error: "पूछताछ दर्ज नहीं हो सकी। कृपया इंटरनेट कनेक्शन जांचें और पुनः प्रयास करें।",
    invalid: "कृपया नाम, फ़ोन नंबर (7-15 अंक), पता और आवश्यकता की सही जानकारी भरें।",
    slow: "कई अनुरोध प्राप्त हुए हैं। कृपया कुछ समय बाद पुनः प्रयास करें।",
    trackBtn: "इस पूछताछ की स्थिति देखें →"
  }
};

function getStorage() {
  try { return window.sessionStorage; } catch { return null; }
}

export default function Intake({ onTrackReference }) {
  const [language, setLanguage] = useState("en");
  const [receipt, setReceipt] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Sizing preview states
  const [billVal, setBillVal] = useState(2500);
  const [roofVal, setRoofVal] = useState(300);

  const keyCache = useRef(null);
  const inFlight = useRef(false);
  const heading = useRef(null);
  const text = copy[language];

  useEffect(() => {
    document.documentElement.lang = language;
    return () => { document.documentElement.lang = "en"; };
  }, [language]);

  useEffect(() => {
    if (receipt) heading.current?.focus();
  }, [receipt]);

  // SolarFit preliminary sizing calculation
  const recommendation = useMemo(() => {
    const bill = Math.max(0, Number(billVal) || 0);
    const roof = Math.max(0, Number(roofVal) || 0);
    // Typical Indian domestic tariff ~ ₹8/unit (kWh)
    const unitsPerMonth = bill / 8;
    const dailyUnits = unitsPerMonth / 30;
    // 1 kW produces ~4 units/day in India
    let idealKw = Math.round((dailyUnits / 4) * 2) / 2;
    if (idealKw < 1) idealKw = 1;
    if (idealKw > 5) idealKw = 5;

    // Roof constraint: ~100 sq ft shadow-free space per 1 kW
    const maxRoofKw = Math.max(1, Math.floor(roof / 100));
    const finalKw = Math.min(idealKw, Math.max(1, maxRoofKw));

    // PM Surya Ghar subsidy rules: 1kW=₹30,000, 2kW=₹60,000, 3kW+=₹78,000
    const subsidy = finalKw >= 3 ? 78000 : finalKw >= 2 ? 60000 : 30000;
    const monthlySavings = Math.round(finalKw * 4 * 30 * 8);
    const spaceNeeded = finalKw * 100;

    return { kw: finalKw, subsidy, monthlySavings, spaceNeeded };
  }, [billVal, roofVal]);

  async function submit(event) {
    event.preventDefault();
    if (inFlight.current) return;
    const values = new FormData(event.currentTarget);

    const payload = {
      customerName: String(values.get("customerName") ?? "").trim(),
      phone: String(values.get("phone") ?? "").trim(),
      address: String(values.get("address") ?? "").trim(),
      requirement: String(values.get("requirement") ?? "").trim(),
      propertyType: String(values.get("propertyType") ?? "residential"),
      monthlyBill: Number(values.get("monthlyBill")) || 0,
      roofSpace: Number(values.get("roofSpace")) || 0,
      backupRequired: String(values.get("backupRequired") ?? "essential"),
      subsidyRequested: values.get("subsidyRequested") === "true",
      budget: Number(values.get("budget")) || 0,
      paymentMethod: String(values.get("paymentMethod") ?? "milestone"),
      sourceChannel: "web"
    };

    if (
      !payload.customerName ||
      !/^[+0-9 ()-]{7,24}$/.test(payload.phone) ||
      !/^\d{7,15}$/.test(payload.phone.replace(/\D/g, "")) ||
      payload.address.length < 3 ||
      payload.requirement.length < 3
    ) {
      setError("invalid");
      return;
    }

    inFlight.current = true;
    setBusy(true);
    setError("");

    try {
      const idempotencyKey = await requestKey(payload, getStorage(), keyCache, window.crypto);
      const result = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, idempotencyKey }),
        signal: AbortSignal.timeout(30000)
      });

      if (!result.ok) {
        setError(result.status === 400 ? "invalid" : result.status === 429 ? "slow" : "error");
        return;
      }
      const data = await result.json();
      if (!data.reference) throw new Error("Missing receipt");
      setReceipt([data.reference,data.trackingCode].join("."));
      clearKey(getStorage(), keyCache);
    } catch {
      setError("error");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <>
      <Header hindi={language === "hi"} onLanguageChange={() => setLanguage(language === "en" ? "hi" : "en")} />
      <main className="customer">
        <aside className="intro">
          <div className="roof" aria-hidden="true" />
          <div className="intro-content">
            <h1>{text.title}</h1>
            <p>{text.intro}</p>

            <div className="calc-card" role="region" aria-label={text.calcHeading}>
              <h3>{text.calcHeading}</h3>
              <div className="calc-metric">
                <span className="metric-label">{text.calcSize}</span>
                <strong className="metric-val">{recommendation.kw} kW</strong>
              </div>
              <div className="calc-grid">
                <div>
                  <small>{text.calcSavings}</small>
                  <strong>₹{recommendation.monthlySavings.toLocaleString("en-IN")}/mo</strong>
                </div>
                <div>
                  <small>{text.calcSubsidy}</small>
                  <strong className="subsidy-badge">₹{recommendation.subsidy.toLocaleString("en-IN")}</strong>
                </div>
                <div>
                  <small>{text.calcSpace}</small>
                  <span>~{recommendation.spaceNeeded} sq ft</span>
                </div>
              </div>
            </div>

            <section className="steps">
              <h2>{text.flow}</h2>
              <ol>
                {text.steps.map(s => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </section>
          </div>
        </aside>

        <section className="sheet">
          {receipt ? (
            <div className="receipt" role="status">
              <span className="check" aria-hidden="true">✓</span>
              <h2 tabIndex="-1" ref={heading}>{text.success}</h2>
              <p>{text.confirm}</p>
              <div className="reference">
                <small>{text.ref}</small>
                <strong>{receipt}</strong>
              </div>
              <div className="action-row">
                {onTrackReference && (
                  <button className="primary" onClick={() => onTrackReference(receipt)}>
                    {text.trackBtn}
                  </button>
                )}
                <button className="secondary" onClick={() => { setReceipt(""); setError(""); }}>
                  {text.next}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={submit}>
              <h2>{text.details}</h2>

              <div className="pair">
                <label>
                  {text.name} *
                  <input name="customerName" autoComplete="name" required maxLength={120} placeholder="e.g. Rajesh Kumar" />
                </label>
                <label>
                  {text.phone} *
                  <input name="phone" type="tel" autoComplete="tel" required maxLength={24} placeholder="e.g. 9876543210" />
                </label>
              </div>

              <label>
                {text.address} *
                <textarea name="address" autoComplete="street-address" rows="2" required minLength={3} maxLength={500} placeholder="Street, Landmark, City, State, PIN" />
              </label>

              <div className="pair">
                <label>
                  {text.propType}
                  <select name="propertyType" defaultValue="residential">
                    <option value="residential">{text.residential}</option>
                    <option value="commercial">{text.commercial}</option>
                  </select>
                </label>
                <label>
                  {text.backup}
                  <select name="backupRequired" defaultValue="essential">
                    <option value="none">{text.backupNone}</option>
                    <option value="essential">{text.backupEssential}</option>
                    <option value="full">{text.backupFull}</option>
                  </select>
                </label>
              </div>

              <div className="pair">
                <label>
                  {text.bill}
                  <input
                    name="monthlyBill"
                    type="number"
                    min="500"
                    max="100000"
                    step="100"
                    value={billVal}
                    onChange={e => setBillVal(e.target.value)}
                    required
                  />
                </label>
                <label>
                  {text.roof}
                  <input
                    name="roofSpace"
                    type="number"
                    min="50"
                    max="10000"
                    step="10"
                    value={roofVal}
                    onChange={e => setRoofVal(e.target.value)}
                    required
                  />
                </label>
              </div>

              <div className="pair">
                <label>
                  {text.subsidy}
                  <select name="subsidyRequested" defaultValue="true">
                    <option value="true">{text.subsidyYes}</option>
                    <option value="false">{text.subsidyNo}</option>
                  </select>
                </label>
                <label>
                  {text.payment}
                  <select name="paymentMethod" defaultValue="milestone">
                    <option value="milestone">{text.payMilestone}</option>
                    <option value="loan_emi">{text.payLoan}</option>
                    <option value="cash">{text.payCash}</option>
                  </select>
                </label>
              </div>

              <label>
                {text.budget}
                <input name="budget" type="number" min="0" step="5000" placeholder="e.g. 150000" />
              </label>

              <label>
                {text.need} *
                <textarea name="requirement" rows="3" required minLength={3} maxLength={2000} placeholder={text.prompt} />
              </label>

              {error && <p role="alert" className="alert">{text[error]}</p>}
              <button className="primary" disabled={busy}>
                {busy ? text.wait : text.submit} <span aria-hidden="true">→</span>
              </button>
            </form>
          )}
        </section>
      </main>
    </>
  );
}
