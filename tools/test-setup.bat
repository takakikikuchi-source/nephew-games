@echo off
rem Try the setup and the auto-update on THIS PC without touching the real Desktop or Startup.
rem Everything is created inside the "test-install" folder next to this project.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1" -TestDir "%~dp0..\test-install"
pause
