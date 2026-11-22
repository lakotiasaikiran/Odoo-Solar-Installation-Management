"use client";
import { useEffect, useState } from "react";
import { DataTable } from "../../../components/ui";

const columns = [
  {key:"recorded_at",label:"Recorded",render:r=>new Date(r.recorded_at).toLocaleString("en-IN")},
  {key:"customer",label:"Customer"},
  {key:"invoice",label:"Invoice"},
  {key:"method",label:"Method"},
  {key:"amount",label:"Received",render:r=>Number(r.amount).toLocaleString("en-IN",{style:"currency",currency:"INR"})},
  {key:"id",label:"Receipt reference"}
];

export default function Transactions() {
  const [rows,setRows]=useState(null);
  const [error,setError]=useState("");
  useEffect(()=>{
    const controller=new AbortController();
    async function load(){
      try {
        const response=await fetch("/api/finance/overview",{signal:controller.signal,headers:{Authorization:"Bearer "+sessionStorage.getItem("photonix_token")}});
        if(!response.ok) throw Error(response.status===403?"Your role cannot view company transactions.":"Could not load transactions.");
        const {invoices}=await response.json();
        const receipts=invoices.flatMap(job=>job.receipts.map(receipt=>({...receipt,customer:job.customerName,invoice:job.invoiceNumber})));
        setRows(receipts.sort((a,b)=>Date.parse(b.recorded_at)-Date.parse(a.recorded_at)));
      } catch(e){if(!controller.signal.aborted)setError(e.message);}
    }
    load();
    return ()=>controller.abort();
  },[]);
  return <section><h1 className="queue-title">Transactions</h1><p className="queue-subtitle">Payments received against installation invoices.</p>
    {error?<p role="alert">{error}</p>:<DataTable columns={columns} rows={rows} loading={rows===null} emptyTitle="No payments recorded"/>}
  </section>;
}
