import Link from "next/link";

export function Mark() {
  return <span className="mark" aria-hidden="true"><i /><i /><i /></span>;
}

export function Header({ staff = false, hindi = false, onLanguageChange }) {
  return <header><div className="bar">
    <Link href="/" className="brand" aria-label="Photonix home"><Mark />Photonix</Link>
    <nav aria-label={hindi ? "नेविगेशन" : "Main navigation"}>
      {onLanguageChange && <button type="button" className="language" onClick={onLanguageChange} lang={hindi ? "en" : "hi"} aria-label={hindi ? "Switch to English" : "हिन्दी में देखें"}>{hindi ? "English" : "हिन्दी"}</button>}
      <Link className="navlink" href={staff ? "/" : "/staff"}>{staff ? "Customer enquiry" : (hindi ? "कर्मचारी लॉगिन" : "Staff sign in")} <span aria-hidden="true">↗</span></Link>
    </nav>
  </div></header>;
}
