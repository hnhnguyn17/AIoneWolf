# ─────────────────────────────────────────────────────────────
# AIoneWolf — Makefile (macOS/Linux, hoặc Windows có cài `make`/Git-Bash).
# Windows KHÔNG có make? Dùng:  npm run dev   |  ./start.ps1  |  start.bat
# Mọi target chỉ wrap lại scripts/dev.js để 1 nguồn sự thật.
# ─────────────────────────────────────────────────────────────
.PHONY: help dev setup install migrate seed backend frontend

help:           ## Hiện danh sách lệnh
	@echo "AIoneWolf — lệnh khả dụng:"
	@echo "  make dev        Cài deps + migrate DB + seed (nếu trống) + chạy BE :3636 & FE :3000"
	@echo "  make setup      Chỉ cài deps + migrate + seed (không chạy)"
	@echo "  make install    Cài deps backend + frontend"
	@echo "  make migrate    Tạo/cập nhật DB SQLite"
	@echo "  make seed       Bơm ~20 user giả + phòng demo"
	@echo "  make backend    Chỉ chạy backend"
	@echo "  make frontend   Chỉ chạy frontend"

dev:            ## Full: setup + chạy BE + FE
	node scripts/dev.js

setup:          ## Cài deps + migrate + seed (không chạy app)
	node scripts/dev.js setup

install:        ## Cài deps cho backend + frontend
	cd backend && npm install
	cd frontend && npm install

migrate:        ## Tạo/cập nhật DB SQLite
	node scripts/dev.js migrate

seed:           ## Bơm dữ liệu giả (~20 user + phòng)
	node scripts/dev.js seed

backend:        ## Chỉ chạy backend (:3636)
	node scripts/dev.js backend

frontend:       ## Chỉ chạy frontend (:3000)
	node scripts/dev.js frontend
