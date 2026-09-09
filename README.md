# Household Shopping Assistant

Collaborative household shopping and purchasing-memory application.

## Stack

- Mobile: React Native, Expo SDK 57, TypeScript, Expo Router
- Backend: FastAPI, SQLAlchemy async, Alembic, PostgreSQL
- Realtime: WebSocket (implemented in a later unit)
- Storage: S3-compatible abstraction (implemented in a later unit)

## Repository

```text
apps/mobile/     Expo mobile application
backend/         FastAPI API and migrations
docs/            Product and engineering contracts
.github/         CI workflows
```

## Prerequisites

- Node.js >= 22.13
- Python >= 3.12
- uv
- Docker + Docker Compose

## Local backend

```bash
cp .env.example .env
docker compose up -d postgres
cd backend
uv sync --dev
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

Health endpoints:

- `GET http://localhost:8000/health/live`
- `GET http://localhost:8000/health/ready`

Authentication endpoints under `http://localhost:8000/api/v1`:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /me`

Household endpoints are under `/api/v1/households`; invitation acceptance is
`POST /api/v1/invitations/{token}/accept`.

The product catalogue is available under `/api/v1/households/{household_id}/products` and
uses seeded categories from `/api/v1/product-categories`.

Shopping lists are available under `/api/v1/households/{household_id}/shopping-lists`; list items
preserve product identity snapshots when products are later edited.

Active list detail screens use `/api/v1/realtime` for process-local committed-change notifications;
HTTP remains the canonical mutation transport.

Expo push notifications cover substitution requests and approval/rejection outcomes while members
are away. Device registration uses `POST /api/v1/push-tokens`; see
`docs/23-push-notifications.md` for lifecycle, delivery, and deep-link behavior.

Access tokens expire after 15 minutes by default. Opaque refresh credentials expire after 30 days,
are stored hashed by the API, and rotate on every successful refresh. Set a private `JWT_SECRET`
of at least 32 characters; the example development value is rejected in staging and production.

## Local mobile app

```bash
cd apps/mobile
npm install
npm run start
```

For a physical device, set `EXPO_PUBLIC_API_BASE_URL` to the development computer's LAN-accessible API URL rather than `localhost`.

## Local PostgreSQL

The Compose `postgres` service uses local-only credentials and creates separate `appshop`
(development) and `appshop_test` (integration tests) databases on a fresh volume:

```bash
docker compose up -d postgres
docker compose ps
cd backend
uv run alembic upgrade head
ENV=test DATABASE_URL=postgresql+asyncpg://appshop:appshop@localhost:5432/appshop_test \
  MIGRATION_DATABASE_URL=postgresql+psycopg://appshop:appshop@localhost:5432/appshop_test uv run pytest -q
```

Stop PostgreSQL with `docker compose stop postgres` (keeps data). `docker compose down -v`
removes the named volume and all local databases, so use it only for a deliberate clean reset.
Set `POSTGRES_PORT` if local port 5432 is occupied.

## Quality checks

Backend:

```bash
cd backend
uv run ruff check .
uv run mypy app
uv run pytest
```

Mobile:

```bash
cd apps/mobile
npm run lint
npm run typecheck
npm run test
```

## Scope

The application includes durable purchase history, household purchasing memory, and focused push
notifications for substitution decisions. Predictive restocking, AI, and receipt OCR remain out of
scope.

See `docs/11-implementation-plan.md` for the full implementation sequence.
See `docs/14-authentication.md` for the implemented authentication design.
See `docs/23-push-notifications.md` for the Unit 10 push-notification design.
