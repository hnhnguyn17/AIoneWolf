@echo off
REM ─────────────────────────────────────────────────────────────
REM AIoneWolf — khởi động 1 cú click trên Windows (cmd).
REM Cài deps (nếu thiếu) + migrate DB + seed (nếu trống) + chạy BE & FE.
REM ─────────────────────────────────────────────────────────────
cd /d "%~dp0"
node scripts\dev.js %*
pause
