param([switch]$Smoke)
# Run from PowerShell after the local dev databases and web build are ready.
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$backend = Join-Path $root 'backend'
$web = Join-Path $root 'web'
$run = Join-Path $env:LOCALAPPDATA 'Photonix'
$idEnv = Join-Path $run 'identity-dev\runtime.env'
$crmEnv = Join-Path $run 'sprint0-dev\runtime.env'
foreach ($file in @($idEnv,$crmEnv)) {
    if (!(Test-Path -LiteralPath $file)) { throw "Missing local configuration: $file" }
}
$env:PHOTONIX_SALES_ID = '49557cb1-bdc8-47fb-a784-6aba1f3ae115'
$env:PHOTONIX_DEMO_ACCOUNTS = Join-Path $run 'identity-dev\demo-accounts.json'
$node = (Get-Command node.exe).Source
if ($Smoke) {
    Push-Location $backend
    try {
        & $node "--env-file=$idEnv" "--env-file=$crmEnv" scripts/sprint0-smoke.js
        if ($LASTEXITCODE) { throw 'Sprint 0 smoke checks failed' }
    } finally { Pop-Location }
    return
}
function Start-LocalApp($name, $port, $workDir, $arguments, $health) {
    $pidFile = Join-Path $run "$name-process.json"
    if (Test-Path -LiteralPath $pidFile) {
        $saved = Get-Content -LiteralPath $pidFile -Raw | ConvertFrom-Json
        $existing = Get-Process -Id $saved.id -ErrorAction SilentlyContinue
        if ($existing -and $existing.StartTime.ToUniversalTime().Ticks.ToString() -eq $saved.started) {
            $response = Invoke-WebRequest -UseBasicParsing -Uri $health -TimeoutSec 10
            if ($response.StatusCode -eq 200) { Write-Host "$name ready on port $port"; return }
        }
    }
    $probe = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,$port)
    try { $probe.Start() } finally { $probe.Stop() }
    $proc = Start-Process -FilePath $node -ArgumentList $arguments -WorkingDirectory $workDir -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $run "$name.out.log") -RedirectStandardError (Join-Path $run "$name.err.log")
    $stamp = $proc.StartTime.ToUniversalTime().Ticks.ToString()
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        if ($proc.HasExited) { throw "$name exited; inspect $run\$name.err.log" }
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri $health -TimeoutSec 2
            if ($response.StatusCode -eq 200) {
                @{id=$proc.Id; started=$stamp} | ConvertTo-Json | Set-Content -LiteralPath $pidFile
                Write-Host "$name ready on port $port"
                return
            }
        } catch { Start-Sleep -Milliseconds 300 }
    }
    $proc.Kill()
    throw "$name failed its local readiness check"
}
if (!(Test-Path -LiteralPath (Join-Path $web '.next\BUILD_ID'))) {throw 'Build the frontend with npm run build in web first'}
$env:PORT='3100'
$env:API_ORIGIN='http://127.0.0.1:3100'
Start-LocalApp 'photonix-api' 3100 $backend @("--env-file=`"$idEnv`"","--env-file=`"$crmEnv`"",'server.js') 'http://127.0.0.1:3100/health'
Start-LocalApp 'photonix-web' 3200 $web @('node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','3200') 'http://127.0.0.1:3200/'
