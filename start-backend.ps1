# ============================================
# EconomyZee — Script de Inicialização
# Roda: Docker → Backend → ngrok
# ============================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  EconomyZee - Iniciando Backend + ngrok" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path
$BACKEND = Join-Path $ROOT "backend"

# 1. Docker
Write-Host "[1/3] Iniciando Docker (PostgreSQL + Redis)..." -ForegroundColor Yellow
Set-Location $ROOT
docker-compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Docker falhou. Verifique se o Docker Desktop esta rodando." -ForegroundColor Red
    exit 1
}
Write-Host "  Docker OK!" -ForegroundColor Green

# 2. Backend (em novo terminal)
Write-Host "[2/3] Iniciando Backend NestJS..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$BACKEND'; npm run start:dev"
Write-Host "  Backend iniciado em novo terminal!" -ForegroundColor Green

# 3. Aguardar backend iniciar
Write-Host "  Aguardando backend iniciar (10s)..." -ForegroundColor Gray
Start-Sleep -Seconds 10

# 4. ngrok (em novo terminal)
Write-Host "[3/3] Iniciando ngrok..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "ngrok http --domain=improvise-climatic-frequency.ngrok-free.dev 3333"
Write-Host "  ngrok iniciado em novo terminal!" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TUDO RODANDO!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Proximo passo:" -ForegroundColor Yellow
Write-Host "  1. Copie a URL HTTPS do terminal do ngrok" -ForegroundColor White
Write-Host "  2. Atualize na Vercel se a URL mudou:" -ForegroundColor White
Write-Host "     vercel env rm VITE_API_URL production" -ForegroundColor Gray
Write-Host "     vercel env add VITE_API_URL production" -ForegroundColor Gray
Write-Host "     vercel --prod" -ForegroundColor Gray
Write-Host ""
