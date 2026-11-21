import {randomUUID} from 'node:crypto';
import {Router} from 'express';
import {comparePackages} from './solarfit.js';

export async function current(db,lead) {
  if(lead.surveyStatus !== 'approved') throw Object.assign(new Error('An approved survey is required'),{status:409});
  const {rows:[catalog]}=await db.query('SELECT * FROM photonix_solarfit.catalog WHERE id FOR SHARE');
  if(!catalog || !(catalog.assumptions.tariffPaisePerKwh>0) || !(lead.monthlyBill>0)) throw Object.assign(new Error('Catalogue, tariff and electricity bill are required'),{status:409});
  const needs={monthlyKwh:lead.monthlyBill*100/catalog.assumptions.tariffPaisePerKwh,usableRoofM2:lead.usableRoofArea*0.09290304,budgetPaise:Math.round((lead.budget||0)*100),backup:lead.backupRequired!=='none',propertyType:lead.propertyType};
  const survey={revision:JSON.stringify([lead.technicalReviewedAt,lead.technicalReviewerId,lead.surveySubmittedAt,needs,lead.roofDirection,lead.roofTiltDeg,lead.cableDistanceM])};
  return {survey,catalog,options:comparePackages(needs,catalog.packages,catalog.assumptions)};
}

export async function saveQuote(db,id,salesId,revision,selected,assumptions){
  const {rows:[quote]}=await db.query(`INSERT INTO photonix_solarfit.quote
    (id,lead_id,revision,sales_id,snapshot,assumptions,valid_until)
    VALUES($1,$2,$3,$4,$5,$6,now()+interval '14 days') RETURNING *`,
    [randomUUID(),id,revision,salesId,selected,assumptions]);
  return quote;
}

export function mountSolarFit(app, authenticate, pool, crm) {
  const api=Router();
  api.use(authenticate);
  const restrict=role=>(req,res,next)=>req.actor.role===role?next():res.sendStatus(403);
  const fail=(status,message)=>Object.assign(new Error(message),{status});
  async function transaction(fn) {
    const db=await pool.connect();
    try {await db.query('BEGIN');const result=await fn(db);await db.query('COMMIT');return result;}
    catch(e){await db.query('ROLLBACK');throw e;} finally{db.release();}
  }
  api.post('/leads/:id/:action',restrict('sales'),async(req,res)=>{
    const id=Number(req.params.id);
    if(!Number.isSafeInteger(id)||id<1||!['compare','quote'].includes(req.params.action))return res.sendStatus(404);
    const lead=await crm.getEnquiry({id,salesId:req.actor.id});
    if(!lead)return res.sendStatus(404);
    const result=await transaction(async db=>{
      const {survey,catalog,options}=await current(db,lead);
      if(req.params.action==='compare')return {options,assumptions:catalog.assumptions};
      const selected=options.find(o=>o.packageId===req.body?.packageId);
      if(!selected)throw fail(400,'Select a suitable package');
      return saveQuote(db,id,req.actor.id,survey.revision,selected,catalog.assumptions);
    });res.json(result);
  });
  api.post('/quotes/:id/review',restrict('manager'),async(req,res)=>{
    if(!req.body?.reason?.trim?.())return res.sendStatus(400);
    const r=await pool.query('UPDATE photonix_solarfit.quote SET reviewed_by=$2, review_reason=$3 WHERE id=$1 AND accepted_at IS NULL AND valid_until>now() RETURNING id',[req.params.id,req.actor.id,req.body.reason]);
    res.sendStatus(r.rowCount?200:409);
  });
  api.post('/quotes/:id/accept',restrict('sales'),async(req,res)=>{
    const evidence=req.body?.acceptanceReference;
    if(typeof evidence!=='string'||!evidence.trim())return res.sendStatus(400);
    const result=await transaction(async db=>{
      const {rows:[q]}=await db.query('SELECT * FROM photonix_solarfit.quote WHERE id=$1 AND sales_id=$2 FOR UPDATE',[req.params.id,req.actor.id]);
      const lead=q && await crm.getEnquiry({id:q.lead_id,salesId:req.actor.id});
      if(!lead)throw fail(404,'Quote unavailable');
      const existing=await db.query('SELECT id FROM photonix_solarfit.confirmed_order WHERE quote_id=$1',[q.id]);
      if(existing.rowCount)return existing.rows[0];
      const {survey,options}=await current(db,lead);
      const option=options.find(o=>o.packageId===q.snapshot.packageId);
      if(survey.revision!==q.revision||q.valid_until<=new Date()||!option)throw fail(409,'Requote using the current survey');
      if(option.lines.some((line,index)=>line.productId!==q.snapshot.lines[index]?.productId||line.unitCostPaise>q.snapshot.lines[index]?.unitCostPaise||line.qty!==q.snapshot.lines[index]?.qty)||option.lines.length!==q.snapshot.lines.length)
        throw fail(409,'Parts or procurement prices changed; create a new quotation');
      if((q.snapshot.requiresMarginReview||option.requiresMarginReview)&&!q.reviewed_by)throw fail(409,'Manager margin review required');
      await db.query('UPDATE photonix_solarfit.quote SET accepted_at=now(),acceptance_reference=$2 WHERE id=$1',[q.id,evidence.trim()]);
      const order=await db.query('INSERT INTO photonix_solarfit.confirmed_order(id,quote_id) VALUES($1,$2) RETURNING id',[randomUUID(),q.id]);
      return order.rows[0];
    });res.json(result);
  });
  api.use((err,_req,res,_next)=>{const status=err.code==='22P02'?400:err.status??500;res.status(status).json({error:status<500?err.message:'SolarFit is unavailable'});});
  app.use('/api/solarfit',api);
}
