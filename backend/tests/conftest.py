import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.main import app
from app.core.database import get_db, Base
from app.core.config import settings
from app.core.security import get_password_hash
from app.models import (
    User, School, Student, Classroom, PsychologistProfile,
    Survey, Question, Response, WellbeingScore, RiskLevel,
    SurveyStatus, QuestionType, UserRole, InterventionType,
    SupportRequest, Intervention
)


TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def test_engine():
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def test_db(test_engine):
    async_session = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture(scope="function")
async def client(test_db):
    async def override_get_db():
        yield test_db
    
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_school(test_db):
    school = School(
        name="Colegio Test",
        code="TEST001",
        address="Av. Test 123",
        phone="123456789",
        email="test@colegio.edu",
        director_name="Director Test",
    )
    test_db.add(school)
    await test_db.commit()
    await test_db.refresh(school)
    return school


@pytest_asyncio.fixture
async def test_psychologist_user(test_db, test_school):
    user = User(
        email="psicologo@test.edu",
        hashed_password=get_password_hash("12345678"),
        full_name="Dr. Psicólogo Test",
        role=UserRole.PSYCHOLOGIST,
        school_id=test_school.id,
        is_active=True,
        is_verified=True,
    )
    test_db.add(user)
    await test_db.commit()
    await test_db.refresh(user)
    
    profile = PsychologistProfile(
        user_id=user.id,
        license_number="PSI-001",
        specialization="Psicología Escolar",
        years_experience=5,
    )
    test_db.add(profile)
    await test_db.commit()
    await test_db.refresh(profile)
    
    return user


@pytest_asyncio.fixture
async def test_student_user(test_db, test_school):
    user = User(
        email="estudiante@test.edu",
        hashed_password=get_password_hash("12345678"),
        full_name="Estudiante Test",
        role=UserRole.STUDENT,
        school_id=test_school.id,
        is_active=True,
        is_verified=True,
    )
    test_db.add(user)
    await test_db.commit()
    await test_db.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_classroom(test_db, test_school, test_psychologist_user):
    profile = await test_db.get(PsychologistProfile, test_psychologist_user.psychologist_profile.id)
    classroom = Classroom(
        school_id=test_school.id,
        psychologist_id=profile.id,
        name="1° A",
        grade=1,
        section="A",
        academic_year="2024",
        capacity=30,
    )
    test_db.add(classroom)
    await test_db.commit()
    await test_db.refresh(classroom)
    return classroom


@pytest_asyncio.fixture
async def test_student(test_db, test_school, test_classroom, test_student_user):
    student = Student(
        user_id=test_student_user.id,
        school_id=test_school.id,
        classroom_id=test_classroom.id,
        internal_id="EST001",
        birth_date="2010-01-15",
        gender="F",
    )
    test_db.add(student)
    await test_db.commit()
    await test_db.refresh(student)
    return student


@pytest_asyncio.fixture
async def test_survey(test_db, test_school):
    from datetime import datetime, timedelta
    survey = Survey(
        school_id=test_school.id,
        name="Check-in Semanal",
        description="Encuesta semanal de bienestar",
        status=SurveyStatus.ACTIVE,
        start_date=datetime.utcnow() - timedelta(days=1),
        end_date=datetime.utcnow() + timedelta(days=7),
        frequency_weeks=1,
        is_anonymous=False,
    )
    test_db.add(survey)
    await test_db.commit()
    await test_db.refresh(survey)
    return survey


@pytest_asyncio.fixture
async def test_questions(test_db, test_survey):
    questions = [
        Question(
            survey_id=test_survey.id,
            text="¿Cómo te sentiste esta semana en el colegio?",
            question_type=QuestionType.EMOJI_SCALE,
            order=1,
            category="emotional",
            min_value=1,
            max_value=5,
            is_required=True,
        ),
        Question(
            survey_id=test_survey.id,
            text="¿Qué tan seguro te sentiste en los espacios del colegio?",
            question_type=QuestionType.SLIDER,
            order=2,
            category="safety",
            min_value=0,
            max_value=10,
            is_required=True,
        ),
        Question(
            survey_id=test_survey.id,
            text="¿Qué tan cómodo te sentiste con tus compañeros?",
            question_type=QuestionType.SLIDER,
            order=3,
            category="belonging",
            min_value=0,
            max_value=10,
            is_required=True,
        ),
        Question(
            survey_id=test_survey.id,
            text="¿Qué fue lo mejor y lo más difícil de tu semana?",
            question_type=QuestionType.OPEN_TEXT,
            order=4,
            category="emotional",
            is_required=False,
        ),
    ]
    test_db.add_all(questions)
    await test_db.commit()
    for q in questions:
        await test_db.refresh(q)
    return questions


@pytest_asyncio.fixture
async def auth_headers_psychologist(client: AsyncClient, test_psychologist_user):
    response = await client.post("/api/v1/auth/login", json={
        "email": "psicologo@test.edu",
        "password": "12345678"
    })
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def auth_headers_student(client: AsyncClient, test_student_user):
    response = await client.post("/api/v1/auth/login", json={
        "email": "estudiante@test.edu",
        "password": "12345678"
    })
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}