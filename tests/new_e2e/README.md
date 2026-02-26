# New E2E Tests (Docker-only)

Runs HTTP + socket + client-UI/CORS flow checks against the running CAAS stack.

## Run

1. Start stack with scripts only:
   - `./start.ps1`
2. Execute tests in Docker:
   - `docker compose --profile test run --rm e2e-new`
3. Reports are written under:
   - `tests/new_e2e/reports/`
