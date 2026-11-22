"use client";
import {useState,useRef} from 'react';
import styles from './billing.module.css';
import {Button,Card} from '../../../components/ui';
export default function Billing({jobs,canWrite,onRefresh}){
  const [id,select]=useState(''),[amount,setAmount]=useState(''),[method,setMethod]=useState('bank'),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const attempt=useRef(null);
  const job=jobs.find(j=>j.id===id);
  async function save(payment){
    if(busy)return;
    setBusy(true);setMessage('');
    try{
      const key=JSON.stringify([id,amount,method]);
      if(attempt.current?.key!==key)attempt.current={key,requestId:crypto.randomUUID()};
      const response=await fetch('/api/finance/jobs/'+id+'/'+(payment?'payments':'invoice'),{method:'POST',headers:{Authorization:'Bearer '+sessionStorage.getItem('photonix_token'),'Content-Type':'application/json'},body:JSON.stringify(payment?{amount,method,requestId:attempt.current.requestId}:{})});
      const result=await response.json();
      if(!response.ok)throw Error(result.error||'Could not save');
      attempt.current=null;setAmount('');setMessage(payment?'Receipt recorded.':'Invoice issued.');await onRefresh();
    }catch(e){setMessage(e.message)}finally{setBusy(false)}
  }
  return <Card><div className={styles.panel}><h2>Manage invoices and receipts</h2><label>Installation <select className="field-input" value={id} onChange={e=>{select(e.target.value);setAmount('');setMessage('')}}><option value="">Choose a job</option>{jobs.map(j=><option key={j.id} value={j.id}>{j.jobNumber} · {j.customerName}</option>)}</select></label>
  {job&&<section><h3>{job.invoiceNumber} · ₹{job.contractAmount.toLocaleString('en-IN')}</h3>
    {job.issued&&<dl className={styles.totals}>{[["Invoice total",job.invoiceAmount],["Received",job.collected],["Outstanding",job.balanceDue]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>₹{value.toLocaleString("en-IN")}</dd></div>)}</dl>}
    {canWrite&&(!job.issued?<Button disabled={busy} onClick={()=>save(false)}>Issue invoice</Button>:job.balanceDue>0&&<form onSubmit={e=>{e.preventDefault();save(true)}}><label>Payment received (₹)<input className="field-input" type="number" min=".01" max={job.balanceDue} step=".01" required value={amount} onChange={e=>setAmount(e.target.value)}/></label><label>Method<select className="field-input" value={method} onChange={e=>setMethod(e.target.value)}>{['bank','upi','cash','card'].map(v=><option key={v}>{v}</option>)}</select></label><button className="primary" disabled={busy}>Record payment and generate receipt</button></form>)}
    {job.receipts.map(r=><details key={r.id}><summary>Receipt · ₹{Number(r.amount).toLocaleString('en-IN')} · {new Date(r.recorded_at).toLocaleDateString('en-IN')}</summary><p>Photonix · {job.customerName} · {job.invoiceNumber}<br/>Receipt {r.id}<br/>Received ₹{r.amount} by {r.method} on {new Date(r.recorded_at).toLocaleString('en-IN')}</p></details>)}</section>}
    {message && <p role="status">{message}</p>}</div></Card>
}
