export default function QuoteDownload({lead}){
 if(!lead || lead.quoteAmount==null || !["sent","accepted"].includes(lead.quoteStatus))return null;
 const d=lead.quoteDetails||{};
 const money=n=>"INR "+Number(n).toLocaleString("en-IN",{maximumFractionDigits:2});
 const lines=["PHOTONIX SOLAR QUOTATION",lead.reference,lead.customerName,"",d.capacityKw&&("System capacity: "+d.capacityKw+" kW"),d.grossPrice!=null&&("Installation price: "+money(d.grossPrice)),d.estimatedSubsidy!=null&&("Estimated subsidy: "+money(d.estimatedSubsidy)),"Estimated effective price: "+money(lead.quoteAmount),...(d.parts||[]).map(p=>p.qty+" × "+p.productId),"Subsidy is subject to eligibility and approval."];
 return <a className="btn btn-secondary" download={lead.reference+"-quotation.txt"} href={"data:text/plain;charset=utf-8,"+encodeURIComponent(lines.filter(Boolean).join("\n"))}>Download quotation</a>;
}
