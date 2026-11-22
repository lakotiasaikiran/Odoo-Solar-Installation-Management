import { PublicHeader, PublicFooter } from "../../components/PublicShell";
import "../components.css";
import "../public.css";

export const metadata = { title: "Solar enquiry" };

export default function EnquiryLayout({ children }) {
  return (
    <div className="pub-layout">
      <PublicHeader />
      <main className="pub-main">{children}</main>
      <PublicFooter />
    </div>
  );
}
