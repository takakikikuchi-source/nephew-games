@echo off
rem First-time setup. Run this once while signed in to the child's Windows account.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1"
pause
