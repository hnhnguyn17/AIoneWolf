# ─────────────────────────────────────────────────────────────
# AIoneWolf — khởi động trên Windows PowerShell.
# Cài deps (nếu thiếu) + migrate DB + seed (nếu trống) + chạy BE & FE.
#
# Dùng:
#   ./start.ps1            # full
#   ./start.ps1 setup      # chỉ cài + migrate + seed
#   ./start.ps1 migrate    # chỉ migrate
#   ./start.ps1 seed       # chỉ seed
#
# Nếu bị chặn execution policy, chạy 1 lần:
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
# ─────────────────────────────────────────────────────────────
Set-Location -Path $PSScriptRoot
node scripts/dev.js @args
