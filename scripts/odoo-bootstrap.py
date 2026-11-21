"""Executed by the Odoo shell in the isolated Photonix database."""
import os
import secrets
from pathlib import Path
from uuid import UUID

if env.cr.dbname != 'photonix_crm_dev':
    raise RuntimeError('Unexpected database')
staff_id = str(UUID(os.environ['PHOTONIX_SALES_ID']))
destination = Path(os.environ['PHOTONIX_RUNTIME_ENV'])
users = env['res.users'].with_context(no_reset_password=True)
owner = users.search([('photonix_staff_id', '=', staff_id)], limit=1)
if not owner:
    owner = users.create({
        'name': 'Photonix sales ' + staff_id[:8], 'login': 'sales.' + staff_id + '@example.test',
        'photonix_staff_id': staff_id, 'password': secrets.token_urlsafe(40),
        'group_ids': [(6, 0, [env.ref('base.group_user').id, env.ref('sales_team.group_sale_salesman').id, env.ref('crm.group_use_lead').id])],
    })
service = env.ref('photonix_crm.service_identity', raise_if_not_found=False)
if not service:
    service = users.create({
        'name': 'Photonix intake connector', 'login': 'photonix.connector@example.test',
        'password': secrets.token_urlsafe(40), 'group_ids': [(6, 0, [env.ref('base.group_portal').id])],
    })
    env['ir.model.data'].create({'module':'photonix_crm','name':'service_identity',
                                 'model':'res.users','res_id':service.id,'noupdate':True})
if not destination.exists():
    env.ref('base.user_admin').write({'password': os.environ['PHOTONIX_ADMIN_PASSWORD']})
    key = env['res.users.apikeys'].with_user(service).sudo()._generate('photonix_intake','Photonix local intake',None)
    env.cr.commit()
    destination.write_text(f'ODOO_BASE_URL=http://127.0.0.1:18070\nODOO_DATABASE=photonix_crm_dev\nODOO_API_KEY={key}\n',encoding='utf-8')
else:
    env.cr.commit()
