@echo off
cd /d C:\Project\PresentAI
start "" cmd /k "npm run dev"
timeout /t 3 >nul
start "" http://localhost:3000
