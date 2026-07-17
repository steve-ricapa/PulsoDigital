# PulsoDigital - AGENTS.md

## Product Constraints
- This is a preventive wellbeing platform for school psychologists, not a student-facing risk labeling app.
- Do not introduce LLM-based risk detection. Risk logic must stay rule-based or classical ML on structured variables.
- The psychologist is always the decision-maker. Do not automate diagnoses or irreversible decisions.
- Student UI must not show risk labels.
- Anonymous support language must stay as "Quiero contar algo" / "Quiero pedir apoyo", not "denuncia anonima".

## Repo Reality
- Frontend and backend are both runnable from Docker Compose at the repo root: `docker-compose.yml`.
- Backend entrypoint is `backend/app/main.py`.
- API routes are mounted under `settings.API_PREFIX`, currently `/api/v1`.
- Frontend API base URL comes from `import.meta.env.VITE_API_URL` in `frontend/src/lib/api.ts`. If this is wrong, the UI will silently point at the wrong backend.
- The frontend has a demo fallback mode in `frontend/src/lib/api.ts` and `frontend/src/store/authStore.ts`; network failures in demo mode can look like a working app.

## Commands That Matter
- Frontend dev: `cd frontend && npm run dev`
- Frontend build: `cd frontend && npm run build`
- Frontend typecheck: `cd frontend && npm run typecheck`
- Backend dev: `cd backend && uv run uvicorn app.main:app --reload`
- Backend tests: `cd backend && uv run pytest`
- Backend lint: `cd backend && uv run ruff check .`
- Backend typecheck: `cd backend && uv run mypy .`

## Docker / EC2 Gotchas
- On EC2, clone the public repo directly instead of copying the workspace manually:
  `git clone https://github.com/steve-ricapa/PulsoDigital.git`
- `docker-compose.yml` is development-oriented. For EC2, do not assume its defaults are browser-safe.
- The shipped frontend service uses `VITE_API_URL=http://localhost:8000/api/v1`; on EC2 that is wrong for real browsers. Use the EC2 public IP or domain instead.
- `celery-worker` and `flower` currently reference `app.tasks.celery_app`, but that module does not exist. Do not include those services in deployment verification until that code exists.
- For current EC2 deployment, bring up only: `postgres`, `redis`, `backend`, `frontend`.

## Effective SSH Flow For This Repo
- The reliable path was: use AWS Console `EC2 Instance Connect` first, not local SSH.
- Inside EC2, generate a key: `ssh-keygen -t ed25519 -f ~/.ssh/pulso_key -N ""`
- Then authorize it explicitly:
  `cat ~/.ssh/pulso_key.pub >> ~/.ssh/authorized_keys`
- Local SSH will fail with `Permission denied (publickey)` until that `authorized_keys` step is done.
- Working host/user for the current EC2 setup: `ubuntu@34.238.159.1`

## Verification Order
- For frontend-only work: `npm run build` first.
- For backend-only work: `ruff check` -> `mypy` -> `pytest`.
- For Docker deployment work: `docker compose config` before `docker compose up`.

## Testing / Runtime Notes
- Backend tests use async pytest config from `backend/pyproject.toml` and target `backend/tests`.
- The backend depends on PostgreSQL via `asyncpg`; local import checks can fail if dependencies are missing, even before running the app.
- ML inference under `backend/app/ml/` expects `app/ml/config/rf_model.pkl` to exist; config alone is not enough.
