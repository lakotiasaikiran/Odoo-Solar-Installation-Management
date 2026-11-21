// Explicit synthetic INR fixture for local judging. Replace with supplier-validated prices before quoting customers.
export const assumptions={source:'Synthetic hackathon fixture',monthlyKwhPerKw:120,tariffPaisePerKwh:750,minimumMarginPct:15,annualInterestPct:10,loanMonths:60};
const component=(productId,qty,rupees,markup)=>({productId,qty,unitCostPaise:rupees*100,unitSellPaise:Math.round(rupees*100*markup)});
export const packages=[];
for(let kw=1;kw<=5;kw++){
 for(const type of ['on-grid','off-grid']){
  for(const [tier,increment] of [['economical',0],['balanced',400],['premium',900]]){
   const line=(id,qty,price)=>component(id,qty,price,1.25);
   const lines=[line('500W-panel-'+tier,2*kw,5500+increment),line(type+'-inverter-'+kw+'kW',1,6500+kw*1200),
    line('connectors',2*kw,120),line('cable-m',12*kw,55),line('wiring-box',1,950),line('isolator-switch',2,450),
    line('controller-'+kw+'kW',1,1300+kw*200),line('safety-earthing',1,1900),line('mounting-stand',kw,1200),
    line('installation-and-testing',kw,1800),line('transport',1,1400)];
   if(type==='off-grid')lines.push(line('storage-battery',kw,10500));
   packages.push({id:[type,kw,tier].join('-'),type,kw,tier,roofM2:kw*8,lines,taxPct:5,estimatedResidentialSubsidyPaise:0,
    specification:'500 W panels with capacity-matched inverter',warranty:'Demo panel term 20 years; inverter term 2 years'});
  }
 }
}
