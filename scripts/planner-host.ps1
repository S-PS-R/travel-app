param([ValidateSet('start', 'stop')][string]$Action = 'start')
$ErrorActionPreference = 'Stop'
$projectPath = Split-Path $PSScriptRoot
$plannerState = Join-Path $projectPath '.expo\planner-server.json'
$plannerProcess = $null
if (Test-Path -LiteralPath $plannerState) {
    $record = Get-Content -LiteralPath $plannerState -Raw | ConvertFrom-Json
    $candidate = Get-Process -Id $record.id -ErrorAction SilentlyContinue
    if ($candidate -and $candidate.StartTime.ToUniversalTime().Ticks.ToString() -eq $record.started -and $candidate.Path -eq $record.executable) { $plannerProcess = $candidate }
}
if ($Action -eq 'stop') {
    if ($plannerProcess) { $plannerProcess | Stop-Process; Write-Host 'Gemini planner stopped.' }
    if (Test-Path -LiteralPath $plannerState) { Remove-Item -LiteralPath $plannerState }
    return
}
if ($plannerProcess) { return }
if ([System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners() | Where-Object { $_.Port -eq 8083 }) { Write-Warning 'Port 8083 is occupied. Planner was not started.'; return }
$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
$plannerNode = if ($nodeCommand) { $nodeCommand.Source } else { Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' }
$plannerEnv = Join-Path $projectPath '.env.gemini.local'
$plannerArgs = @('--experimental-strip-types')
if (Test-Path -LiteralPath $plannerEnv) { $plannerArgs += ('--env-file="{0}"' -f $plannerEnv) }
$plannerArgs += ('"{0}"' -f (Join-Path $PSScriptRoot 'planner-server.mjs'))
New-Item -ItemType Directory -Path (Split-Path $plannerState) -Force | Out-Null
$plannerProcess = Start-Process -FilePath $plannerNode -ArgumentList $plannerArgs -WorkingDirectory $projectPath -WindowStyle Hidden -RedirectStandardOutput (Join-Path $projectPath '.expo\planner-server.log') -RedirectStandardError (Join-Path $projectPath '.expo\planner-server-error.log') -PassThru
@{ id=$plannerProcess.Id; started=$plannerProcess.StartTime.ToUniversalTime().Ticks.ToString(); executable=$plannerNode } | ConvertTo-Json | Set-Content -LiteralPath $plannerState
for ($attempt=0; $attempt -lt 10; $attempt++) {
    try { $health=Invoke-RestMethod 'http://127.0.0.1:8083/health' -TimeoutSec 2; if ($health.provider -eq 'gemini') { Write-Host "Gemini planner started. Key configured: $($health.ready)"; return } } catch { }
    Start-Sleep -Milliseconds 300
}
Write-Warning 'Gemini planner did not become ready. Check .expo\planner-server-error.log.'
