import { PublicHeader, PublicFooter } from "../../components/PublicShell";
import "../components.css";
import "../public.css";

export const metadata = { title: "Solutions — on-grid and off-grid systems" };

export default function SolutionsLayout({ children }) {
  return (
    <div className="pub-layout">
      <PublicHeader />
      <main className="pub-main">{children}</main>
      <PublicFooter />
    </div>
  );
}
