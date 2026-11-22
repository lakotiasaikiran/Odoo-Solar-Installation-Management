import { PublicHeader, PublicFooter } from "../../components/PublicShell";
import "../components.css";
import "../public.css";

export const metadata = { title: "PM Surya Ghar subsidy guide" };

export default function SubsidyLayout({ children }) {
  return (
    <div className="pub-layout">
      <PublicHeader />
      <main className="pub-main">{children}</main>
      <PublicFooter />
    </div>
  );
}
