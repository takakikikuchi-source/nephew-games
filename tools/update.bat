@echo off
rem Update the games when the child account signs in.
rem This file is copied to the Startup folder by setup.bat.
start "" /min powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%LOCALAPPDATA%\NephewGames\update.ps1"
