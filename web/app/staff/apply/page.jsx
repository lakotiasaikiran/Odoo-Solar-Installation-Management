 "use client";
import {useState} from "react";
const roles=["sales","surveyor","technical_reviewer","warehouse","installer","support","finance","buyer","dispatcher","manager","director","subsidy","service_technician"];
export default function Apply(){
 const [message,setMessage]=useState(""),[busy,setBusy]=useState(false),[sent,setSent]=useState(false);
 async function submit(e){
  e.preventDefault();const data=Object.fromEntries(new FormData(e.currentTarget));setBusy(true);
  try{const res=await fetch("/api/staff/applications",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
   if(!res.ok)throw Error(res.status===429?"Too many attempts. Try again later.":"Check your application details and try again.");
   setSent(true);setMessage("Application received for identity verification and approval.");
  }catch(err){setMessage(err.message)}finally{setBusy(false)}
 }
 return <main className="signin-panel" style={{minHeight:"100vh"}}><section className="signin-box"><a className="signin-home" href="/">← Photonix home</a><h1>Apply for staff access</h1>
 {!sent&&<form className="signin-form" onSubmit={submit}><label>Work email<input className="field-input" name="email" type="email" required autoComplete="email"/></label>
 <label>Role<select className="field-input" name="role">{roles.map(r=><option value={r} key={r}>{r.replaceAll("_"," ")}</option>)}</select></label>
 <label>Password (12 characters minimum)<input className="field-input" name="password" type="password" minLength={12} required autoComplete="new-password"/></label><button className="btn btn-primary" disabled={busy}>Submit application</button></form>}
 <p role="status">{message}</p><a className="signin-home" href="/staff">Back to sign in</a></section></main>;
}
