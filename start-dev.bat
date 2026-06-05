@echo off
echo ============================================
echo   EconomyZee - Iniciando Backend (Dev)
echo ============================================
echo.

REM 1. Inicia Docker (PostgreSQL + Redis)
echo [1/2] Iniciando Docker...
start "Docker" cmd /k "docker-compose up -d"
timeout /t 8 /nobreak > nul

REM 2. Inicia Backend NestJS
echo [2/2] Iniciando Backend NestJS...
start "Backend" cmd /k "cd backend && npm run start:dev"

echo.
echo ============================================
echo   TUDO RODANDO!
echo ============================================
echo.
echo  Frontend: http://localhost:5173
echo  Backend:  http://localhost:3333/api
echo  Swagger:  http://localhost:3333/docs
echo.
echo  Para producao, consulte: deploy/deploy-checklist.md
echo.
pause
