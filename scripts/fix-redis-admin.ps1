# Run PowerShell AS ADMINISTRATOR
# Replaces legacy Redis 5.x with Memurai (Redis 6.2+ compatible) on port 6379.

$ErrorActionPreference = "Stop"

Write-Host "AutoClipr Redis fix (Administrator required)" -ForegroundColor Cyan

$redisService = Get-Service -Name "Redis" -ErrorAction SilentlyContinue
if ($redisService) {
  if ($redisService.Status -eq "Running") {
    Write-Host "Stopping legacy Redis 5.x service..." -ForegroundColor Yellow
    Stop-Service -Name "Redis" -Force
  }
  Set-Service -Name "Redis" -StartupType Disabled
  Write-Host "Legacy Redis service disabled." -ForegroundColor Green
}

Write-Host "Installing Memurai Developer (Redis 6.2+ compatible)..." -ForegroundColor Cyan
winget install Memurai.MemuraiDeveloper --accept-package-agreements --accept-source-agreements

Write-Host ""
Write-Host "Start Memurai from Services or it may auto-start." -ForegroundColor White
Write-Host "Set in .env:" -ForegroundColor White
Write-Host "REDIS_URL=redis://localhost:6379" -ForegroundColor Cyan
Write-Host ""
Write-Host "Restart API + workers." -ForegroundColor White
