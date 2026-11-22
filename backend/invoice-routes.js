const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const outstandingSQL = 'SELECT coalesce((SELECT sum(amount) FROM photonix_ops.invoice),0)-coalesce((SELECT sum(amount) FROM photonix_ops.receipt),0) AS outstanding';
export function mountBilling(router,pool) {
  const write=(req,res,next)=>['admin','finance'].includes(req.actor.role)?next():res.sendStatus(403);
  router.post('/finance/jobs/:id/invoice',write,async(req,res)=>{
    if(!uuid.test(req.params.id)) return res.sendStatus(400);
    await pool.query(`INSERT INTO photonix_ops.invoice(job_id,amount,issued_by)
      SELECT id,contract_amount,$2 FROM photonix_ops.installation_job WHERE id=$1 AND contract_amount>0
      ON CONFLICT(job_id) DO NOTHING`,[req.params.id,req.actor.id]);
    const {rows:[invoice]}=await pool.query('SELECT number,amount FROM photonix_ops.invoice WHERE job_id=$1',[req.params.id]);
    if(!invoice)return res.status(409).json({error:'A positive installation contract is required.'});
    res.json(invoice);
  });
  router.post('/finance/jobs/:id/payments',write,async(req,res)=>{
    const {amount,method,requestId}=req.body??{};
    if(!uuid.test(req.params.id)||!uuid.test(requestId)||typeof amount!=='string'||!/^\d{1,10}(\.\d{1,2})?$/.test(amount)||Number(amount)<=0||!['bank','upi','cash','card'].includes(method))
      return res.status(400).json({error:'Enter a positive INR amount with up to two decimal places and select a payment method.'});
    const db=await pool.connect();
    try {
      await db.query('BEGIN');
      const {rows:[invoice]}=await db.query('SELECT amount FROM photonix_ops.invoice WHERE job_id=$1 FOR UPDATE',[req.params.id]);
      if(!invoice) {await db.query('ROLLBACK');return res.status(409).json({error:'Issue the invoice first.'});}
      const {rows:[prior]}=await db.query('SELECT * FROM photonix_ops.receipt WHERE id=$1',[requestId]);
      if(prior){
        await db.query('ROLLBACK');
        if(prior.job_id!==req.params.id||Number(prior.amount)!==Number(amount)||prior.method!==method)return res.sendStatus(409);
        return res.json(prior);
      }
      const {rows:[check]}=await db.query('SELECT $2::numeric <= $3::numeric-coalesce(sum(amount),0) AS fits FROM photonix_ops.receipt WHERE job_id=$1',[req.params.id,amount,invoice.amount]);
      if(!check.fits){await db.query('ROLLBACK');return res.status(409).json({error:'Payment exceeds the outstanding balance.'});}
      const {rows:[receipt]}=await db.query('INSERT INTO photonix_ops.receipt(id,job_id,amount,method,recorded_by) VALUES($1,$2,$3,$4,$5) RETURNING *',[requestId,req.params.id,amount,method,req.actor.id]);
      await db.query('COMMIT');res.status(201).json(receipt);
    }catch(err){await db.query('ROLLBACK');if(err.code==='23505')return res.sendStatus(409);throw err;}finally{db.release();}
  });
}
