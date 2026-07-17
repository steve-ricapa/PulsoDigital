from __future__ import annotations

import asyncio
from datetime import datetime, timedelta
from random import Random
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.security import get_password_hash
from app.models import (
    Classroom,
    Intervention,
    InterventionType,
    PsychologistProfile,
    Question,
    QuestionType,
    Response,
    RiskLevel,
    School,
    Student,
    SupportRequest,
    SupportRequestType,
    Survey,
    SurveyStatus,
    User,
    UserRole,
    WellbeingScore,
)
from app.services.wellbeing import create_or_update_risk_prediction


PASSWORD = "12345678"
SCHOOL_CODE = "PULSO1"


def score_to_risk(score: float) -> RiskLevel:
    if score <= 0.3:
        return RiskLevel.CRITICAL
    if score <= 0.5:
        return RiskLevel.HIGH
    if score <= 0.7:
        return RiskLevel.MODERATE
    return RiskLevel.LOW


async def seed() -> None:
    engine = create_async_engine(settings.DATABASE_URL, pool_pre_ping=True)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as db:
        existing = await db.execute(select(School).where(School.code == SCHOOL_CODE))
        if existing.scalar_one_or_none():
            print("Seed already exists. School code PULSO1 found.")
            return

        school = School(
            id=uuid4(),
            name="Colegio Pulso Demo",
            code=SCHOOL_CODE,
            address="Av. Bienestar 123, Lima",
            phone="999888777",
            email="contacto@colegio.edu",
            director_name="Mariana Paredes",
            is_active=True,
        )
        db.add(school)

        psych_user = User(
            id=uuid4(),
            school_id=school.id,
            email="psicologo@colegio.edu",
            hashed_password=get_password_hash(PASSWORD),
            full_name="Dr. Carlos Mendoza",
            role=UserRole.PSYCHOLOGIST,
            is_active=True,
            is_verified=True,
        )
        school_admin = User(
            id=uuid4(),
            school_id=school.id,
            email="admin@colegio.edu",
            hashed_password=get_password_hash(PASSWORD),
            full_name="Lic. Ana Torres",
            role=UserRole.SCHOOL_ADMIN,
            is_active=True,
            is_verified=True,
        )
        sys_admin = User(
            id=uuid4(),
            school_id=None,
            email="superadmin@pulsodigital.edu",
            hashed_password=get_password_hash(PASSWORD),
            full_name="Ing. Roberto Diaz",
            role=UserRole.ADMIN,
            is_active=True,
            is_verified=True,
        )
        student_login_user = User(
            id=uuid4(),
            school_id=school.id,
            email="estudiante@colegio.edu",
            hashed_password=get_password_hash(PASSWORD),
            full_name="Maria Garcia Lopez",
            role=UserRole.STUDENT,
            is_active=True,
            is_verified=True,
        )
        db.add_all([psych_user, school_admin, sys_admin, student_login_user])
        await db.flush()

        psych_profile = PsychologistProfile(
            id=uuid4(),
            user_id=psych_user.id,
            license_number="PSI-2026-001",
            specialization="Psicologia escolar",
            years_experience=8,
            is_active=True,
        )
        db.add(psych_profile)
        await db.flush()

        classrooms = [
            Classroom(id=uuid4(), school_id=school.id, psychologist_id=psych_profile.id, name="1ro A", grade=1, section="A", academic_year="2026", capacity=30, is_active=True),
            Classroom(id=uuid4(), school_id=school.id, psychologist_id=psych_profile.id, name="2do B", grade=2, section="B", academic_year="2026", capacity=30, is_active=True),
            Classroom(id=uuid4(), school_id=school.id, psychologist_id=psych_profile.id, name="3ro A", grade=3, section="A", academic_year="2026", capacity=30, is_active=True),
        ]
        db.add_all(classrooms)
        await db.flush()

        names = [
            "Maria Garcia Lopez", "Jose Quispe Ramos", "Camila Torres Vega", "Luis Huaman Soto", "Valeria Rojas Diaz",
            "Diego Fernandez Perez", "Lucia Chavez Leon", "Mateo Salazar Ruiz", "Ariana Mendoza Cruz", "Sebastian Flores Castro",
            "Daniela Paredes Silva", "Thiago Romero Luna", "Andrea Navarro Gil", "Fabio Acosta Rey", "Renata Cabrera Moya",
            "Ximena Vilca Torres", "Alonso Medina Rios", "Mia Valdez Soria", "Bruno Palomino Lara", "Emma Cardenas Roca",
            "Piero Gutierrez Ponce", "Sofia Aliaga Ramos", "Nicolas Espinoza Paz", "Luciana Bernal Soto", "Adrian Cueva Mora",
        ]
        rng = Random(42)
        students: list[Student] = []
        student_user_consumed = False
        for index, full_name in enumerate(names, start=1):
            classroom = classrooms[(index - 1) % len(classrooms)]
            student = Student(
                id=uuid4(),
                user_id=student_login_user.id if not student_user_consumed else None,
                school_id=school.id,
                classroom_id=classroom.id,
                internal_id=f"EST-2026-{index:03d}",
                birth_date=datetime(2011, rng.randint(1, 12), rng.randint(1, 28)),
                gender="F" if index % 2 else "M",
                is_active=True,
            )
            if not student_user_consumed:
                student_user_consumed = True
            students.append(student)
        db.add_all(students)
        await db.flush()

        profiles = {
            students[0].id: [0.78, 0.80, 0.77, 0.81, 0.79, 0.83, 0.82, 0.84],
            students[1].id: [0.68, 0.63, 0.59, 0.55, 0.50, 0.45, 0.39, 0.34],
            students[2].id: [0.62, 0.60, 0.58, 0.55, 0.53, 0.49, 0.44, 0.41],
            students[3].id: [0.81, 0.79, 0.76, 0.72, 0.66, 0.60, 0.52, 0.28],
            students[4].id: [0.74, 0.73, 0.71, 0.70, 0.69, 0.68, 0.66, 0.64],
        }

        surveys: list[Survey] = []
        questions_by_survey: dict[str, list[Question]] = {}
        for week_index in range(8):
            start_date = datetime.utcnow() - timedelta(weeks=7 - week_index, days=2)
            end_date = start_date + timedelta(days=6)
            survey = Survey(
                id=uuid4(),
                school_id=school.id,
                name=f"Check-in Semanal - Semana {week_index + 1}",
                description="Encuesta semanal de bienestar",
                status=SurveyStatus.ACTIVE if week_index == 7 else SurveyStatus.COMPLETED,
                start_date=start_date,
                end_date=end_date,
                frequency_weeks=1,
                is_anonymous=False,
            )
            surveys.append(survey)
            db.add(survey)
            await db.flush()

            questions = [
                Question(id=uuid4(), survey_id=survey.id, text="Como te sentiste esta semana?", question_type=QuestionType.EMOJI_SCALE, order=1, category="emotional", min_value=1, max_value=5, is_required=True, is_active=True),
                Question(id=uuid4(), survey_id=survey.id, text="Te sentiste seguro en el colegio?", question_type=QuestionType.EMOJI_SCALE, order=2, category="safety", min_value=1, max_value=5, is_required=True, is_active=True),
                Question(id=uuid4(), survey_id=survey.id, text="Sentiste que perteneces a tu aula?", question_type=QuestionType.EMOJI_SCALE, order=3, category="belonging", min_value=1, max_value=5, is_required=True, is_active=True),
                Question(id=uuid4(), survey_id=survey.id, text="Como estuvo tu energia?", question_type=QuestionType.SLIDER, order=4, category="emotional", min_value=1, max_value=10, is_required=True, is_active=True),
                Question(id=uuid4(), survey_id=survey.id, text="Hay algo mas que quieras contar?", question_type=QuestionType.OPEN_TEXT, order=5, category="general", is_required=False, is_active=True),
            ]
            db.add_all(questions)
            questions_by_survey[str(survey.id)] = questions

        await db.flush()

        for student_index, student in enumerate(students):
            base_series = profiles.get(student.id)
            if base_series is None:
                anchor = 0.82 - (student_index % 6) * 0.07
                base_series = []
                current = anchor
                for _ in range(8):
                    current = max(0.22, min(0.9, current + rng.uniform(-0.05, 0.04)))
                    base_series.append(round(current, 3))

            for week_index, survey in enumerate(surveys):
                overall = base_series[week_index]
                emotional = max(0.15, min(0.95, overall + rng.uniform(-0.06, 0.05)))
                safety = max(0.15, min(0.95, overall + rng.uniform(-0.05, 0.05)))
                belonging = max(0.15, min(0.95, overall + rng.uniform(-0.05, 0.05)))
                trend = 0.5 if week_index < 2 else max(0.15, min(0.9, overall + rng.uniform(-0.08, 0.08)))

                q1, q2, q3, q4, q5 = questions_by_survey[str(survey.id)]
                db.add_all([
                    Response(id=uuid4(), survey_id=survey.id, question_id=q1.id, student_id=student.id, value_numeric=max(1, min(5, round(emotional * 5))), responded_at=survey.end_date - timedelta(hours=4)),
                    Response(id=uuid4(), survey_id=survey.id, question_id=q2.id, student_id=student.id, value_numeric=max(1, min(5, round(safety * 5))), responded_at=survey.end_date - timedelta(hours=4)),
                    Response(id=uuid4(), survey_id=survey.id, question_id=q3.id, student_id=student.id, value_numeric=max(1, min(5, round(belonging * 5))), responded_at=survey.end_date - timedelta(hours=4)),
                    Response(id=uuid4(), survey_id=survey.id, question_id=q4.id, student_id=student.id, value_numeric=max(1, min(10, round(overall * 10))), responded_at=survey.end_date - timedelta(hours=4)),
                    Response(id=uuid4(), survey_id=survey.id, question_id=q5.id, student_id=student.id, value_text="", responded_at=survey.end_date - timedelta(hours=4)),
                ])

                wellbeing = WellbeingScore(
                    id=uuid4(),
                    student_id=student.id,
                    survey_id=survey.id,
                    emotional_score=round(emotional, 3),
                    safety_score=round(safety, 3),
                    belonging_score=round(belonging, 3),
                    trend_score=round(trend, 3),
                    overall_score=round(overall, 3),
                    risk_level=score_to_risk(overall),
                    calculated_at=survey.end_date - timedelta(hours=2),
                )
                db.add(wellbeing)
                await db.flush()
                await create_or_update_risk_prediction(db, student.id, survey.id, wellbeing)

        support_targets = students[1:5]
        for idx, student in enumerate(support_targets):
            db.add(
                SupportRequest(
                    id=uuid4(),
                    student_id=student.id,
                    request_type=SupportRequestType.I_WANT_HELP if idx % 2 == 0 else SupportRequestType.I_WANT_TO_TALK,
                    message="Necesito conversar con orientacion" if idx % 2 == 0 else "No me he sentido bien esta semana",
                    is_anonymous=idx == 3,
                    status="pending" if idx < 3 else "resolved",
                    assigned_psychologist_id=psych_profile.id,
                )
            )

        for idx, student in enumerate(students[1:4]):
            db.add(
                Intervention(
                    id=uuid4(),
                    student_id=student.id,
                    psychologist_id=psych_profile.id,
                    intervention_type=InterventionType.CONVERSATION if idx < 2 else InterventionType.FOLLOW_UP,
                    description="Seguimiento preventivo por descenso sostenido del bienestar",
                    follow_up_date=datetime.utcnow() + timedelta(days=idx + 1),
                    is_completed=False,
                )
            )

        await db.commit()

        print("Seed complete.")
        print("Psychologist login: psicologo@colegio.edu / 12345678")
        print("Student login: estudiante@colegio.edu / 12345678")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
