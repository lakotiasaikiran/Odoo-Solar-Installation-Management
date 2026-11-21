import test from 'node:test';
import assert from 'node:assert/strict';
import {comparePackages} from '../solarfit.js';
const customer={monthlyKwh:300,usableRoofM2:24,budgetPaise:400000,backup:false,propertyType:'residential'};
const rules={monthlyKwhPerKw:100,tariffPaisePerKwh:800,minimumMarginPct:20};
const kit={id:'demo',kw:3,type:'on-grid',roofM2:20,taxPct:10,estimatedResidentialSubsidyPaise:30000,lines:[{productId:1,qty:2,unitCostPaise:100000,unitSellPaise:150000}]};
test('3 kW fixture reconciles procurement, gross, subsidy, savings and contribution',()=>{
 const [o]=comparePackages(customer,[kit],rules);
 assert.equal(o.grossPaise,330000);assert.equal(o.effectivePaise,300000);assert.equal(o.expectedContributionPaise,100000);assert.equal(o.estimatedMonthlySavingsPaise,240000);
});
test('roof, oversizing and backup exclude unsuitable kits',()=>{
 for(const changed of [{usableRoofM2:10},{monthlyKwh:80},{backup:true}]) assert.deepEqual(comparePackages({...customer,...changed},[kit],rules),[]);
});
test('commercial customer and price rise trigger the right decisions',()=>{
 const [o]=comparePackages({...customer,propertyType:'commercial'},[{...kit,lines:[{...kit.lines[0],unitCostPaise:145000}]}],rules);
 assert.equal(o.estimatedSubsidyPaise,0);assert.equal(o.requiresMarginReview,true);
});
test('missing procurement price fails closed',()=>assert.throws(()=>comparePackages(customer,[{...kit,lines:[{...kit.lines[0],unitCostPaise:null}]}],rules)));
