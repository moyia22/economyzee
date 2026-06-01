@echo off
title EconomyZee Dev

echo ========================================
echo   EconomyZee - Iniciando ambiente DEV
echo ========================================
echo.

REM 1. Inicia o ngrok com o dominio estatico
echo [1/2] Iniciando ngrok...
start "ngrok" cmd /k "ngrok http --domain=improvise-climatic-frequency.ngrok-free.dev 3333"

timeout /t 3 /nobreak >nul

REM 2. Inicia o backend NestJS
echo [2/2] Iniciando backend NestJS (porta 3333)...
start "Backend NestJS" cmd /k "cd /d %~dp0backend && npm run start:dev"

echo.
echo ========================================
echo  Servicos iniciados!
echo  Backend:  http://localhost:3333
echo  ngrok:    https://improvise-climatic-frequency.ngrok-free.dev
echo  Swagger:  http://localhost:3333/docs
echo  Vercel:   https://economyzee-smart-finance-hub-main.vercel.app
echo ========================================
echo.
pause
