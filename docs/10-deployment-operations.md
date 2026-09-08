# Deployment and Operations

## 1. Environments

At minimum:

- local;
- staging;
- production.

Environment configuration must be explicit and validated at startup.

## 2. Local Development

Recommended Docker Compose services:

```text
api
postgres
```

Mobile runs through Expo development tooling.

Optional later:

```text
redis
minio
```

Do not introduce Redis until the application actually needs multi-instance realtime fan-out.

## 3. Production Components

Recommended:

- containerized FastAPI service;
- managed PostgreSQL;
- S3-compatible object storage;
- HTTPS ingress;
- external monitoring/logging;
- Expo Push service.

## 4. Health Endpoints

Expose:

```text
/health/live
/health/ready
```

Liveness:

- process is alive.

Readiness:

- application can service requests;
- database connectivity succeeds.

## 5. Database Migrations

Alembic migrations should run as a controlled deployment step, not implicitly from every API instance.

## 6. Backups

Production Postgres must have:

- automated backups;
- tested restore procedure;
- documented retention.

Object storage should also have suitable durability/versioning policy where supported.

## 7. Logging

Use structured JSON logs in production.

Include:

- request ID;
- user ID when safe;
- household ID when safe;
- route;
- status;
- duration;
- error classification.

Do not log secrets.

## 8. Metrics

Initial useful metrics:

- API request latency;
- error rate;
- active WebSocket connections;
- WebSocket disconnect rate;
- push notification failures;
- database connection utilization;
- image upload failures.

## 9. Error Tracking

Use a production error tracker capable of grouping backend and mobile exceptions.

## 10. Configuration

Likely backend environment variables:

```text
ENV=
DATABASE_URL=
MIGRATION_DATABASE_URL=
JWT_SECRET=
ACCESS_TOKEN_TTL_MINUTES=
REFRESH_TOKEN_TTL_DAYS=
S3_ENDPOINT_URL=
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_REGION=
EXPO_ACCESS_TOKEN=
ALLOWED_ORIGINS=
LOG_LEVEL=
```

Do not commit real credentials.

## 11. Release Strategy

Use staging before production.

A release should require:

- migration verification;
- automated tests;
- health verification;
- mobile smoke test;
- rollback awareness.

## 12. Future Scaling

Only introduce:

- Redis;
- background workers;
- CDN specialization;
- read replicas;

when measured load justifies them.
