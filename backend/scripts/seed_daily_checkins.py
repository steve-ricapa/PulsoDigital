from __future__ import annotations

import asyncio
from datetime import datetime, timedelta
from random import Random
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.models import DailyCheckin, Student


async def seed_daily_checkins() -> None:
    engine = create_async_engine(settings.DATABASE_URL, pool_pre_ping=True)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as db:
        result = await db.execute(select(Student).where(Student.internal_id == "EST-2026-001"))
        student = result.scalar_one_or_none()
        if not student:
            print("Student EST-2026-001 not found. Run seed.py first.")
            await engine.dispose()
            return

        existing = await db.execute(
            select(DailyCheckin).where(DailyCheckin.student_id == student.id).limit(1)
        )
        if existing.scalar_one_or_none():
            print("Daily checkins already seeded.")
            await engine.dispose()
            return

        today = datetime.utcnow().date()
        rng = Random(42)
        messages = [
            "Hoy fue un buen dia",
            "Me senti tranquila",
            "Estuve un poco cansada",
            "Jugaba con mis amigas",
            "La clase de matematicas estuvo dificil",
            None,
            "Hoy aprendi algo nuevo",
        ]

        count = 0
        for days_ago in range(21):
            d = today - timedelta(days=days_ago)
            if d.weekday() >= 5:
                continue
            if rng.random() < 0.25:
                continue
            db.add(
                DailyCheckin(
                    id=uuid4(),
                    student_id=student.id,
                    checkin_date=d,
                    mood=rng.randint(3, 5),
                    sleep=rng.randint(2, 3),
                    energy=rng.randint(5, 9),
                    message=rng.choice(messages),
                )
            )
            count += 1

        await db.commit()
        print(f"Seeded {count} daily checkins for student EST-2026-001.")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed_daily_checkins())
