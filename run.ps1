param([ValidateSet('start', 'stop')][string]$Action = 'start')

$ErrorActionPreference = 'Stop'
try { & (Join-Path $PSScriptRoot 'scripts\flight-host.ps1') -Action $Action } catch { Write-Warning "Flight search could not start/stop: $($_.Exception.Message). The website can still run with manual flight details." }
function Wait-Website {
    param([int]$Seconds = 120)
    $deadline = [DateTime]::UtcNow.AddSeconds($Seconds)
    while ([DateTime]::UtcNow -lt $deadline) {
        try {
            $response = Invoke-WebRequest 'http://127.0.0.1:8081/' -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -eq 200 -and $response.Content -match 'id="root"') { return $true }
        } catch { }
        Start-Sleep -Milliseconds 500
    }
    return $false
}
$statePath = Join-Path $PSScriptRoot '.expo\web-server.json'
$server = $null
if (Test-Path -LiteralPath $statePath) {
    $saved = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
    $candidate = Get-Process -Id $saved.id -ErrorAction SilentlyContinue
    if ($candidate -and $candidate.StartTime.ToUniversalTime().Ticks.ToString() -eq $saved.started -and $candidate.Path -eq $saved.executable) {
        $server = $candidate
    }
}

if ($Action -eq 'stop') {
    if ($server) {
        $server | Stop-Process
        Write-Host 'Travel app host stopped.'
    } else {
        Write-Host 'No host started by run.ps1 is running. For an older foreground server, press Ctrl+C in its terminal.'
    }
    if (Test-Path -LiteralPath $statePath) { Remove-Item -LiteralPath $statePath }
    exit 0
}

if ($server) {
    if (!(Wait-Website -Seconds 10)) { throw 'The saved host process is not serving the website. Run .\run.ps1 stop, then .\run.ps1 start. Inspect .expo\web-server-error.log if it still fails.' }
    Write-Host 'Website ready: http://127.0.0.1:8081/'
    exit 0
}
if ([System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners() | Where-Object { $_.Port -eq 8081 -and $_.Address.ToString() -ne '::1' }) {
    throw 'Port 8081 is already in use. Stop the old server with Ctrl+C in its terminal, then run this command again.'
}

$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
$nodePath = if ($nodeCommand) { $nodeCommand.Source } else { Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' }
if (!(Test-Path -LiteralPath $nodePath)) { throw 'Node.js was not found. Install Node.js 22.13 or newer and restart VS Code.' }
$cliPath = Join-Path $PSScriptRoot 'node_modules\expo\bin\cli'
if (!(Test-Path -LiteralPath $cliPath)) { throw 'Dependencies are missing. Install the project dependencies first.' }
New-Item -ItemType Directory -Path (Split-Path $statePath) -Force | Out-Null
$oldBrowser = $env:BROWSER
try {
    $env:BROWSER = 'none'
    $server = Start-Process -FilePath $nodePath -ArgumentList @(('"{0}"' -f $cliPath), 'start', '--web', '--port', '8081', '--offline') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $PSScriptRoot '.expo\web-server.log') -RedirectStandardError (Join-Path $PSScriptRoot '.expo\web-server-error.log') -PassThru
    @{ id = $server.Id; started = $server.StartTime.ToUniversalTime().Ticks.ToString(); executable = $nodePath } | ConvertTo-Json | Set-Content -LiteralPath $statePath
} finally {
    $env:BROWSER = $oldBrowser
}
Write-Host 'Waiting for Expo to start (a cold start can take up to two minutes)...'
if (!(Wait-Website)) { throw 'The website did not become ready within two minutes. Check .expo\web-server-error.log and .expo\web-server.log, then run .\run.ps1 stop before retrying.' }
Write-Host 'Website ready: http://127.0.0.1:8081/'
Write-Host 'Logs: .expo\web-server.log and .expo\web-server-error.log'
Write-Host 'Stop: powershell -NoProfile -ExecutionPolicy Bypass -File .\run.ps1 stop'
