# PulsoDigital - AGENTS.md

## Project Overview
**Product**: Plataforma de inteligencia preventiva para el bienestar y la convivencia escolar  
**Target**: School psychologists (not students directly)  
**Core concept**: Weekly student check-ins → trend analysis → prioritized psychologist review → human intervention decisions

## Tech Stack
- **Backend**: FastAPI (Python)
- **Frontend**: React + TypeScript + Vite + Tailwind CSS v4
- **ML**: scikit-learn (LogisticRegression, RandomForest, XGBoost, IsolationForest)
- **Database**: PostgreSQL
- **Deployment**: Docker containers on EC2
- **Package manager**: uv (recommended) or pip/poetry

## Repo Structure (planned)
```
/pulso-digital
├── /backend          # FastAPI app
│   ├── /app
│   │   ├── /auth
│   │   ├── /students
│   │   ├── /surveys
│   │   ├── /responses
│   │   ├── /wellbeing
│   │   ├── /risk
│   │   ├── /interventions
│   │   ├── /dashboard
│   │   ├── /notifications
│   │   └── /audit
│   ├── /ml           # ML models & training
│   ├── /tests
│   ├── Dockerfile
│   ├── pyproject.toml
│   └── requirements.txt
├── /frontend         # React app
│   ├── /student      # PWA: /pulso, /ayuda
│   ├── /psychologist # /psicologo/*
│   ├── /shared
│   ├── Dockerfile
│   ├── package.json
│   └── vite.config.ts
├── /docker-compose.yml
└── /infra            # EC2 provisioning scripts (optional)
```

## Key Architectural Decisions

### ML Approach (from product spec)
1. **MVP Phase**: Rule-based wellbeing index (no ML)
   - 35% emotional state + 25% safety + 20% belonging + 20% historical trend
   - Trend rules: sustained decline → "review recommended"
   - Sudden change detection → "priority attention"
2. **Phase 2**: Supervised ML with psychologist-labeled interventions
   - Labels: required_intervention / no_intervention / confirmed_case / false_alert / successful_followup
   - Base: LogisticRegression (explainable) + RandomForest (non-linear)
   - Evaluation: precision, recall, F1, confusion matrix
   - Explainability: feature importance / SHAP
3. **Never**: diagnose depression/anxiety/bullying, predict violence, automate decisions

### Data Privacy
- Student responses logically separated from identity
- Internal IDs only in dashboards
- Small-group aggregation suppressed (prevents re-identification)
- Anonymous channel = "Quiero contar algo" / "Quiero pedir apoyo" — NOT "denuncia anónima"
- Confidentiality limits disclosed when serious risk detected (Ley 29719)

### API Endpoints (planned)
```
POST   /auth/login
GET    /surveys/current
POST   /surveys/{survey_id}/responses
POST   /support-requests
GET    /psychologist/dashboard
GET    /psychologist/students/{id}/trend
POST   /psychologist/interventions
GET    /psychologist/alerts
```

### Database Tables (planned)
`schools`, `users`, `students`, `classrooms`, `surveys`, `questions`, `responses`, `wellbeing_scores`, `risk_predictions`, `support_requests`, `interventions`, `audit_logs`

## Developer Commands

### Backend
```bash
cd backend
uv sync                    # install deps (or pip install -r requirements.txt)
uv run uvicorn app.main:app --reload  # dev server
uv run pytest              # run tests
uv run ruff check .        # lint
uv run mypy .              # typecheck
```

### Frontend
```bash
cd frontend
npm install                # or pnpm/yarn
npm run dev                # Vite dev server
npm run build              # production build
npm run lint               # ESLint
npm run typecheck          # tsc --noEmit
```

### Docker
```bash
docker-compose up --build  # full stack
docker-compose up -d db    # just PostgreSQL
```

## Important Constraints
- **No LLM for risk detection** — classical ML only on structured survey variables
- **Psychologist is decision-maker** — system only prioritizes/recommends
- **No student-facing risk labels** — student sees only wellbeing tracking + optional "talk to someone"
- **Weekly check-in ≤ 2 min** — emoji scales, sliders, 1 optional open question
- **Anonymous channel has legal limits** — must disclose when safety at risk

## Testing Priorities
1. Wellbeing index calculation correctness
2. Trend detection rules (sustained decline, sudden drops)
3. Psychologist dashboard aggregation (no small-group leaks)
4. ML model training pipeline (Phase 2)
5. Authentication/authorization boundaries

## References
- Product spec: [Panorama Education](https://www.panoramaed.com/products/surveys/school-climate-survey), [BRAVE UP](https://braveup.com/), [SíSeVe](https://siseve.minedu.gob.pe/Web/App/Index)
- ML research: [MDPI Applied Sciences 2024](https://www.mdpi.com/2076-3417/14/24/11738), [JMIR 2022](https://www.jmir.org/2022/1/e32736)
- Legal: [Ley 29719 / Indecopi](https://www.gob.pe/institucion/indecopi/noticias/818966-sepa-como-reportar-casos-de-bullying-en-colegios-privados)