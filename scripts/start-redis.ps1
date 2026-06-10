# Start Redis 7 for AutoClipr (BullMQ requires Redis >= 6.2)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$Port = 6379
$ComposeFile = "docker-compose.yml"

Write-Host "AutoClipr Redis setup (requires Redis >= 6.2 for BullMQ)" -ForegroundColor Cyan

function Test-PortListen($p) {
  return [bool](Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue)
}

function Test-DockerRunning {
  $prev = $ErrorActionPreference
  $ErrorActionPreference = "SilentlyContinue"
  try {
    & docker info *> $null
    return $LASTEXITCODE -eq 0
  } finally {
    $ErrorActionPreference = $prev
  }
}

$redisService = Get-Service -Name "Redis" -ErrorAction SilentlyContinue
if ($redisService -and $redisService.Status -eq "Running") {
  Write-Host "Legacy Windows Redis 5.x service detected." -ForegroundColor Yellow
  try {
    Stop-Service -Name "Redis" -Force -ErrorAction Stop
    Set-Service -Name "Redis" -StartupType Disabled -ErrorAction SilentlyContinue
    Write-Host "Stopped Windows Redis service." -ForegroundColor Green
    Start-Sleep -Seconds 2
  } catch {
    Write-Host "Could not stop Windows Redis (Administrator required)." -ForegroundColor Yellow
    $Port = 6380
    $ComposeFile = "docker-compose.redis.yml"
  }
}

if ($Port -eq 6379 -and (Test-PortListen 6379)) {
  Write-Host "Port 6379 is in use." -ForegroundColor Yellow
  $Port = 6380
  $ComposeFile = "docker-compose.redis.yml"
}

if (-not (Test-DockerRunning)) {
  Write-Host ""
  Write-Host "Docker Desktop is not running." -ForegroundColor Red
  Write-Host ""
  Write-Host "Recommended fix (no Docker needed):" -ForegroundColor Green
  Write-Host "  1. Open PowerShell as Administrator" -ForegroundColor White
  Write-Host "  2. cd `"$ProjectRoot`"" -ForegroundColor White
  Write-Host "  3. powershell -ExecutionPolicy Bypass -File scripts/fix-redis-admin.ps1" -ForegroundColor Cyan
  Write-Host ""
  Write-Host "Alternative: start Docker Desktop, then run this script again." -ForegroundColor DarkGray
  Write-Host ""
  exit 1
}

Push-Location $ProjectRoot
try {
  Write-Host "Starting Redis 7 via Docker ($ComposeFile)..." -ForegroundColor Cyan
  & docker compose -f $ComposeFile up redis -d
  if ($LASTEXITCODE -ne 0) {
    throw "docker compose failed (exit $LASTEXITCODE)"
  }

  Start-Sleep -Seconds 3
  $redisUrl = "redis://localhost:$Port"
  $ping = & docker compose -f $ComposeFile exec -T redis redis-cli ping 2>$null
  $version = & docker compose -f $ComposeFile exec -T redis redis-cli INFO server 2>$null | Select-String "redis_version:"

  if ($ping -match "PONG" -and $version) {
    Write-Host "Redis ready: $version" -ForegroundColor Green
  } else {
    Write-Host "Redis container started." -ForegroundColor Green
  }

  Write-Host ""
  Write-Host "Set in your .env:" -ForegroundColor White
  Write-Host "REDIS_URL=$redisUrl" -ForegroundColor Cyan
  Write-Host "Then restart API and workers." -ForegroundColor White

  if ($Port -eq 6380) {
    Write-Host ""
    Write-Host "Tip: run fix-redis-admin.ps1 as Administrator to use port 6379 only." -ForegroundColor Yellow
  }
} finally {
  Pop-Location
}
