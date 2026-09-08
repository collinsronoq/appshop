.PHONY: help api-dev api-test api-lint api-format api-typecheck db-up db-down migrate mobile-install mobile-start check

help:
	@echo "Targets: api-dev api-test api-lint api-format api-typecheck db-up db-down migrate mobile-install mobile-start check"

api-dev:
	cd backend && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

api-test:
	cd backend && uv run pytest

api-lint:
	cd backend && uv run ruff check .

api-format:
	cd backend && uv run ruff format .

api-typecheck:
	cd backend && uv run mypy app

db-up:
	docker compose up -d postgres

db-down:
	docker compose down

migrate:
	cd backend && uv run alembic upgrade head

mobile-install:
	cd apps/mobile && npm install

mobile-start:
	cd apps/mobile && npm run start

check: api-lint api-typecheck api-test
	cd apps/mobile && npm run lint && npm run typecheck && npm run test
