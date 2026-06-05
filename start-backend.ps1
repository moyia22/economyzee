# ============================================
# EconomyZee — Script de Inicialização (Dev Local)
# Roda: Docker → Backend
# ============================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  EconomyZee - Iniciando Backend (Dev)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path
$BACKEND = Join-Path $ROOT "backend"

# 1. Docker
Write-Host "[1/2] Iniciando Docker (PostgreSQL + Redis)..." -ForegroundColor Yellow
Set-Location $ROOT
docker-compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Docker falhou. Verifique se o Docker Desktop esta rodando." -ForegroundColor Red
    exit 1
}
Write-Host "  Docker OK!" -ForegroundColor Green

# 2. Backend (em novo terminal)
Write-Host "[2/2] Iniciando Backend NestJS..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$BACKEND'; npm run start:dev"
Write-Host "  Backend iniciado em novo terminal!" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TUDO RODANDO!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "URLs:" -ForegroundColor Yellow
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "  Backend:  http://localhost:3333/api" -ForegroundColor White
Write-Host "  Swagger:  http://localhost:3333/docs" -ForegroundColor White
Write-Host ""
Write-Host "Para produção, consulte: deploy/deploy-checklist.md" -ForegroundColor Gray
Write-Host ""
