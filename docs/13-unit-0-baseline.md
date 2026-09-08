# Unit 0 — Repository Baseline

## Delivered

- monorepo root conventions;
- Expo SDK 57 mobile shell;
- FastAPI application shell;
- PostgreSQL 16 local service;
- async runtime DB configuration;
- distinct synchronous migration DB configuration;
- Alembic baseline revision `0001_baseline`;
- `/health/live` and `/health/ready`;
- Docker API image;
- backend Ruff, mypy, pytest configuration;
- mobile ESLint, TypeScript, Jest configuration;
- GitHub Actions backend/mobile CI;
- root environment example;
- local development README.

## Intentionally Deferred

No Unit 1+ domain functionality is included:

- users/authentication;
- households;
- products;
- lists;
- trips;
- WebSockets;
- storage adapters;
- notifications.

## Baseline Runtime Contract

- Python: 3.12+
- Node: 22.13+
- Expo: SDK 57
- React Native: 0.86
- PostgreSQL: 16

## Migration Head

```text
0001_baseline
```

The baseline migration intentionally contains no business tables. Unit 1 will add the first domain schema.
