param([ValidateSet('start', 'stop')][string]$Action = 'start')
$projectPath = Split-Path $PSScriptRoot
$flightState = Join-Path $projectPath '.expo\flight-server.json'
$flightProcess = $null
if (Test-Path -LiteralPath $flightState) {
    $record = Get-Content -LiteralPath $flightState -Raw | ConvertFrom-Json
    $candidate = Get-Process -Id $record.id -ErrorAction SilentlyContinue
    if ($candidate -and $candidate.StartTime.ToUniversalTime().Ticks.ToString() -eq $record.started -and $candidate.Path -eq $record.executable) { $flightProcess = $candidate }
}
if ($Action -eq 'stop') {
    if ($flightProcess) { $flightProcess | Stop-Process; Write-Host 'Flight lookup stopped.' }
    if (Test-Path -LiteralPath $flightState) { Remove-Item -LiteralPath $flightState }
    return
}
if ($flightProcess) { return }
$flightEnv = Join-Path $projectPath '.env.flight.local'
if (!(Test-Path -LiteralPath $flightEnv)) { Write-Host 'Flight lookup key is not configured; manual flight details remain available.'; return }
if ([System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners() | Where-Object { $_.Port -eq 8082 }) {
    Write-Warning 'Port 8082 is occupied. Flight lookup was not started.'; return
}
$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
$flightNode = if ($nodeCommand) { $nodeCommand.Source } else { Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' }
New-Item -ItemType Directory -Path (Split-Path $flightState) -Force | Out-Null
$flightProcess = Start-Process -FilePath $flightNode -ArgumentList @(('--env-file="{0}"' -f $flightEnv), ('"{0}"' -f (Join-Path $PSScriptRoot 'flight-server.mjs'))) -WorkingDirectory $projectPath -WindowStyle Hidden -RedirectStandardOutput (Join-Path $projectPath '.expo\flight-server.log') -RedirectStandardError (Join-Path $projectPath '.expo\flight-server-error.log') -PassThru
@{ id = $flightProcess.Id; started = $flightProcess.StartTime.ToUniversalTime().Ticks.ToString(); executable = $flightNode } | ConvertTo-Json | Set-Content -LiteralPath $flightState
Write-Host 'Starting local flight lookup on port 8082.'
