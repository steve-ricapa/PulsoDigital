# Pulso Digital

Plataforma de inteligencia preventiva para el bienestar y la convivencia escolar.

## Descripción

Pulso Digital es una plataforma diseñada para psicólogos escolares que permite monitorear el bienestar estudiantil mediante check-ins semanales breves, identificar tendencias de riesgo y priorizar intervenciones humanas. **No diagnostica ni etiqueta automáticamente** - el psicólogo es quien interpreta, conversa y decide.

## Características Principales

### Portal del Alumno (PWA)
- Check-in semanal de ~2 minutos con escalas de emojis, sliders y pregunta abierta opcional
- Visualización de su propio historial de bienestar
- Botón voluntario "Quiero conversar con alguien" para solicitar apoyo
- Sin etiquetas de riesgo visibles para el estudiante

### Portal del Psicólogo
- Dashboard general del colegio con métricas agregadas
- Lista priorizada de estudiantes que requieren revisión
- Evolución individual por estudiante con historial de intervenciones
- Gestión de intervenciones y seguimiento
- Alertas de riesgo explicables

### Enfoque de ML (Fase 2)
- MVP: Índice de bienestar basado en reglas (35% emocional + 25% seguridad + 20% pertenencia + 20% tendencia)
- Fase 2: Modelos supervisados (Regresión Logística + Random Forest) entrenados con etiquetas de intervención del psicólogo
- Explicabilidad mediante feature importance / SHAP
- **Nunca**: diagnóstico clínico, predicción de violencia, automatización de decisiones

## Stack Tecnológico

- **Backend**: FastAPI (Python 3.11+) + PostgreSQL + Redis + Celery
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS v4 + React Router
- **ML**: scikit-learn, XGBoost, pandas
- **Despliegue**: Docker + Docker Compose en EC2

## Estructura del Proyecto

```
pulso-digital/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # Endpoints REST
│   │   ├── core/            # Config, DB, seguridad, logging
│   │   ├── models/          # Modelos SQLAlchemy
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── services/        # Lógica de negocio (wellbeing, ML)
│   │   └── main.py          # Entry point
│   ├── ml/                  # Entrenamiento y modelos ML
│   ├── tests/
│   ├── Dockerfile
│   ├── pyproject.toml
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── student/         # PWA alumno (/pulso, /ayuda)
│   │   ├── psychologist/    # Portal psicólogo (/psicologo/*)
│   │   ├── shared/          # Componentes compartidos
│   │   ├── contexts/        # Auth, estado global
│   │   ├── lib/             # API client, utils
│   │   └── pages/           # Login, etc.
│   ├── Dockerfile
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml
└── AGENTS.md
```

## Inicio Rápido

### Prerrequisitos
- Docker y Docker Compose
- Git

### Desarrollo Local

```bash
# Clonar repositorio
git clone <repo-url>
cd pulso-digital

# Levantar toda la stack (backend, frontend, DB, Redis)
docker-compose up --build

# Solo base de datos
docker-compose up -d postgres redis
```

### URLs de Desarrollo
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000/api/v1
- Docs API: http://localhost:8000/api/v1/docs
- Flower (Celery): http://localhost:5555

### Comandos Backend
```bash
cd backend

# Instalar dependencias (usando uv)
uv sync

# Servidor de desarrollo
uv run uvicorn app.main:app --reload

# Tests
uv run pytest

# Linting
uv run ruff check .

# Type checking
uv run mypy .

# Migraciones (Alembic)
uv run alembic upgrade head
uv run alembic revision --autogenerate -m "descripción"
```

### Comandos Frontend
```bash
cd frontend

# Instalar dependencias
npm install

# Desarrollo
npm run dev

# Build producción
npm run build

# Lint
npm run lint

# Type check
npm run typecheck
```

## Variables de Entorno

### Backend (.env)
```env
ENVIRONMENT=development
SECRET_KEY=tu-secret-key-seguro
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/pulso_digital
REDIS_URL=redis://localhost:6379/0
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]
ML_ENABLED=false
ML_MODEL_PATH=ml/models
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:8000/api/v1
```

## Despliegue en EC2

```bash
# En el servidor EC2
git clone <repo-url>
cd pulso-digital

# Configurar variables de entorno de producción
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Editar con valores de producción

# Construir y levantar
docker-compose -f docker-compose.yml up --build -d

# Ver logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

## Seguridad y Privacidad

- Separación lógica de identidad y respuestas
- IDs internos únicamente en dashboards
- Supresión de grupos pequeños (<5) para evitar re-identificación
- Canal anónimo = "Quiero contar algo" / "Quiero pedir apoyo" (NO "denuncia anónima")
- Divulgación de límites de confidencialidad ante riesgo grave (Ley 29719)
- Auditoría completa de accesos a datos sensibles

## Referencias

- [Panorama Education - School Climate Survey](https://www.panoramaed.com/products/surveys/school-climate-survey)
- [BRAVE UP](https://braveup.com/)
- [SíSeVe - MINEDU](https://siseve.minedu.gob.pe/Web/App/Index)
- [ML Applied Sciences 2024](https://www.mdpi.com/2076-3417/14/24/11738)
- [JMIR 2022 - Student Mental Health Prediction](https://www.jmir.org/2022/1/e32736)
- [Ley 29719 / Indecopi - Bullying](https://www.gob.pe/institucion/indecopi/noticias/818966-sepa-como-reportar-casos-de-bullying-en-colegios-privados)

## Licencia

Proyecto privado - Pulso Digital# PulsoDigital
