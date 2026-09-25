@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 20 or newer is required.
  pause
  exit /b 1
)
if not exist "node_modules\three\build\three.module.js" (
  call npm.cmd ci --no-audit --no-fund
  if errorlevel 1 exit /b 1
)
node server.mjs %*
