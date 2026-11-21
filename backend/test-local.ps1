param([string]$PgBin = 'C:\Program Files\Odoo 20.0.20261117\PostgreSQL\bin')
$ErrorActionPreference = 'Stop'
$cluster = Join-Path ([IO.Path]::GetTempPath()) ('photonix-pg-' + [guid]::NewGuid().ToString('N'))
$data = Join-Path $cluster 'data'
$passfile = Join-Path $cluster 'init-password'
[IO.Directory]::CreateDirectory($cluster) | Out-Null
$secret = [guid]::NewGuid().ToString('N')
[IO.File]::WriteAllText($passfile,$secret)
$listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,0)
$listener.Start()
$port = $listener.LocalEndpoint.Port
$listener.Stop()
$started = $false
$oldUrl = $env:TEST_DATABASE_URL
Push-Location $PSScriptRoot
try {
  & (Join-Path $PgBin 'initdb.exe') -D $data -U hd_test -A scram-sha-256 "--pwfile=$passfile" --encoding=UTF8 --locale=C
  if ($LASTEXITCODE) {throw 'Test cluster initialization failed'}
  Remove-Item -LiteralPath $passfile
  & (Join-Path $PgBin 'pg_ctl.exe') -D $data -l (Join-Path $cluster 'test.log') -o "-h 127.0.0.1 -p $port" -w start
  if ($LASTEXITCODE) {throw 'Test cluster start failed'}
  $started = $true
  $env:TEST_DATABASE_URL = "postgresql://hd_test:$secret@127.0.0.1:$port/postgres"
  node --test
  if ($LASTEXITCODE) {throw 'Backend tests failed'}
} finally {
  $env:TEST_DATABASE_URL = $oldUrl
  Pop-Location
  if ($started) {
    & (Join-Path $PgBin 'pg_ctl.exe') -D $data -m fast -w stop
    if ($LASTEXITCODE) {throw 'Test cluster shutdown failed'}
  }
  $resolved = [IO.Path]::GetFullPath($cluster)
  $temp = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')
  if ([IO.Path]::GetDirectoryName($resolved) -eq $temp -and [IO.Path]::GetFileName($resolved) -match '^photonix-pg-[0-9a-f]{32}$') {
    Remove-Item -LiteralPath $resolved -Recurse -Force
  }
}