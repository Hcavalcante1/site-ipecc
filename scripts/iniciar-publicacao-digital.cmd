@echo off
REM Liga o worker Digital no PC em modo PUBLICAÇÃO REAL.
REM Deixe esta janela aberta enquanto publica pelo admin.
cd /d "%~dp0.."
echo.
echo Iniciando worker (publicacao real)...
echo Guia: docs\DIGITAL-PUBLISHER-PC.md
echo.
node scripts/run-digital-publisher.cjs --publish
pause
