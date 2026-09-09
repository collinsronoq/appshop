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

Unit 6 adds shopping trips and mobile shopping mode. Trips snapshot list items, track collected
and skipped state, enforce one active trip per list, and synchronize through versioned realtime
events. Receipt capture, purchase history, and analytics remain future units.

See `docs/11-implementation-plan.md` for the full implementation sequence.
See `docs/14-authentication.md` for the implemented authentication design.
