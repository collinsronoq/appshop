# Unit 0 Validation

## Verified in generation environment

- Python source AST/syntax validation: PASS
- JSON manifest validation: PASS
- Backend baseline tests: PASS (`3 passed`)
- No Unit 1+ business-domain tables or features added

## Not executable in generation environment

External dependency installation timed out, and Docker is unavailable in the runtime. Therefore the following must be run in the target development environment before Unit 0 is considered fully accepted:

```bash
cd backend
uv sync --dev
uv run ruff check .
uv run mypy app
uv run pytest
uv run alembic upgrade head
uv run alembic heads

cd ../apps/mobile
npm install
npx expo install --check
npm run lint
npm run typecheck
npm run test

cd ../..
docker compose config
docker compose up -d postgres api
```

Expected Alembic head:

```text
0001_baseline
```
