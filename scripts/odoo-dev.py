"""Run with the Python interpreter supplied by the local Windows Odoo installation."""
import argparse
import json
import os
import secrets
import socket
import subprocess
import sys
import time
from pathlib import Path
from uuid import UUID

import psutil
import psycopg2
from psycopg2 import sql

project = Path(__file__).resolve().parents[1]
install = Path(sys.executable).resolve().parents[1]
odoo_bin = install / 'server' / 'odoo-bin'
pg = install / 'PostgreSQL' / 'bin'
runtime = Path(os.environ['LOCALAPPDATA']) / 'Photonix' / 'sprint0-dev'
data = runtime / 'postgres'
settings = runtime / 'odoo.conf'
pidfile = runtime / 'service.pid'
log = runtime / 'odoo.log'
private = runtime / 'credentials.json'
dbname = 'photonix_crm_dev'
pgport, httpport = 55432, 18070
flags = subprocess.CREATE_NO_WINDOW | 0x00000008 | 0x00000200


def odoo_process():
    if not pidfile.exists():
        return None
    try:
        proc = psutil.Process(int(pidfile.read_text()))
        argv = proc.cmdline()
        if str(odoo_bin) in argv and str(settings) in argv and proc.is_running():
            return proc
    except (psutil.NoSuchProcess, psutil.AccessDenied, ValueError):
        pass
    return None


def free_port(port):
    with socket.socket() as probe:
        try:
            probe.bind(('127.0.0.1', port))
        except OSError as error:
            raise RuntimeError(f'Development port {port} is occupied') from error


def run(*args, **kwargs):
    result = subprocess.run(args, creationflags=flags, **kwargs)
    if result.returncode:
        raise RuntimeError(f'{Path(args[0]).name} exited with {result.returncode}. Check {log.name}.')
    return result


def start_pg(credentials):
    pg_ctl = pg / 'pg_ctl.exe'
    if not (data / 'PG_VERSION').exists():
        free_port(pgport)
        initpass = runtime / 'init-password'
        initpass.write_text(credentials['pg_admin'], encoding='utf-8')
        try:
            run(pg / 'initdb.exe','-D',data,'-U','px_cluster_admin','-A','scram-sha-256',
                '--encoding=UTF8','--locale=C','--pwfile='+str(initpass), stdout=subprocess.DEVNULL)
        finally:
            initpass.unlink(missing_ok=True)
    status = subprocess.run([pg_ctl,'-D',data,'status'], stdout=subprocess.DEVNULL, creationflags=flags).returncode
    if status != 0:
        free_port(pgport)
        run(pg_ctl,'-D',data,'-l',runtime/'postgres.log','-o',f'-h 127.0.0.1 -p {pgport}','-w','start')
    connection = psycopg2.connect(host='127.0.0.1', port=pgport, user='px_cluster_admin',
                                  password=credentials['pg_admin'], dbname='postgres')
    connection.autocommit = True
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1 FROM pg_roles WHERE rolname='px_odoo'")
            if not cursor.fetchone():
                cursor.execute(sql.SQL('CREATE ROLE px_odoo LOGIN PASSWORD {}').format(sql.Literal(credentials['db_password'])))
            cursor.execute('SELECT 1 FROM pg_database WHERE datname=%s',[dbname])
            if not cursor.fetchone():
                cursor.execute(sql.SQL('CREATE DATABASE {} OWNER px_odoo').format(sql.Identifier(dbname)))
    finally:
        connection.close()


def start(args):
    if not odoo_bin.exists():
        raise RuntimeError('Use the Python interpreter in the local Odoo installation')
    runtime.mkdir(parents=True, exist_ok=True)
    if not private.exists():
        private.write_text(json.dumps({k: secrets.token_urlsafe(40) for k in ('pg_admin','db_password','odoo_admin','db_manager')}),encoding='utf-8')
    credentials = json.loads(private.read_text(encoding='utf-8'))
    start_pg(credentials)
    running = odoo_process()
    if running and (args.action in ('restart','upgrade')):
        running.terminate()
        running.wait(timeout=30)
        running = None
    addon = project / 'addons'
    settings.write_text('\n'.join([
        '[options]', 'addons_path = '+str(install/'server'/'odoo'/'addons')+','+str(addon),
        'data_dir = '+str(runtime/'data'), 'db_name = '+dbname, 'dbfilter = ^'+dbname+'$',
        'list_db = False', 'db_host = 127.0.0.1', f'db_port = {pgport}', 'db_user = px_odoo',
        'db_password = '+credentials['db_password'], 'admin_passwd = '+credentials['db_manager'],
        f'http_port = {httpport}', 'http_interface = 127.0.0.1', 'workers = 0', 'max_cron_threads = 0',
        'logfile = '+str(log),'']),encoding='utf-8')
    with psycopg2.connect(host='127.0.0.1',port=pgport,dbname=dbname,user='px_odoo',password=credentials['db_password']) as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT to_regclass('public.ir_module_module')")
            installed = False
            if cursor.fetchone()[0]:
                cursor.execute("SELECT state FROM ir_module_module WHERE name='photonix_crm'")
                installed = cursor.fetchone() == ('installed',)
    cli = [sys.executable,odoo_bin]
    if not installed or args.action == 'upgrade':
        mode = '-u' if installed else '-i'
        run(*cli,'-c',settings,'-d',dbname,mode,'photonix_crm','--stop-after-init','--no-http')
    env_file = runtime / 'runtime.env'
    if not env_file.exists() or args.sales_id:
        bootstrap_env = dict(os.environ,PHOTONIX_RUNTIME_ENV=str(env_file),
                             PHOTONIX_SALES_ID=str(UUID(args.sales_id or '49557cb1-bdc8-47fb-a784-6aba1f3ae115')),
                             PHOTONIX_ADMIN_PASSWORD=credentials['odoo_admin'])
        source = (project/'scripts'/'odoo-bootstrap.py').read_text(encoding='utf-8')
        run(*cli,'shell','-c',settings,'-d',dbname,'--no-http',input=source,encoding='utf-8',env=bootstrap_env)
    if not running:
        free_port(httpport)
        p = subprocess.Popen([*cli,'-c',str(settings)],stdin=subprocess.DEVNULL,
                             stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=flags,cwd=project)
        pidfile.write_text(str(p.pid))
    for _ in range(100):
        try:
            with socket.create_connection(('127.0.0.1', httpport),timeout=1):
                print(f'Photonix CRM available on localhost:{httpport}. Server settings in {env_file}')
                return
        except OSError:
            time.sleep(.2)
    raise RuntimeError('Odoo did not become ready; check its local log')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['start','restart','upgrade'], nargs='?', default='start')
    parser.add_argument('--sales-id', help='Map an admitted sales UUID to a native CRM salesperson')
    start(parser.parse_args())
