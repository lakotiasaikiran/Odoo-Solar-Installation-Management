import { PublicHeader, PublicFooter } from "../../components/PublicShell";
import "../components.css";
import "../public.css";

export const metadata = { title: "Track your project" };

export default function TrackLayout({ children }) {
  return (
    <div className="pub-layout">
      <PublicHeader />
      <main className="pub-main">{children}</main>
      <PublicFooter />
    </div>
  );
}
