import { useState } from "react";
import Link from "next/link";
import { Ruler, Layers, Wrench, ShieldCheck, ArrowUpRight } from "lucide-react";
import styles from "./Journey.module.css";

const stages = [
  { name: "Survey", icon: Ruler, title: "Measure the roof", text: "Share your electricity usage and roof details. A surveyor checks the site before the team prepares a final quote.", href: "/enquiry", action: "Start an enquiry" },
  { name: "Quote", icon: Layers, title: "Compare the system", text: "Explore solar packages, equipment and indicative costs. Your team uses the approved survey to prepare your quotation.", href: "/solutions", action: "Explore solar systems" },
  { name: "Install", icon: Wrench, title: "Follow the installation", text: "The warehouse prepares equipment and the crew records installation work. Use your private tracking code to follow your project.", href: "/track", action: "Track a project" },
  { name: "Care", icon: ShieldCheck, title: "Check your warranty", text: "The equipment serial number connects an installed panel to its warranty record. Look it up when you need support.", href: "/warranty", action: "Check a warranty" }
];

export default function Journey() {
  const [index, select] = useState(0);
  const stage = stages[index];
  const Icon = stage.icon;
  return <section className={styles.board} aria-label="Explore the installation workflow">
    <header className={styles.bar}><span><img src="/brand/photonix-emblem.webp" alt="" width="24" height="24"/>Your solar project</span></header>
    <div className={styles.scene} key={stage.name} aria-hidden="true">
      <span className={styles.tool}><Icon size={26}/></span>
    </div>
    <div className={styles.controls} aria-label="Project stages" role="group">
      {stages.map((item,i)=><button key={item.name} type="button" aria-pressed={index===i} onClick={()=>select(i)}>{item.name}</button>)}
    </div>
    <div className={styles.detail} aria-live="polite"><small>{["Site surveyor","Sales adviser","Installation crew","Service team"][index]}</small><h2>{stage.title}</h2><p>{stage.text}</p>
      <Link href={stage.href}>{stage.action} <ArrowUpRight size={16}/></Link>
    </div>
  </section>;
}
