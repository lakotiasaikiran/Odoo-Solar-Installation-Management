// All prices are integer INR paise. Energy figures and financial projections are estimates.
function number(value, name, min = 0) {
  if (!Number.isFinite(value) || value < min) throw new RangeError('Invalid ' + name);
  return value;
}
function money(value, name) {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError('Invalid ' + name);
  return value;
}
export function comparePackages(customer, catalog, assumptions) {
  const demand = number(customer.monthlyKwh, 'monthly demand', 0.01);
  const roof = number(customer.usableRoofM2, 'usable roof');
  const budget = money(customer.budgetPaise, 'budget');
  if (!['residential','commercial'].includes(customer.propertyType) || typeof customer.backup !== 'boolean') throw new RangeError('Invalid customer needs');
  const yieldKwh = number(assumptions.monthlyKwhPerKw,'generation yield',0.01);
  const tariff = money(assumptions.tariffPaisePerKwh,'tariff');
  const floor = number(assumptions.minimumMarginPct,'margin floor');
  if (floor > 100) throw new RangeError('Invalid margin floor');
  const options = [];
  for (const kit of catalog) {
    if (!Number.isInteger(kit.kw) || kit.kw < 1 || kit.kw > 5 || !['on-grid','off-grid'].includes(kit.type)) throw new RangeError('Invalid package');
    if (kit.kw > Math.ceil(demand / yieldKwh) || number(kit.roofM2,'package roof',0.01) > roof || (customer.backup && kit.type !== 'off-grid')) continue;
    if (!Array.isArray(kit.lines) || !kit.lines.length) throw new RangeError('Missing package components');
    const lines = kit.lines.map(line => {
      if (!Number.isSafeInteger(line.qty) || line.qty < 1 || !line.productId) throw new RangeError('Invalid component');
      return {...line, costPaise:money(line.unitCostPaise,'procurement price')*line.qty, sellPaise:money(line.unitSellPaise,'selling price')*line.qty};
    });
    const net = money(lines.reduce((a,l)=>a+l.sellPaise,0),'net');
    if (!net) throw new RangeError('Missing selling price');
    const cost = money(lines.reduce((a,l)=>a+l.costPaise,0),'cost');
    const gross = money(net + Math.round(net*number(kit.taxPct,'tax')/100),'gross');
    const subsidy = customer.propertyType === 'residential' ? Math.min(gross,money(kit.estimatedResidentialSubsidyPaise,'estimated subsidy')) : 0;
    const monthlySavings = Math.round(Math.min(demand, kit.kw*yieldKwh)*tariff);
    const marginPct = 100*(net-cost)/net;
    const principal=gross-subsidy;
    const months=assumptions.loanMonths;
    const rate=assumptions.annualInterestPct/1200;
    const emi=Number.isInteger(months)&&months>0&&Number.isFinite(rate)&&rate>=0
      ? Math.round(rate ? principal*rate/(1-Math.pow(1+rate,-months)) : principal/months) : null;
    options.push({estimatedEmiPaise:emi,estimatedFinancingCostPaise:emi===null?null:Math.max(0,emi*months-principal),
      annualSimpleReturnPct:principal?1200*monthlySavings/principal:null,specification:kit.specification,warranty:kit.warranty,tier:kit.tier,packageId:kit.id,kw:kit.kw,type:kit.type,lines,grossPaise:gross,estimatedSubsidyPaise:subsidy,effectivePaise:gross-subsidy,
      withinUpfrontBudget:gross<=budget,expectedContributionPaise:net-cost,marginPct,requiresMarginReview:marginPct<floor,
      monthlyGenerationKwh:kit.kw*yieldKwh,estimatedMonthlySavingsPaise:monthlySavings,estimatedAnnualSavingsPaise:12*monthlySavings,
      estimatedPaybackYears:monthlySavings?(gross-subsidy)/(12*monthlySavings):null});
  }
  return options.sort((a,b)=>Number(b.withinUpfrontBudget)-Number(a.withinUpfrontBudget)||a.effectivePaise-b.effectivePaise);
}
