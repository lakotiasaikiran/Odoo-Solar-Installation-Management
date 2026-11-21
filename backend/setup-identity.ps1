param([string]$PgBin = 'C:\Program Files\Odoo 20.0.20261117\PostgreSQL\bin')
$ErrorActionPreference = 'Stop'
$store = Join-Path $env:LOCALAPPDATA 'Photonix\identity-dev'
$null = [IO.Directory]::CreateDirectory($store)
# The cluster, configuration and synthetic credentials belong to the current Windows user.
$identity = [Security.Principal.WindowsIdentity]::GetCurrent().User
$acl = [Security.AccessControl.DirectorySecurity]::new()
$acl.SetAccessRuleProtection($true, $false)
$acl.SetOwner($identity)
$access = [Security.AccessControl.FileSystemAccessRule]::new($identity, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
$acl.AddAccessRule($access)
Set-Acl -LiteralPath $store -AclObject $acl
$cluster = Join-Path $store 'data'
$runtimePath = Join-Path $store 'runtime.env'
$accountsPath = Join-Path $store 'demo-accounts.json'
$clusterConfigPath = Join-Path $store 'cluster.env'
$lock = [IO.File]::Open((Join-Path $store 'setup.lock'), 'OpenOrCreate', 'ReadWrite', 'None')
$oldUrl = $env:DATABASE_URL
$oldPassword = $env:PGPASSWORD
$oldRuntimeUrl = $env:PHOTONIX_RUNTIME_DB
function New-LocalSecret { return ([guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')) }
try {
    if (!(Test-Path -LiteralPath $clusterConfigPath) -and (Test-Path -LiteralPath $runtimePath)) {
        $old = [IO.File]::ReadAllText($runtimePath)
        if ($old.StartsWith('DATABASE_URL=postgresql://photonix_dev:')) { [IO.File]::WriteAllText($clusterConfigPath, $old) }
    }
    if (!(Test-Path -LiteralPath $clusterConfigPath)) {
        if (Test-Path -LiteralPath $cluster) { throw 'Identity cluster exists without runtime.env. Restore its original configuration.' }
        $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
        $listener.Start()
        try { $port = $listener.LocalEndpoint.Port } finally { $listener.Stop() }
        $url = 'postgresql://photonix_dev:{0}@127.0.0.1:{1}/photonix_identity_dev' -f (New-LocalSecret), $port
        $config = 'DATABASE_URL=' + $url + [Environment]::NewLine + 'JWT_SECRET=' + (New-LocalSecret) + [Environment]::NewLine
        [IO.File]::WriteAllText($clusterConfigPath, $config)
    }
    $configLines = [IO.File]::ReadAllLines($clusterConfigPath)
    $databaseLine = @($configLines | Where-Object { $_.StartsWith('DATABASE_URL=') })
    if ($databaseLine.Count -ne 1) { throw 'Invalid identity configuration' }
    $databaseUrl = $databaseLine[0].Substring('DATABASE_URL='.Length)
    $target = [uri]$databaseUrl
    if ($target.Host -ne '127.0.0.1' -or $target.AbsolutePath -ne '/photonix_identity_dev') { throw 'Expected a local identity database' }
    $port = $target.Port
    $env:PGPASSWORD = $target.UserInfo.Split(':',2)[1]
    $adminArgs = @('-h','127.0.0.1','-p',"$port",'-U','photonix_dev','-d','postgres','-X','-v','ON_ERROR_STOP=1','-At')
    if (!(Test-Path -LiteralPath (Join-Path $cluster 'PG_VERSION'))) {
        $pwfile = Join-Path $store 'init-password.tmp'
        try {
            [IO.File]::WriteAllText($pwfile, $env:PGPASSWORD)
            & (Join-Path $PgBin 'initdb.exe') -D $cluster -U photonix_dev -A scram-sha-256 "--pwfile=$pwfile" --encoding=UTF8 --locale=C
            if ($LASTEXITCODE) { throw 'Identity cluster initialization failed' }
        } finally { if (Test-Path -LiteralPath $pwfile) { Remove-Item -LiteralPath $pwfile } }
    }
    & (Join-Path $PgBin 'pg_ctl.exe') -D $cluster status *> $null
    if ($LASTEXITCODE) {
        & (Join-Path $PgBin 'pg_ctl.exe') -D $cluster -l (Join-Path $store 'postgres.log') -o "-h 127.0.0.1 -p $port" -w start
        if ($LASTEXITCODE) { throw 'Identity cluster startup failed' }
    }
    $exists = & (Join-Path $PgBin 'psql.exe') @adminArgs -c "SELECT 1 FROM pg_database WHERE datname = 'photonix_identity_dev'"
    if ($LASTEXITCODE) { throw 'Identity database connection failed' }
    if ($exists -ne '1') {
        & (Join-Path $PgBin 'psql.exe') @adminArgs -c 'CREATE DATABASE photonix_identity_dev'
        if ($LASTEXITCODE) { throw 'Identity database creation failed' }
    }
    $records = [ordered]@{}
    if (Test-Path -LiteralPath $accountsPath) {
        $existing = Get-Content -LiteralPath $accountsPath -Raw | ConvertFrom-Json
        foreach ($prop in $existing.PSObject.Properties) {
            $records[$prop.Name] = @{ id = $prop.Value.id; email = $prop.Value.email; password = $prop.Value.password }
        }
    }
    $updatedAccounts = $false
    foreach ($key in @('admin','verifier','sales','otherSales','surveyor','technical_reviewer')) {
        if (!$records.Contains($key)) {
            $id = if ($key -eq 'sales') { '49557cb1-bdc8-47fb-a784-6aba1f3ae115' } else { [guid]::NewGuid().ToString() }
            $records[$key] = @{ id = $id; email = "$key@photonix.example.test".ToLowerInvariant(); password = New-LocalSecret }
            $updatedAccounts = $true
        }
    }
    if ($updatedAccounts -or !(Test-Path -LiteralPath $accountsPath)) {
        [IO.File]::WriteAllText($accountsPath, ($records | ConvertTo-Json))
    }
    $runtimeConfig = if (Test-Path -LiteralPath $runtimePath) { [IO.File]::ReadAllText($runtimePath) } else { '' }
    if (!$runtimeConfig.StartsWith('DATABASE_URL=postgresql://photonix_api:')) {
        $appUrl = 'postgresql://photonix_api:{0}@127.0.0.1:{1}/photonix_identity_dev' -f (New-LocalSecret), $port
        $jwt = @($configLines | Where-Object { $_.StartsWith('JWT_SECRET=') })
        if ($jwt.Count -ne 1) { throw 'Missing signing configuration' }
        $runtimeConfig = 'DATABASE_URL=' + $appUrl + [Environment]::NewLine + $jwt[0] + [Environment]::NewLine
        [IO.File]::WriteAllText($runtimePath,$runtimeConfig)
    }
    $env:PHOTONIX_RUNTIME_DB = (($runtimeConfig -split '[\r\n]+' | Where-Object { $_.StartsWith('DATABASE_URL=') }) -replace '^DATABASE_URL=','')
    $env:DATABASE_URL = $databaseUrl
    & node (Join-Path $PSScriptRoot 'seed-demo.js') $accountsPath
    if ($LASTEXITCODE) { throw 'Identity fixture setup failed' }
    Write-Output "Identity database ready on localhost port $port. Private runtime configuration: $runtimePath"
} finally {
    $env:PGPASSWORD = $oldPassword
    $env:PHOTONIX_RUNTIME_DB = $oldRuntimeUrl
    $env:DATABASE_URL = $oldUrl
    $lock.Dispose()
}